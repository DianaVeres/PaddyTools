from __future__ import annotations

import base64
import html
import io
import json
import os
import re
import secrets
import sqlite3
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

from fastapi import FastAPI, Header, HTTPException, Request
from fastapi.responses import HTMLResponse, JSONResponse, Response
from pydantic import BaseModel, Field

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = Path(os.getenv("DATA_DIR", "/data" if Path("/data").exists() else BASE_DIR / "data"))
DB_PATH = Path(os.getenv("INCIDENCIAS_DB", DATA_DIR / "incidencias.db"))
ORIGINAL_HTML = (BASE_DIR / "original.html").read_text(encoding="utf-8")
PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "").rstrip("/")
HANDOFF_SECRET = os.getenv("PADDY_HANDOFF_SECRET", "")

WC_BASE_URL = os.getenv("PADDY_WC_BASE_URL", "").rstrip("/")
WC_CONSUMER_KEY = os.getenv("PADDY_WC_CONSUMER_KEY", "")
WC_CONSUMER_SECRET = os.getenv("PADDY_WC_CONSUMER_SECRET", "")
SYNC_URL = os.getenv("PADDY_SYNC_URL", "").rstrip("/")
SYNC_TOKEN = os.getenv("PADDY_SYNC_TOKEN", "")


def now_iso() -> str:
    return datetime.now().isoformat(timespec="seconds")


def today_iso() -> str:
    return datetime.now().date().isoformat()


def ensure_local_db() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    con = sqlite3.connect(DB_PATH)
    try:
        con.execute(
            """
            CREATE TABLE IF NOT EXISTS incidents (
                order_number TEXT PRIMARY KEY,
                order_id INTEGER,
                customer_name TEXT,
                customer_email TEXT,
                customer_phone TEXT,
                order_date TEXT,
                order_status TEXT,
                order_total TEXT,
                shipping_address TEXT,
                billing_address TEXT,
                products_json TEXT,
                incident_text TEXT NOT NULL,
                incident_date TEXT,
                pickup_school INTEGER NOT NULL DEFAULT 0,
                pickup_school_name TEXT,
                pickup_details TEXT,
                pickup_received INTEGER NOT NULL DEFAULT 0,
                pickup_received_at TEXT,
                solved INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                solved_at TEXT,
                incident_school_name TEXT,
                recurrence_count INTEGER NOT NULL DEFAULT 0,
                recurrence_history TEXT,
                is_recurrence INTEGER NOT NULL DEFAULT 0
            )
            """
        )
        cols = {r[1] for r in con.execute("PRAGMA table_info(incidents)")}
        migrations = {
            "pickup_school": "ALTER TABLE incidents ADD COLUMN pickup_school INTEGER NOT NULL DEFAULT 0",
            "pickup_details": "ALTER TABLE incidents ADD COLUMN pickup_details TEXT",
            "incident_date": "ALTER TABLE incidents ADD COLUMN incident_date TEXT",
            "pickup_school_name": "ALTER TABLE incidents ADD COLUMN pickup_school_name TEXT",
            "pickup_received": "ALTER TABLE incidents ADD COLUMN pickup_received INTEGER NOT NULL DEFAULT 0",
            "pickup_received_at": "ALTER TABLE incidents ADD COLUMN pickup_received_at TEXT",
            "incident_school_name": "ALTER TABLE incidents ADD COLUMN incident_school_name TEXT",
            "recurrence_count": "ALTER TABLE incidents ADD COLUMN recurrence_count INTEGER NOT NULL DEFAULT 0",
            "recurrence_history": "ALTER TABLE incidents ADD COLUMN recurrence_history TEXT",
            "is_recurrence": "ALTER TABLE incidents ADD COLUMN is_recurrence INTEGER NOT NULL DEFAULT 0",
        }
        for col, sql in migrations.items():
            if col not in cols:
                con.execute(sql)
        con.execute(
            """
            CREATE TABLE IF NOT EXISTS handoffs (
                token TEXT PRIMARY KEY,
                source_type TEXT NOT NULL,
                source_ref TEXT NOT NULL,
                payload_json TEXT NOT NULL,
                created_at TEXT NOT NULL,
                expires_at TEXT NOT NULL
            )
            """
        )
        con.commit()
    finally:
        con.close()


ensure_local_db()


def rowdict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    return dict(row) if row is not None else None


