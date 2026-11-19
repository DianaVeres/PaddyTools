'use client';

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Boxes, CheckCircle2, Download, Minus, Plus, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import './inventory.css';

type InventoryItem = {
  id: string;
  barcode: string;
  quantity: number;
  firstScannedAt: string;
  lastScannedAt: string;
};

type InventorySession = {
  id: string;
  warehouse: string;
  season: string;
  countDate: string;
  status: 'draft' | 'closed' | 'exported';
  createdByName: string;
  updatedAt: string;
  items?: InventoryItem[];
};

async function json<T>(response: Response) {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || 'No se pudo completar la operación.');
  return data;
}

export default function InventoriesPage() {
  const today = new Date().toISOString().slice(0, 10);
  const [sessions, setSessions] = useState<InventorySession[]>([]);
  const [active, setActive] = useState<InventorySession | null>(null);
  const [warehouse, setWarehouse] = useState('');
  const [season, setSeason] = useState('');
  const [countDate, setCountDate] = useState(today);
  const [barcode, setBarcode] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const scanRef = useRef<HTMLInputElement>(null);
  const lastScanRef = useRef({ barcode: '', at: 0 });
  const scanInProgressRef = useRef(false);

  const totalUnits = useMemo(
    () => active?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0,
    [active],
  );

  async function loadSessions() {
    try {
      const response = await fetch('/api/inventories', { cache: 'no-store' });
      if (response.status === 401) {
        window.location.assign('/login');
        return;
      }
      const data = await json<{ sessions: InventorySession[] }>(response);
      setSessions(data.sessions);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudieron cargar los inventarios.');
    }
  }

  useEffect(() => {
    void loadSessions();
  }, []);

  async function createInventory(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setNotice('');
    try {
      const data = await json<{ session: InventorySession }>(
        await fetch('/api/inventories', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'create', warehouse, season, countDate }),
        }),
      );
      setActive(data.session);
      setNotice('Inventario iniciado. Pulsa SCAN para leer el primer artículo.');
      await loadSessions();
      requestAnimationFrame(() => scanRef.current?.focus());
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo crear el inventario.');
    } finally {
      setBusy(false);
    }
  }

  async function openInventory(id: string) {
    setBusy(true);
    try {
      const data = await json<{ session: InventorySession }>(
        await fetch(`/api/inventories?id=${encodeURIComponent(id)}`, { cache: 'no-store' }),
      );
      setActive(data.session);
      setNotice(data.session.status === 'draft' ? 'Inventario recuperado. Puedes continuar escaneando.' : 'Inventario cerrado en modo consulta.');
      requestAnimationFrame(() => scanRef.current?.focus());
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo abrir el inventario.');
    } finally {
      setBusy(false);
    }
  }

  async function saveScan(rawValue: string) {
    if (!active || active.status !== 'draft') return;
    const value = rawValue.trim().replace(/\s+/g, '').toUpperCase();
    if (!value || scanInProgressRef.current) return;
    setBarcode('');
    const now = Date.now();
    if (lastScanRef.current.barcode === value && now - lastScanRef.current.at < 900) {
      setNotice(`${value} no se ha contado dos veces: lectura repetida demasiado rápida.`);
      requestAnimationFrame(() => scanRef.current?.focus());
      return;
    }
    lastScanRef.current = { barcode: value, at: now };
    scanInProgressRef.current = true;
    setBusy(true);
    try {
      const data = await json<{ session: InventorySession }>(
        await fetch('/api/inventories', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'scan', sessionId: active.id, barcode: value }),
        }),
      );
      setActive(data.session);
      const item = data.session.items?.find((row) => row.barcode === value);
      setNotice(`${value} registrado · cantidad ${item?.quantity || 1}.`);
      if ('vibrate' in navigator) navigator.vibrate(80);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo guardar la lectura.');
    } finally {
      scanInProgressRef.current = false;
      setBusy(false);
      requestAnimationFrame(() => scanRef.current?.focus());
    }
  }

  function scan(event: FormEvent) {
    event.preventDefault();
    void saveScan(barcode);
  }

  function finishScanWithKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter' && event.key !== 'Tab') return;
    event.preventDefault();
    void saveScan(event.currentTarget.value);
  }

  useEffect(() => {
    if (!barcode.trim() || busy || active?.status !== 'draft') return;
    const timer = window.setTimeout(() => void saveScan(barcode), 350);
    return () => window.clearTimeout(timer);
  }, [barcode, busy, active?.id, active?.status]);

  async function setQuantity(item: InventoryItem, quantity: number) {
    if (!active || active.status !== 'draft') return;
    setBusy(true);
    try {
      const data = await json<{ session: InventorySession }>(
        await fetch('/api/inventories', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'quantity', sessionId: active.id, itemId: item.id, quantity }),
        }),
      );
      setActive(data.session);
      setNotice(quantity ? `${item.barcode}: cantidad corregida a ${quantity}.` : `${item.barcode} eliminado del recuento.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo corregir la cantidad.');
    } finally {
      setBusy(false);
      requestAnimationFrame(() => scanRef.current?.focus());
    }
  }

  async function closeInventory() {
    if (!active || !window.confirm('¿Cerrar este inventario? Después quedará en modo consulta.')) return;
    setBusy(true);
    try {
      const data = await json<{ session: InventorySession }>(
        await fetch('/api/inventories', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'close', sessionId: active.id }),
        }),
      );
      setActive(data.session);
      setNotice('Inventario cerrado y preparado para su futura conexión con STM.');
      await loadSessions();
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo cerrar el inventario.');
    } finally {
      setBusy(false);
    }
  }

  function downloadAudit() {
    if (!active) return;
    const rows = [
      ['ALMACEN', 'FECHA', 'TEMPORADA', 'CODIGO_BARRAS', 'CANTIDAD'],
      ...(active.items || []).map((item) => [active.warehouse, active.countDate, active.season, item.barcode, String(item.quantity)]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(';')).join('\r\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    link.download = `inventario-${active.warehouse}-${active.countDate}.csv`.replace(/[^a-z0-9._-]+/gi, '-');
    link.click();
    URL.revokeObjectURL(link.href);
  }

  return (
    <main className="inventory-page">
      <header className="inventory-header">
        <a href="/"><ArrowLeft /> PaddyTools</a>
        <div><Boxes /><span><b>Inventarios</b><small>Recuento con PDA</small></span></div>
      </header>

      <section className="inventory-shell">
        {!active ? (
          <>
            <div className="inventory-intro"><p>NUEVO RECUENTO</p><h1>Inventario de almacén</h1><span>Lee cada etiqueta con el botón físico SCAN. El recuento se guarda después de cada lectura.</span></div>
            <form className="inventory-new" onSubmit={createInventory}>
              <label>Almacén<Input value={warehouse} onChange={(e) => setWarehouse(e.target.value)} placeholder="Ej. ALMACÉN CENTRAL" required /></label>
              <label>Temporada<Input value={season} onChange={(e) => setSeason(e.target.value)} placeholder="Ej. 3 - AÑO 2025-2026" /></label>
              <label>Fecha<Input type="date" value={countDate} onChange={(e) => setCountDate(e.target.value)} required /></label>
              <Button type="submit" disabled={busy}><ScanLine /> Iniciar inventario</Button>
            </form>
            <div className="inventory-history"><h2>Continuar o consultar</h2>{sessions.map((session) => (
              <button key={session.id} onClick={() => void openInventory(session.id)}>
                <span><b>{session.warehouse}</b><small>{session.countDate} · {session.season || 'Sin temporada'} · {session.createdByName}</small></span>
                <em className={session.status}>{session.status === 'draft' ? 'Pendiente' : 'Cerrado'}</em>
              </button>
            ))}{!sessions.length && <p>Todavía no hay inventarios guardados.</p>}</div>
          </>
        ) : (
          <>
            <div className="inventory-active-heading">
              <button onClick={() => setActive(null)}><ArrowLeft /> Recuentos</button>
              <div><p>{active.status === 'draft' ? 'RECUENTO ACTIVO' : 'RECUENTO CERRADO'}</p><h1>{active.warehouse}</h1><span>{active.countDate} · {active.season || 'Sin temporada'}</span></div>
              <div className="inventory-totals"><b>{active.items?.length || 0}</b><small>Referencias</small><b>{totalUnits}</b><small>Unidades</small></div>
            </div>
            {active.status === 'draft' && <form className="scan-box" onSubmit={scan}>
              <ScanLine /><label>Código de barras<Input ref={scanRef} value={barcode} onChange={(e) => setBarcode(e.target.value)} onKeyDown={finishScanWithKey} placeholder="Pulsa SCAN" autoComplete="off" autoCapitalize="characters" disabled={busy} /></label>
              <Button type="submit" disabled={busy || !barcode.trim()}>Añadir</Button>
            </form>}
            {notice && <p className="inventory-notice">{notice}</p>}
            <div className="inventory-items">{active.items?.map((item) => (
              <article key={item.id}><div><b>{item.barcode}</b><small>Última lectura: {new Date(item.lastScannedAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</small></div>
                <div className="quantity"><button disabled={busy || active.status !== 'draft'} onClick={() => void setQuantity(item, item.quantity - 1)}><Minus /></button><strong>{item.quantity}</strong><button disabled={busy || active.status !== 'draft'} onClick={() => void setQuantity(item, item.quantity + 1)}><Plus /></button></div>
              </article>
            ))}{!active.items?.length && <div className="inventory-empty"><ScanLine /><b>Aún no hay lecturas</b><span>Coloca el cursor en Código de barras y pulsa SCAN.</span></div>}</div>
            <div className="inventory-footer"><Button variant="outline" onClick={downloadAudit} disabled={!active.items?.length}><Download /> Descargar revisión</Button>{active.status === 'draft' && <Button onClick={() => void closeInventory()} disabled={busy || !active.items?.length}><CheckCircle2 /> Cerrar inventario</Button>}</div>
          </>
        )}
        {notice && !active && <p className="inventory-notice">{notice}</p>}
      </section>
    </main>
  );
}
