'use client';

import { useEffect, useRef, useState } from 'react';
import { BarcodeCameraScanner } from '@/components/order-preparation/barcode-camera-scanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchReservations } from '@/lib/dashboard-api';
import type { DashboardMondayRecord as Reservation } from '@/lib/dashboard-types';
import { buildEmailLink, buildWhatsAppLink } from '@/lib/contact-links';
import { buildShippingNote } from '@/lib/delivery-message';
import { foldSearchText } from '@/lib/global-search';
import { printStandaloneLabel } from '@/lib/label-print';
import { canPrepareReservation, reservationBarcodeMatches, reservationReference } from '@/lib/reservation-preparation';
import '../preparar-pedidos/preparar-pedidos.css';

const article = (row: Reservation) => row.articleDescription || row.article || row.code;
const eligible = (row: Reservation) => canPrepareReservation(row.status, row.pending);
const unitsToPrepare = (row: Reservation) => Number(row.pending.trim() || row.units);
const panel = 'grid min-w-0 gap-3 rounded-xl border bg-white p-3';

export default function PrepareReservationsPage() {
  const [rows, setRows] = useState<Reservation[]>([]);
  const [filter, setFilter] = useState('');
  const [scan, setScan] = useState('');
  const [reference, setReference] = useState('');
  const [selection, setSelection] = useState<string[]>([]);
  const [barcode, setBarcode] = useState('');
  const [scannedUnits, setScannedUnits] = useState<Record<string, number>>({});
  const [checkingBarcode, setCheckingBarcode] = useState(false);
  const [scanFeedback, setScanFeedback] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [camera, setCamera] = useState<'qr' | 'tracking' | 'product' | null>(null);
  const [carrier, setCarrier] = useState<'viaxpress' | 'dhl'>('viaxpress');
  const [tracking, setTracking] = useState('');
  const [showMessage, setShowMessage] = useState(false);
  const detail = useRef<HTMLElement>(null);
  const barcodeInput = useRef<HTMLInputElement>(null);
  const scanInFlight = useRef(false);
  const group = rows.filter((row) => reference && reservationReference(row.reference) === reference);
  const query = foldSearchText(filter);
  const matches = query ? rows.filter((row) => eligible(row) &&
    [row.reference, row.code].some((value) => foldSearchText(value).includes(query))) : [];

  async function load() {
    setLoading(true);
    setNotice('');
    try { setRows(await fetchReservations()); }
    catch (error) { setNotice(error instanceof Error ? error.message : 'No se pudo cargar Monday.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);
  useEffect(() => { if (reference) detail.current?.scrollIntoView({ block: 'start' }); }, [reference]);

  function open(value: string) {
    const key = reservationReference(value);
    if (!key || !rows.some((row) => reservationReference(row.reference) === key)) {
      setNotice('No se ha encontrado esa reserva en el listado de Monday.');
      return;
    }
    setReference(key);
    setScan('');
    setSelection([]);
    setBarcode('');
    setScannedUnits({});
    setScanFeedback('');
    setTracking('');
    setShowMessage(false);
    setNotice('');
  }

  async function scanProduct(value: string) {
    if (!value.trim() || scanInFlight.current || saving) return;
    scanInFlight.current = true;
    setCheckingBarcode(true);
    setBarcode('');
    setScanFeedback('');
    try {
      const response = await fetch(`/api/reservation-preparation?barcode=${encodeURIComponent(value)}`, { cache: 'no-store' });
      const product = await response.json() as { article: string; size: string; error?: string };
      if (!response.ok) throw new Error(product.error || 'No se pudo comprobar la etiqueta.');
      const matches = group.filter((row) => eligible(row) && reservationBarcodeMatches(row, product));
      if (!matches.length) throw new Error('La prenda o la talla no coincide con esta reserva.');
      const pendingMatches = matches.filter((item) => !selection.includes(item.id) &&
        Number.isSafeInteger(unitsToPrepare(item)) && (scannedUnits[item.id] || 0) < unitsToPrepare(item));
      if (pendingMatches.length > 1) throw new Error('Hay varias líneas con el mismo artículo y talla. Marca manualmente la que vas a enviar.');
      const row = pendingMatches[0];
      if (!row) throw new Error('La prenda ya está marcada o sus unidades pendientes no son válidas.');
      const count = (scannedUnits[row.id] || 0) + 1;
      setScannedUnits((current) => ({ ...current, [row.id]: count }));
      if (count === unitsToPrepare(row)) setSelection((current) => [...new Set([...current, row.id])]);
      setScanFeedback(`${article(row)} · ${count}/${unitsToPrepare(row)} unidades leídas.`);
    } catch (error) {
      setScanFeedback(error instanceof Error ? error.message : 'No se pudo leer el código.');
    } finally {
      scanInFlight.current = false;
      setCheckingBarcode(false);
      requestAnimationFrame(() => barcodeInput.current?.focus());
    }
  }

  async function finish() {
    if (saving || scanInFlight.current || !selection.length) return;
    setSaving(true);
    setNotice('');
    try {
      const response = await fetch('/api/reservation-preparation', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ reference, ids: selection }),
      });
      const data = await response.json() as {
        error?: string; updatedIds: string[]; failedIds: string[]; status: string;
      };
      if (!response.ok) throw new Error(data.error || 'No se pudo actualizar Monday.');
      setRows((current) => current.map((row) =>
        data.updatedIds.includes(row.id) ? { ...row, status: data.status } : row,
      ));
      setSelection(data.failedIds);
      setNotice(data.failedIds.length
        ? `Actualizadas en Monday: ${data.updatedIds.length}. Pendientes de reintentar: ${data.failedIds.length}.`
        : `Prendas actualizadas en Monday: ${data.updatedIds.length}.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo preparar la reserva.');
    } finally {
      setSaving(false);
    }
  }

  const emails = [...new Set(group.map((row) => row.customerEmail).filter(Boolean))];
  const phones = [...new Set(group.map((row) => row.phone).filter(Boolean))];
  const message = tracking.trim() ? buildShippingNote(carrier, tracking) : '';
  const email = message && emails.length === 1 ? buildEmailLink(emails[0], `Envío de la reserva ${reference}`, message) : null;
  const whatsapp = message && phones.length === 1 ? buildWhatsAppLink(phones[0], message) : null;

  return (
    <main className="order-preparation-page">
      <header className="order-preparation-topbar">
        <a href="/">← PaddyTools</a>
        <strong>Preparar reservas</strong>
      </header>
      <div className="order-preparation-shell grid gap-3">
        <section className={panel}>
          <label className="grid gap-1">Código de artículo o número de reserva
            <Input value={filter} disabled={loading || saving} onChange={(e) => setFilter(e.target.value)} />
          </label>
          <form className="grid gap-2 sm:grid-cols-[1fr_auto_auto]" onSubmit={(e) => { e.preventDefault(); open(scan); }}>
            <Input aria-label="Número de reserva" placeholder="Escanea el QR o escribe el número" value={scan}
              disabled={loading || saving || checkingBarcode} onChange={(e) => setScan(e.target.value)} />
            <Button type="submit" disabled={loading || saving || checkingBarcode || !scan.trim()}>Abrir reserva</Button>
            <Button type="button" variant="outline" disabled={loading || saving || checkingBarcode} onClick={() => setCamera('qr')}>Escanear QR</Button>
          </form>
          <Button type="button" variant="outline" disabled={loading || saving || checkingBarcode} onClick={() => void load()}>
            {loading ? 'Cargando reservas…' : 'Actualizar listado'}
          </Button>
        </section>
        {notice && <p role="status" className="rounded-lg bg-white p-3">{notice}</p>}
        {group.length > 0 && <section ref={detail} className={panel}>
          <h1 className="text-lg font-bold">Reserva {reference} · {group[0].customer}</h1>
          <form className="grid gap-2 sm:grid-cols-[1fr_auto_auto]" onSubmit={(event) => {
            event.preventDefault();
            void scanProduct(barcode);
          }}>
            <Input ref={barcodeInput} aria-label="Código de barras de la prenda" placeholder="Código de barras de la prenda"
              autoComplete="off" value={barcode} disabled={saving || checkingBarcode}
              onChange={(event) => setBarcode(event.target.value)} />
            <Button type="submit" disabled={saving || checkingBarcode || !barcode.trim()}>
              {checkingBarcode ? 'Comprobando…' : 'Añadir lectura'}
            </Button>
            <Button type="button" variant="outline" disabled={saving || checkingBarcode} onClick={() => setCamera('product')}>
              Escanear prenda con cámara
            </Button>
          </form>
          {scanFeedback && <p role="status">{scanFeedback}</p>}
          <fieldset disabled={saving || checkingBarcode} className="grid gap-2">
            <legend className="mb-2 font-bold">Marca las prendas que envías</legend>
            {group.map((row) => (
              <label className="flex items-start gap-3 rounded-lg border p-3" key={row.id}>
                <input type="checkbox" className="mt-1 size-5 shrink-0" checked={selection.includes(row.id)}
                  disabled={!eligible(row)} onChange={(e) => {
                    const checked = e.target.checked;
                    setSelection((current) => checked ? [...current, row.id] : current.filter((id) => id !== row.id));
                    if (!checked) setScannedUnits((current) => ({ ...current, [row.id]: 0 }));
                  }} />
                <span className="min-w-0 break-words"><b>{article(row)}</b><br />
                  {row.code} · Talla {row.size || '—'} · {row.pending || row.units} uds.<br />{row.status}
                  {scannedUnits[row.id] > 0 && <><br />Leídas: {scannedUnits[row.id]}/{unitsToPrepare(row)}</>}
                </span>
              </label>
            ))}
          </fieldset>
          <Button type="button" disabled={saving || checkingBarcode || !selection.length} onClick={() => void finish()}>
            {saving ? 'Actualizando Monday…' : `Finalizar selección (${selection.length})`}
          </Button>
          <Button type="button" variant="outline" className="min-h-11 whitespace-normal" disabled={saving} onClick={() => setShowMessage(!showMessage)}>
            {showMessage ? 'Ocultar aviso' : 'Preparar aviso de envío a domicilio'}
          </Button>
          {showMessage && <div className="grid gap-2">
            <label className="grid gap-1">Transportista
              <select className="rounded border p-2" value={carrier} onChange={(e) => setCarrier(e.target.value === 'dhl' ? 'dhl' : 'viaxpress')}>
                <option value="viaxpress">ViaXpress</option><option value="dhl">DHL</option>
              </select>
            </label>
            <label className="grid gap-1">Número de seguimiento
              <Input value={tracking} onChange={(e) => setTracking(e.target.value)} />
            </label>
            <Button type="button" variant="outline" onClick={() => setCamera('tracking')}>Escanear etiqueta de envío</Button>
            {message && <p className="whitespace-pre-line break-words rounded border p-3">{message}</p>}
            {email && <a className="break-all underline" href={email}>Abrir correo a {emails[0]}</a>}
            {whatsapp && <a className="underline" href={whatsapp} target="_blank" rel="noopener noreferrer">Abrir WhatsApp a {phones[0]}</a>}
            {message && !email && !whatsapp && <p>No hay un contacto único y válido para este aviso.</p>}
          </div>}
        </section>}
        {query && <section className="grid gap-2">
          <h2 className="font-bold">Resultados ({matches.length})</h2>
          {matches.map((row) => (
            <article key={row.id} className={panel + ' sm:grid-cols-[1fr_auto_auto]'}>
              <div className="min-w-0 break-words"><b>{row.reference} · {article(row)}</b><br />
                {row.customer} · {row.code} · Talla {row.size || '—'}
              </div>
              <Button type="button" variant="outline" disabled={saving || checkingBarcode} onClick={() => open(row.reference)}>Abrir</Button>
              <Button type="button" variant="outline" disabled={saving} onClick={() => {
                void printStandaloneLabel([
                  `RESERVA ${row.reference}`, `NOMBRE: ${row.customer}`,
                  `ARTÍCULO: ${article(row)} · ${row.size}`, `COLEGIO: ${row.school}`,
                ], row.reference, 'ESCANEAR RESERVA').catch(() => setNotice('No se pudo abrir la etiqueta.'));
              }}>Imprimir etiqueta</Button>
            </article>
          ))}
        </section>}
      </div>
      {camera && <BarcodeCameraScanner target={camera === 'tracking' ? 'shipment' : camera === 'qr' ? 'reservation' : 'product'} onClose={() => setCamera(null)} onScan={(code) => {
        if (camera === 'qr') open(code);
        else if (camera === 'product') void scanProduct(code);
        else setTracking(code.trim());
        setCamera(null);
      }} />}
    </main>
  );
}