class IncidentStore:
    def __init__(self) -> None:
        self.path = DB_PATH

    def conn(self) -> sqlite3.Connection:
        con = sqlite3.connect(self.path)
        con.row_factory = sqlite3.Row
        return con

    def get(self, order_number: str) -> dict[str, Any] | None:
        with self.conn() as con:
            return rowdict(con.execute("SELECT * FROM incidents WHERE order_number = ?", (order_number,)).fetchone())

    def all(self, query: str = "") -> list[dict[str, Any]]:
        term = query.strip()
        with self.conn() as con:
            if term:
                q = f"%{term}%"
                rows = con.execute(
                    """SELECT * FROM incidents
                       WHERE order_number LIKE ? OR customer_name LIKE ? OR incident_text LIKE ?
                       ORDER BY updated_at DESC""",
                    (q, q, q),
                ).fetchall()
            else:
                rows = con.execute("SELECT * FROM incidents ORDER BY updated_at DESC").fetchall()
        return [dict(x) for x in rows]

    def save(self, record: dict[str, Any]) -> dict[str, Any]:
        now = now_iso()
        order_number = str(record.get("order_number") or "").strip()
        if not order_number:
            raise ValueError("Falta el número de pedido.")
        old = self.get(order_number)
        history: list[dict[str, Any]] = []
        if old:
            try:
                history = json.loads(old.get("recurrence_history") or "[]")
            except Exception:
                history = []
        recurrence_count = int((old or {}).get("recurrence_count") or 0)
        # Igual que el original: la reincidencia se marca explícitamente y conserva historial.
        if record.get("is_recurrence"):
            recurrence_count += 1
            if old:
                history.append({
                    "incident_text": old.get("incident_text") or "",
                    "incident_date": old.get("incident_date") or "",
                    "solved_at": old.get("solved_at") or "",
                })
        created = (old or {}).get("created_at") or record.get("created_at") or now
        solved = 1 if record.get("solved") else 0
        solved_at = now if solved else None
        if old and solved and old.get("solved") and old.get("solved_at"):
            solved_at = old.get("solved_at")
        fields = (
            "order_number", "order_id", "customer_name", "customer_email", "customer_phone",
            "order_date", "order_status", "order_total", "shipping_address", "billing_address",
            "products_json", "incident_text", "incident_date", "pickup_school", "pickup_school_name",
            "pickup_details", "pickup_received", "pickup_received_at", "solved", "created_at",
            "updated_at", "solved_at", "incident_school_name", "recurrence_count",
            "recurrence_history", "is_recurrence",
        )
        data = dict(record)
        data.update({
            "order_number": order_number,
            "incident_text": str(record.get("incident_text") or ""),
            "incident_date": record.get("incident_date") or today_iso(),
            "pickup_school": 1 if record.get("pickup_school") else 0,
            "pickup_received": 1 if record.get("pickup_received") else 0,
            "solved": solved,
            "created_at": created,
            "updated_at": now,
            "solved_at": solved_at,
            "recurrence_count": recurrence_count,
            "recurrence_history": json.dumps(history, ensure_ascii=False),
            "is_recurrence": 1 if record.get("is_recurrence") else 0,
        })
        placeholders = ",".join("?" for _ in fields)
        updates = ",".join(f"{k}=excluded.{k}" for k in fields[1:])
        with self.conn() as con:
            con.execute(
                f"INSERT INTO incidents ({','.join(fields)}) VALUES ({placeholders}) "
                f"ON CONFLICT(order_number) DO UPDATE SET {updates}",
                [data.get(k) for k in fields],
            )
            con.commit()
        return self.get(order_number) or data

    def pickups(self) -> list[dict[str, Any]]:
        with self.conn() as con:
            rows = con.execute(
                """SELECT order_number, customer_name, incident_date, pickup_school_name,
                          pickup_details, pickup_received, pickup_received_at
                   FROM incidents WHERE pickup_school = 1
                   ORDER BY pickup_received ASC, pickup_school_name COLLATE NOCASE, incident_date"""
            ).fetchall()
        return [dict(x) for x in rows]

    def set_pickup_received(self, order_number: str, received: bool) -> dict[str, Any] | None:
        now = now_iso()
        with self.conn() as con:
            con.execute(
                "UPDATE incidents SET pickup_received=?, pickup_received_at=?, updated_at=? "
                "WHERE order_number=? AND pickup_school=1",
                (1 if received else 0, now if received else "", now, order_number),
            )
            con.commit()
        return self.get(order_number)

    def metrics(self, date_from: str = "", date_to: str = "") -> dict[str, Any]:
        rows = self.all("")
        def dval(r: dict[str, Any]) -> str:
            return str(r.get("incident_date") or r.get("created_at") or "")[:10]
        if date_from:
            rows = [r for r in rows if dval(r) >= date_from]
        if date_to:
            rows = [r for r in rows if dval(r) <= date_to]
        total = len(rows)
        solved = sum(1 for r in rows if r.get("solved"))
        pickup = sum(1 for r in rows if r.get("pickup_school"))
        schools: dict[str, int] = {}
        products: dict[str, int] = {}
        months: dict[str, int] = {}
        years: dict[str, int] = {}
        amount = 0.0
        resolution_days: list[float] = []
        recurrent: list[dict[str, Any]] = []
        for r in rows:
            school = r.get("incident_school_name") or r.get("pickup_school_name") or "Sin colegio indicado"
            schools[school] = schools.get(school, 0) + 1
            ds = dval(r)
            month = ds[:7] if len(ds) >= 7 else "Sin fecha"
            year = ds[:4] if len(ds) >= 4 else "Sin fecha"
            months[month] = months.get(month, 0) + 1
            years[year] = years.get(year, 0) + 1
            try:
                items = json.loads(r.get("products_json") or "[]")
            except Exception:
                items = []
            for item in items:
                name = item.get("name") or "Artículo sin nombre"
                products[name] = products.get(name, 0) + 1
                try:
                    amount += float(str(item.get("line_total") or "0").replace(",", "."))
                except Exception:
                    pass
            if r.get("solved_at") and r.get("incident_date"):
                try:
                    a = datetime.fromisoformat(str(r["incident_date"]).replace("Z", "+00:00"))
                    b = datetime.fromisoformat(str(r["solved_at"]).replace("Z", "+00:00"))
                    resolution_days.append(max(0.0, (b - a).total_seconds() / 86400))
                except Exception:
                    pass
            rc = int(r.get("recurrence_count") or 0)
            if r.get("is_recurrence") or rc:
                recurrent.append({
                    "order_number": r.get("order_number"), "customer_name": r.get("customer_name"),
                    "school": school, "recurrence_count": max(1, rc), "last_date": dval(r),
                })
        recurrent.sort(key=lambda r: (-int(r["recurrence_count"]), str(r["order_number"])))
        tobars = lambda d: [{"label": k, "value": v} for k, v in sorted(d.items(), key=lambda x: (-x[1], x[0]))]
        return {
            "total": total, "solved": solved, "pending": total - solved, "pickup": pickup,
            "affected_amount": round(amount, 2),
            "average_resolution_days": round(sum(resolution_days) / len(resolution_days), 2) if resolution_days else 0,
            "months": tobars(months), "years": tobars(years), "products": tobars(products)[:15],
            "schools": tobars(schools), "recurrent_total": len(recurrent), "recurrent": recurrent,
        }


class CloudIncidentStore:
    """Google Sheets central como fuente, con copia local de seguridad."""
    def __init__(self, url: str, token: str):
        self.url = url.rstrip("/")
        self.token = token
        self.local = IncidentStore()
        try:
            self._migrate_missing_local_records()
        except Exception:
            pass

    def _get(self, action: str, **params: Any) -> dict[str, Any]:
        query = urllib.parse.urlencode({"action": action, "token": self.token, **params})
        url = self.url + ("&" if "?" in self.url else "?") + query
        last: Exception | None = None
        for attempt in range(3):
            try:
                with urllib.request.urlopen(url, timeout=45) as response:
                    data = json.loads(response.read().decode("utf-8"))
                if isinstance(data, dict) and data.get("ok") is False:
                    raise RuntimeError(data.get("error") or "Error del registro compartido")
                return data
            except urllib.error.HTTPError as exc:
                last = exc
                if exc.code >= 500 and attempt < 2:
                    import time; time.sleep(1 + attempt)
                    continue
                raise RuntimeError(f"No se pudo conectar con el registro compartido de Google: HTTP {exc.code}") from exc
            except Exception as exc:
                last = exc
                if attempt < 2:
                    import time; time.sleep(1 + attempt)
                    continue
        raise RuntimeError(f"No se pudo conectar con el registro compartido de Google: {last}")

    def _post(self, action: str, **payload: Any) -> dict[str, Any]:
        body = json.dumps({"action": action, "token": self.token, **payload}, ensure_ascii=False).encode("utf-8")
        req = urllib.request.Request(self.url, data=body, headers={"Content-Type": "application/json"}, method="POST")
        last: Exception | None = None
        for attempt in range(3):
            try:
                with urllib.request.urlopen(req, timeout=45) as response:
                    data = json.loads(response.read().decode("utf-8"))
                if isinstance(data, dict) and data.get("ok") is False:
                    raise RuntimeError(data.get("error") or "Error al guardar en Google")
                return data
            except urllib.error.HTTPError as exc:
                last = exc
                if exc.code >= 500 and attempt < 2:
                    import time; time.sleep(1 + attempt)
                    continue
                raise RuntimeError(f"No se pudo guardar en el registro compartido de Google: HTTP {exc.code}") from exc
            except Exception as exc:
                last = exc
                if attempt < 2:
                    import time; time.sleep(1 + attempt)
                    continue
        raise RuntimeError(f"No se pudo guardar en el registro compartido de Google: {last}")

    def _migrate_missing_local_records(self) -> None:
        cloud_rows = self._get("list").get("rows", [])
        cloud_ids = {str(row.get("order_number") or "") for row in cloud_rows}
        for row in self.local.all(""):
            if str(row.get("order_number") or "") not in cloud_ids:
                self._post("save", record=dict(row))

    def get(self, order_number: str) -> dict[str, Any] | None:
        row = self._get("get", order_number=order_number).get("row")
        return row

    def all(self, query: str = "") -> list[dict[str, Any]]:
        rows = self._get("list").get("rows", [])
        term = query.strip().casefold()
        if not term:
            return rows
        return [r for r in rows if term in " ".join(str(r.get(k, "")) for k in r).casefold()]

    def save(self, record: dict[str, Any]) -> dict[str, Any]:
        data = self._post("save", record=record)
        saved = data.get("row") or record
        try:
            self.local.save(saved)
        except Exception:
            pass
        return saved

    def pickups(self) -> list[dict[str, Any]]:
        return self._get("pickups").get("rows", [])

    def set_pickup_received(self, order_number: str, received: bool) -> dict[str, Any] | None:
        data = self._post("pickup_received", order_number=order_number, received=bool(received))
        row = data.get("row")
        if row:
            try: self.local.save(row)
            except Exception: pass
        return row

    def metrics(self, date_from: str = "", date_to: str = "") -> dict[str, Any]:
        data = self._get("metrics", date_from=date_from, date_to=date_to)
        return data.get("metrics", data)

    def store_incidents(self) -> list[dict[str, Any]]:
        return self._get("store_list").get("rows", [])

    def get_store_incident(self, ticket_number: str) -> dict[str, Any] | None:
        return self._get("store_get", ticket_number=ticket_number).get("row")

    def save_store_incident(self, record: dict[str, Any], image_data: str = "", image_mime: str = "") -> dict[str, Any]:
        return self._post("store_save", record=record, image_data=image_data, image_mime=image_mime).get("row")

    def store_ticket_image(self, file_id: str) -> tuple[str, bytes]:
        data = self._get("store_image", file_id=file_id)
        return data.get("mime") or "image/jpeg", base64.b64decode(data.get("data") or "")

    def set_store_pickup_received(self, ticket_number: str, received: bool) -> dict[str, Any] | None:
        return self._post("store_pickup_received", ticket_number=ticket_number, received=bool(received)).get("row")


class WooCommerce:
    def __init__(self, base: str, key: str, secret: str):
        self.base = base.rstrip("/")
        raw = f"{key}:{secret}".encode()
        self.auth = "Basic " + base64.b64encode(raw).decode()

    def _get(self, endpoint: str, params: dict[str, Any] | None = None) -> Any:
        url = self.base + "/wp-json/wc/v3/" + endpoint.lstrip("/")
        if params:
            url += "?" + urllib.parse.urlencode(params)
        req = urllib.request.Request(url, headers={"Authorization": self.auth, "User-Agent": "PaddyIncidencias/1.0"})
        try:
            with urllib.request.urlopen(req, timeout=25) as response:
                return json.loads(response.read().decode("utf-8", errors="replace"))
        except urllib.error.HTTPError as exc:
            detail = exc.read(250).decode("utf-8", errors="replace")
            raise RuntimeError(f"WooCommerce respondió {exc.code}: {detail}") from exc
        except urllib.error.URLError as exc:
            raise RuntimeError(f"No se pudo conectar con WooCommerce: {exc.reason}") from exc

    def find_order(self, number: str) -> dict[str, Any]:
        number = number.strip().lstrip("#")
        if not number:
            raise ValueError("Escribe un número de pedido.")
        if number.isdigit():
            try:
                order = self._get("orders/" + number)
                if isinstance(order, dict) and order.get("id"):
                    return order
            except RuntimeError as exc:
                if "respondió 404" not in str(exc):
                    raise
        matches = self._get("orders", {"search": number, "per_page": 20})
        for order in matches if isinstance(matches, list) else []:
            if str(order.get("number")) == number or str(order.get("id")) == number:
                return order
        raise LookupError(f"No se ha encontrado el pedido {number}.")

    def schools(self) -> list[str]:
        roots = self._get("products/categories", {"search": "TODAS", "per_page": 100})
        root = next((x for x in roots if str(x.get("name", "")).strip().upper() == "TODAS"), None)
        if not root:
            raise LookupError("No se encontró la categoría principal TODAS en WooCommerce.")
        categories = self._get("products/categories", {"parent": root.get("id"), "per_page": 100, "hide_empty": "true"})
        excluded = ("BASICOS", "BÁSICOS", "VARIOS", "ACC. PELO", "ACCESORIOS")
        names = []
        for category in categories:
            name = str(category.get("name", "")).strip()
            if name and not any(name.upper().startswith(x) for x in excluded):
                names.append(name)
        return sorted(set(names), key=str.casefold)

    def school_products(self, school_name: str) -> list[dict[str, Any]]:
        categories = self._get("products/categories", {"search": school_name, "per_page": 100})
        target = next((x for x in categories if str(x.get("name", "")).strip().casefold() == school_name.strip().casefold()), None)
        if not target:
            target = next((x for x in categories if str(x.get("name", "")).strip().casefold().startswith(school_name.strip().casefold())), None)
        if not target:
            raise LookupError(f"No se encontró el colegio {school_name} en WooCommerce.")
        products: list[dict[str, Any]] = []
        page = 1
        while True:
            batch = self._get("products", {"category": target.get("id"), "status": "publish", "per_page": 100, "page": page})
            if not batch:
                break
            products.extend(batch)
            if len(batch) < 100:
                break
            page += 1
        result = [{"id": p.get("id"), "name": str(p.get("name", "")).strip(), "sku": p.get("sku") or ""} for p in products]
        return sorted(result, key=lambda x: x["name"].casefold())


def joined_name(address: dict[str, Any]) -> str:
    return " ".join(x for x in [address.get("first_name", "").strip(), address.get("last_name", "").strip()] if x)


def address_text(address: dict[str, Any]) -> str:
    lines = [joined_name(address), address.get("company", ""), address.get("address_1", "")]
    a2 = address.get("address_2", "")
    if a2: lines[-1] = (lines[-1] + " " + a2).strip()
    lines.append(" ".join(x for x in [address.get("postcode", ""), address.get("city", "")] if x))
    lines.append(" · ".join(x for x in [address.get("state", ""), address.get("country", "")] if x))
    return "\n".join(str(x).strip() for x in lines if str(x).strip())


def order_to_record(order: dict[str, Any]) -> dict[str, Any]:
    billing = order.get("billing") or {}
    shipping = order.get("shipping") or {}
    customer_name = joined_name(billing) or joined_name(shipping) or "Cliente sin nombre"
    products = []
    for item in order.get("line_items") or []:
        variation_values = []
        for m in item.get("meta_data") or []:
            v = m.get("display_value", m.get("value", ""))
            if isinstance(v, (str, int, float)) and str(v).strip():
                variation_values.append(str(v).strip())
        products.append({
            "name": item.get("name", ""), "quantity": item.get("quantity", 0), "sku": item.get("sku", ""),
            "variation": " · ".join(variation_values), "unit_price": item.get("price", ""),
            "line_total": item.get("total", ""), "currency": order.get("currency", ""),
        })
    created = str(order.get("date_created") or "").replace("T", " ")[:16]
    total = str(order.get("total") or "")
    currency = str(order.get("currency") or "")
    return {
        "order_number": str(order.get("number") or order.get("id") or ""), "order_id": order.get("id"),
        "customer_name": customer_name, "customer_email": billing.get("email", ""), "customer_phone": billing.get("phone", ""),
        "order_date": created, "order_status": order.get("status", ""),
        "order_total": (total + (" " + currency if currency else "")).strip(),
        "shipping_address": address_text(shipping), "billing_address": address_text(billing),
        "products_json": json.dumps(products, ensure_ascii=False), "incident_text": "", "incident_date": today_iso(),
        "pickup_school": 0, "pickup_school_name": "", "pickup_details": "", "pickup_received": 0,
        "pickup_received_at": "", "solved": 0, "solved_at": None, "incident_school_name": "",
        "recurrence_count": 0, "recurrence_history": "[]", "is_recurrence": 0,
    }


LOCAL_STORE = IncidentStore()
STORE: IncidentStore | CloudIncidentStore = CloudIncidentStore(SYNC_URL, SYNC_TOKEN) if SYNC_URL and SYNC_TOKEN else LOCAL_STORE
WOO: WooCommerce | None = WooCommerce(WC_BASE_URL, WC_CONSUMER_KEY, WC_CONSUMER_SECRET) if WC_BASE_URL and WC_CONSUMER_KEY and WC_CONSUMER_SECRET else None


# --- PDF: reproduce las salidas del programa original ---
def create_pdf(record: dict[str, Any]) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
    buf = io.BytesIO()
    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name="PaddyTitle", parent=styles["Title"], textColor=colors.HexColor("#285b43"), alignment=TA_CENTER))
    doc = SimpleDocTemplate(buf, pagesize=A4, rightMargin=42, leftMargin=42, topMargin=40, bottomMargin=40)
    story = [Paragraph("PADDY · INCIDENCIA DE PEDIDO", styles["PaddyTitle"]), Spacer(1, 18)]
    solved = "SOLUCIONADA" if record.get("solved") else "PENDIENTE"
    summary = [
        ["Pedido", "#" + str(record.get("order_number", "")), "Estado incidencia", solved],
        ["Cliente", record.get("customer_name", ""), "Fecha pedido", record.get("order_date", "")],
        ["Fecha incidencia", record.get("incident_date", ""), "Email", record.get("customer_email", "")],
        ["Teléfono", record.get("customer_phone", ""), "Estado pedido", record.get("order_status", "")],
        ["Total", record.get("order_total", ""), "", ""],
    ]
    table = Table(summary, colWidths=[80,175,100,155])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#edf3ef")), ("GRID", (0,0), (-1,-1), .5, colors.HexColor("#b6c0ba")),
        ("FONTNAME", (0,0), (-1,-1), "Helvetica"), ("FONTNAME", (0,0), (0,-1), "Helvetica-Bold"),
        ("FONTNAME", (2,0), (2,-1), "Helvetica-Bold"), ("VALIGN", (0,0), (-1,-1), "TOP"), ("PADDING", (0,0), (-1,-1), 7),
    ]))
    story += [table, Spacer(1,16), Paragraph("Dirección de envío", styles["Heading2"]),
              Paragraph(html.escape(record.get("shipping_address") or "Sin dirección").replace("\n","<br/>"), styles["BodyText"]),
              Spacer(1,14), Paragraph("Productos", styles["Heading2"])]
    try: items = json.loads(record.get("products_json") or "[]")
    except Exception: items=[]
    for item in items:
        extra = " · ".join(x for x in [item.get("sku"), item.get("variation")] if x)
        price = ""
        if item.get("unit_price") not in (None, ""):
            price = f" — {item.get('unit_price')} {item.get('currency','')}/ud."
            if item.get("line_total") not in (None, ""):
                price += f" · Total: {item.get('line_total')} {item.get('currency','')}"
        story.append(Paragraph("• " + html.escape(f"{item.get('quantity','')} × {item.get('name','')}" + ((" · " + extra) if extra else "") + price), styles["BodyText"]))
    story += [Spacer(1,16), Paragraph("Incidencia", styles["Heading2"]), Paragraph(html.escape(record.get("incident_text") or "").replace("\n","<br/>"), styles["BodyText"])]
    if record.get("pickup_school"):
        pickup_status = "RECIBIDO" if record.get("pickup_received") else "PENDIENTE"
        school = record.get("pickup_school_name") or "Colegio sin indicar"
        pickup_text = record.get("pickup_details") or "Pendiente de concretar"
        story += [Spacer(1,10), Paragraph(f"RECOGER EN EL COLE · {html.escape(school)} · {pickup_status}", styles["Heading2"]),
                  Paragraph(html.escape(pickup_text).replace("\n","<br/>"), styles["BodyText"])]
    story += [Spacer(1,30), Paragraph("Firma / observaciones: ______________________________________________", styles["BodyText"])]
    doc.build(story)
    return buf.getvalue()


def create_store_pdf(record: dict[str, Any], ticket_image: bytes | None = None) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.platypus import Image, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
    buf=io.BytesIO(); styles=getSampleStyleSheet()
    styles.add(ParagraphStyle(name="PaddyStoreTitle", parent=styles["Title"], textColor=colors.HexColor("#285b43"), alignment=TA_CENTER))
    doc=SimpleDocTemplate(buf,pagesize=A4,rightMargin=42,leftMargin=42,topMargin=40,bottomMargin=40)
    number=record.get("ticket_number") or record.get("order_number") or "tienda"
    solved="SOLUCIONADA" if record.get("solved") else "PENDIENTE"
    amount=record.get("amount") or record.get("order_total") or "0"
    summary=[["Incidencia / ticket",number,"Estado",solved],["Cliente",record.get("customer_name") or "Sin indicar","Fecha recepción",record.get("incident_date") or ""],["Origen","Tienda","Importe afectado",str(amount)+" €"]]
    table=Table(summary,colWidths=[105,170,95,140]); table.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,0),colors.HexColor("#edf3ef")),("GRID",(0,0),(-1,-1),.5,colors.HexColor("#b6c0ba")),("FONTNAME",(0,0),(-1,-1),"Helvetica"),("FONTNAME",(0,0),(0,-1),"Helvetica-Bold"),("FONTNAME",(2,0),(2,-1),"Helvetica-Bold"),("VALIGN",(0,0),(-1,-1),"TOP"),("PADDING",(0,0),(-1,-1),7)]))
    story=[Paragraph("PADDY · INCIDENCIA DE TIENDA",styles["PaddyStoreTitle"]),Spacer(1,18),table]
    if ticket_image:
        try:
            image=Image(io.BytesIO(ticket_image)); image._restrictSize(500,350); story += [Spacer(1,16),Paragraph("Fotografía del ticket",styles["Heading2"]),image]
        except Exception: pass
    story += [Spacer(1,16),Paragraph("Incidencia",styles["Heading2"]),Paragraph(html.escape(record.get("incident_text") or "").replace("\n","<br/>"),styles["BodyText"])]
    if record.get("pickup_school"):
        status="RECIBIDO" if record.get("pickup_received") else "PENDIENTE"; school=record.get("pickup_school_name") or "Colegio sin indicar"; detail=record.get("pickup_details") or "Pendiente de concretar"
        story += [Spacer(1,10),Paragraph(f"RECOGER EN EL COLE · {html.escape(school)} · {status}",styles["Heading2"]),Paragraph(html.escape(detail).replace("\n","<br/>"),styles["BodyText"])]
    story += [Spacer(1,30),Paragraph("Firma / observaciones: ______________________________________________",styles["BodyText"])]
    doc.build(story); return buf.getvalue()


def create_incident_label(record: dict[str, Any]) -> bytes:
    from reportlab.lib.units import mm
    from reportlab.pdfgen import canvas
    buf=io.BytesIO(); page_width,page_height=150*mm,100*mm; pdf=canvas.Canvas(buf,pagesize=(page_width,page_height))
    raw_date=str(record.get("incident_date") or ""); shown_date=raw_date
    try: shown_date=datetime.strptime(raw_date[:10],"%Y-%m-%d").strftime("%d/%m/%Y")
    except Exception: pass
    school=(record.get("pickup_school_name") or record.get("incident_school_name") or "SIN COLEGIO").upper()
    lines=["INCIDENCIA " + str(record.get("order_number") or record.get("ticket_number") or ""), "NOMBRE: " + str(record.get("customer_name") or "SIN NOMBRE"), "FECHA: " + shown_date, "RECOGIDA " + school]
    y_positions=[78*mm,58*mm,38*mm,18*mm]
    for text,y in zip(lines,y_positions):
        size=22
        while size>10 and pdf.stringWidth(text,"Helvetica-Bold",size)>135*mm: size-=1
        pdf.setFont("Helvetica-Bold",size); pdf.drawString(7.5*mm,y,text)
    pdf.save(); return buf.getvalue()


app = FastAPI(title="Paddy · Incidencias de pedidos", docs_url=None, redoc_url=None)

@app.exception_handler(HTTPException)
async def http_error(_: Request, exc: HTTPException):
    return JSONResponse({"error": str(exc.detail)}, status_code=exc.status_code)


class HandoffPayload(BaseModel):
    source_type: str = Field(pattern="^(order|reservation|manual)$")
    source_ref: str = Field(min_length=1, max_length=100)
    data: dict[str, Any] = Field(default_factory=dict)


def safe_handoff(data: dict[str, Any], source_type: str, source_ref: str) -> dict[str, Any]:
    allowed={"order_number","order_id","customer_name","customer_email","customer_phone","order_date","order_status","order_total","shipping_address","billing_address","products_json","incident_text","incident_date","pickup_school","pickup_school_name","pickup_details","pickup_received","solved","incident_school_name","recurrence_count","recurrence_history","is_recurrence"}
    out={k:v for k,v in data.items() if k in allowed}; out["order_number"]=out.get("order_number") or source_ref
    out.setdefault("incident_date",today_iso()); out.setdefault("products_json","[]"); out.setdefault("incident_text",""); out.setdefault("solved",0); out.setdefault("pickup_school",0); out.setdefault("pickup_received",0)
    return out


@app.get("/", response_class=HTMLResponse)
def root(handoff: str = ""):
    page=ORIGINAL_HTML
    if handoff:
        token=json.dumps(handoff)
        extra=f'''<script>(async()=>{{try{{const r=await api('/api/handoff/'+encodeURIComponent({token}));show(r);showView('main');status('Datos recibidos desde Gestión Unificada.','ok')}}catch(e){{status(e.message,'error')}}}})();</script>'''
        page=page.replace("</body>",extra+"</body>")
    return HTMLResponse(page)


@app.get("/health")
def health(): return {"status":"ok","ui":"original-extracted","cloud":bool(SYNC_URL),"woocommerce":bool(WOO)}

@app.post("/api/handoff")
def create_handoff(payload: HandoffPayload, x_paddy_handoff_secret: str | None = Header(default=None)):
    if not HANDOFF_SECRET: raise HTTPException(503,"PADDY_HANDOFF_SECRET no está configurado")
    if not x_paddy_handoff_secret or not secrets.compare_digest(x_paddy_handoff_secret,HANDOFF_SECRET): raise HTTPException(401,"No autorizado")
    token=secrets.token_urlsafe(24); now=datetime.now(timezone.utc); exp=now+timedelta(minutes=15); data=safe_handoff(payload.data,payload.source_type,payload.source_ref)
    con=sqlite3.connect(DB_PATH); con.execute("INSERT INTO handoffs(token,source_type,source_ref,payload_json,created_at,expires_at) VALUES(?,?,?,?,?,?)",(token,payload.source_type,payload.source_ref,json.dumps(data,ensure_ascii=False),now.isoformat(),exp.isoformat())); con.commit(); con.close()
    return {"token":token,"open_url":f"{PUBLIC_BASE_URL}/?handoff={token}"}

@app.get("/api/handoff/{token}")
def get_handoff(token: str):
    con=sqlite3.connect(DB_PATH); con.row_factory=sqlite3.Row; row=con.execute("SELECT * FROM handoffs WHERE token=?",(token,)).fetchone(); con.close()
    if not row: raise HTTPException(404,"Traspaso no encontrado")
    if datetime.fromisoformat(row["expires_at"]) < datetime.now(timezone.utc): raise HTTPException(410,"El traspaso ha caducado")
    return json.loads(row["payload_json"])


def need_woo() -> WooCommerce:
    if not WOO: raise RuntimeError("WooCommerce no está configurado en el servidor.")
    return WOO


def need_cloud() -> CloudIncidentStore:
    if not isinstance(STORE,CloudIncidentStore): raise RuntimeError("La vista Tienda necesita el registro compartido de Google.")
    return STORE


def api_fail(exc: Exception, status: int = 400):
    return JSONResponse({"error":str(exc)},status_code=status)


@app.get("/api/order")
def api_order(number: str = ""):
    try:
        n=number.strip().lstrip("#"); old=STORE.get(n)
        if old: return old
        return order_to_record(need_woo().find_order(n))
    except Exception as exc: return api_fail(exc,404 if isinstance(exc,LookupError) else 400)

@app.get("/api/incidents")
def api_incidents(q: str = ""):
    try:
        rows=STORE.all(q); seen=set(); unique=[]
        for row in sorted(rows,key=lambda x:str(x.get("updated_at") or ""),reverse=True):
            key=(str(row.get("source_type") or "").strip().upper(),str(row.get("order_number") or "").strip().upper(),str(row.get("customer_name") or "").strip().upper(),str(row.get("incident_date") or "")[:10]," ".join(str(row.get("incident_text") or "").upper().split()))
            if key in seen: continue
            seen.add(key); unique.append(row)
        return unique
    except Exception as exc: return api_fail(exc)

@app.post("/api/solved")
async def api_solved(request: Request):
    try:
        body=await request.json(); number=str(body.get("order_number") or "").strip(); solved=bool(body.get("solved")); source=str(body.get("source_type") or "order")
        if not number: raise ValueError("Falta el número de incidencia.")
        if source == "tienda":
            record=need_cloud().get_store_incident(number)
            if not record: raise LookupError("No se encontró la incidencia de tienda.")
            # Google Sheets can return legacy ticket identifiers such as 0 as
            # numbers.  Keep them as text so Apps Script does not treat 0 as
            # a missing identifier when saving the updated status.
            record["order_number"]=number
            record["ticket_number"]=number
            record["solved"]=1 if solved else 0
            return need_cloud().save_store_incident(record)
        record=STORE.get(number)
        if not record: raise LookupError("No se encontró la incidencia.")
        record["order_number"]=number
        record["solved"]=1 if solved else 0
        return STORE.save(record)
    except Exception as exc: return api_fail(exc,404 if isinstance(exc,LookupError) else 400)

@app.get("/api/metrics")
def api_metrics(date_from: str = "", date_to: str = ""):
    try: return STORE.metrics(date_from,date_to)
    except Exception as exc: return api_fail(exc)

@app.get("/api/schools")
def api_schools():
    try: return need_woo().schools()
    except Exception as exc: return api_fail(exc)

@app.get("/api/school-products")
def api_school_products(school: str = ""):
    try: return need_woo().school_products(school)
    except Exception as exc: return api_fail(exc,404 if isinstance(exc,LookupError) else 400)

@app.get("/api/pickups")
def api_pickups():
    try:
        rows=STORE.pickups(); chosen={}
        for row in rows:
            number=str(row.get("order_number") or row.get("ticket_number") or "").strip().lstrip("#")
            upper=number.upper()
            # PA123 and IPA123 are the same incident; prefer the canonical
            # incident identifier that starts with I. Legacy numeric tickets
            # are also collapsed to their most recently updated copy.
            family=upper[1:] if upper.startswith("IPA") or (upper.startswith("I") and upper[1:].isdigit()) else upper
            rank=(1 if upper.startswith("I") else 0,str(row.get("updated_at") or ""))
            previous=chosen.get(family)
            if previous is None or rank > previous[0]: chosen[family]=(rank,row)
        return [item[1] for item in chosen.values()]
    except Exception as exc: return api_fail(exc)

@app.get("/api/store-incidents")
def api_store_incidents():
    try: return need_cloud().store_incidents()
    except Exception as exc: return api_fail(exc)

@app.get("/api/store-incident")
def api_store_incident(ticket: str = ""):
    try:
        row=need_cloud().get_store_incident(ticket)
        if not row: raise LookupError("No se encontró la incidencia de tienda.")
        return row
    except Exception as exc: return api_fail(exc,404 if isinstance(exc,LookupError) else 400)

@app.get("/api/store-ticket-image")
def api_store_ticket_image(file_id: str = ""):
    try:
        mime,data=need_cloud().store_ticket_image(file_id)
        return Response(data,media_type=mime,headers={"Cache-Control":"private, max-age=300"})
    except Exception as exc: return api_fail(exc)

@app.post("/api/save")
async def api_save(request: Request):
    try:
        record=await request.json()
        if not str(record.get("incident_text") or "").strip(): raise ValueError("Describe la incidencia antes de guardar.")
        return STORE.save(record)
    except Exception as exc: return api_fail(exc)

@app.post("/api/pickup-received")
async def api_pickup_received(request: Request):
    try:
        body=await request.json(); source=body.get("record_source","order"); order=str(body.get("order_number") or ""); received=bool(body.get("received"))
        if source=="store":
            row=need_cloud().set_store_pickup_received(order,received)
            if row and received:
                row["order_number"]=order
                row["ticket_number"]=order
                row["solved"]=1; row=need_cloud().save_store_incident(row)
        else:
            row=STORE.set_pickup_received(order,received)
            if row and received:
                row["order_number"]=order
                row["solved"]=1; row=STORE.save(row)
        if not row: raise ValueError("No se encontró la recogida.")
        return row
    except Exception as exc: return api_fail(exc)

@app.post("/api/store-save")
async def api_store_save(request: Request):
    try:
        body=await request.json(); record=body.get("record") or {}; ticket=str(record.get("ticket_number") or "").strip()
        if not ticket: raise ValueError("Indica el número de ticket.")
        if not str(record.get("incident_text") or "").strip(): raise ValueError("Describe la incidencia de tienda.")
        return need_cloud().save_store_incident(record,body.get("image_data") or "",body.get("image_mime") or "")
    except Exception as exc: return api_fail(exc)

@app.get("/print/{number}")
def print_order(number: str):
    try:
        record=STORE.get(number)
        if not record: raise LookupError("Primero hay que guardar la incidencia.")
        data=create_pdf(record)
        return Response(data,media_type="application/pdf",headers={"Content-Disposition":f'inline; filename="Incidencia_{number}.pdf"'})
    except Exception as exc: return api_fail(exc,404 if isinstance(exc,LookupError) else 400)

@app.get("/label/{number}")
def label_order(number: str):
    try:
        record=STORE.get(number)
        if not record: raise LookupError("Primero hay que guardar la incidencia.")
        data=create_incident_label(record)
        return Response(data,media_type="application/pdf",headers={"Content-Disposition":f'inline; filename="Etiqueta_incidencia_{number}.pdf"'})
    except Exception as exc: return api_fail(exc,404 if isinstance(exc,LookupError) else 400)

@app.get("/print-store/{ticket}")
def print_store(ticket: str):
    try:
        cloud=need_cloud(); record=cloud.get_store_incident(ticket)
        if not record: raise LookupError("Primero hay que guardar la incidencia de tienda.")
        image=None
        if record.get("ticket_file_id"):
            try: _mime,image=cloud.store_ticket_image(record["ticket_file_id"])
            except Exception: image=None
        data=create_store_pdf(record,image)
        return Response(data,media_type="application/pdf",headers={"Content-Disposition":f'inline; filename="Incidencia_tienda_{ticket}.pdf"'})
    except Exception as exc: return api_fail(exc,404 if isinstance(exc,LookupError) else 400)
