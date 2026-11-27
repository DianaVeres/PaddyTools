'use client';

import { useRef, useState } from 'react';
import { ScanBarcode } from 'lucide-react';
import { BarcodeCameraScanner } from '@/components/order-preparation/barcode-camera-scanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { searchConnectedRecords, searchExactConnected } from '@/lib/dashboard-api';
import { normalizeReferenceInput } from '@/lib/global-search';
import { isExactReturnReference, returnOrderReference, returnSearchTerm } from '@/lib/order-return';

type LookupMatch = {
  id: string;
  label: string;
  reference: string;
  customer: string;
  details?: string;
  order?: string;
  incidentId?: string;
};

type OrderResult = {
  detail: { number: string; items: Array<{ id: number; name: string; size: string; sku: string; quantity: number }> };
  pickups: Array<{ id: string; incidentText: string; pickupDetails: string }>;
  canMarkIncident: boolean;
  hasIncident: boolean;
  canCreateIncident: boolean;
};
type Receipt = { itemId: number; kind: 'return' | 'incident'; pickupId: string; operationId: string; quantity: number; description: string; shippingRequired: boolean };

export default function ReturnsPage() {
  const input = useRef<HTMLInputElement>(null);
  const [reference, setReference] = useState('');
  const [camera, setCamera] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [result, setResult] = useState<OrderResult | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [matches, setMatches] = useState<LookupMatch[]>([]);

  async function openOrder(code: string) {
    if (!code.trim() || busy) return;
    setBusy(true);
    setResult(null);
    setReceipt(null);
    setNotice('');
    try {
      const response = await fetch('/api/order-returns?order=' + encodeURIComponent(code), { cache: 'no-store' });
      const data = await response.json() as OrderResult & { error?: string };
      if (!response.ok) throw new Error(data.error);
      setReference('');
      setResult(data);
      return true;
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo abrir el pedido.');
    } finally {
      setBusy(false);
    }
  }

  async function search(value: string) {
    if (busy) return;
    const term = returnSearchTerm(value);
    if (!term) {
      setNotice('Introduce una referencia, un nombre o un teléfono.');
      return;
    }
    const exact = isExactReturnReference(term);
    const reference = normalizeReferenceInput(term);
    const linkedOrder = returnOrderReference(reference);
    if (/^PA\d+$/.test(reference)) {
      setMatches([]);
      if (await openOrder(reference)) return;
    }
    setBusy(true);
    setResult(null);
    setReceipt(null);
    setMatches([]);
    setNotice('');
    try {
      const connected = exact
        ? await searchExactConnected({ reference, ticketReference: reference, wooOrder: linkedOrder.startsWith('PA') && linkedOrder !== reference, wooReference: linkedOrder })
        : null;
      const named = exact ? null : await searchConnectedRecords(term);
      const results: LookupMatch[] = [];
      if (connected?.order && normalizeReferenceInput(connected.order.number) === linkedOrder) results.push({
        id: 'woo-' + linkedOrder, label: 'Pedido WooCommerce', reference: linkedOrder,
        customer: connected.order.customer.name, order: linkedOrder,
      });
      for (const order of named?.wooMatches ?? []) results.push({
        id: 'woo-' + order.id, label: 'Pedido WooCommerce', reference: order.number, customer: order.customerName,
        details: [order.phone, order.dateCreated.slice(0, 10)].filter(Boolean).join(' · '), order: order.number,
      });
      for (const row of connected?.mondayRecords ?? named?.mondayMatches ?? []) results.push({
        id: 'monday-' + row.id, label: row.kind === 'reserva' ? 'Reserva' : 'Prenda especial',
        reference: row.reference, customer: row.customer,
        details: [row.articleDescription || row.article || row.code, row.size, row.status].filter(Boolean).join(' · '),
        order: returnOrderReference(row.reference).startsWith('PA') ? returnOrderReference(row.reference) : undefined,
      });
      const incidents = connected?.incidents.length ? connected.incidents : connected?.incident ? [connected.incident] : named?.incidentMatches ?? [];
      for (const row of incidents) results.push({
        id: 'incident-' + row.id, label: 'Incidencia', reference: row.orderNumber, customer: row.customerName,
        details: row.pickupDetails || row.incidentText, incidentId: row.id,
        order: returnOrderReference(row.orderNumber).startsWith('PA') ? returnOrderReference(row.orderNumber) : undefined,
      });
      if (connected?.ticket) results.push({
        id: 'ticket-' + connected.ticket.number, label: 'Ticket de tienda', reference: connected.ticket.number,
        customer: connected.ticket.customer,
        details: connected.ticket.items.map((item) => item.name || item.article).filter(Boolean).join(' · '),
      });
      if (!results.length) setNotice('No se encontraron registros para esta búsqueda.');
      setMatches(results);
    } catch {
      setNotice('No se pudo completar la búsqueda. Vuelve a intentarlo.');
    } finally {
      setBusy(false);
    }
  }

  function select(itemId: number, kind: Receipt['kind']) {
    setNotice('');
    setReceipt({ itemId, kind, pickupId: '', quantity: 1, description: '', shippingRequired: false, operationId: crypto.randomUUID() });
  }

  const needsIncident = receipt?.kind === 'incident' && result?.hasIncident === false;

  async function receive() {
    if (!receipt || !result || busy) return;
    setBusy(true);
    setNotice('');
    try {
      const response = await fetch('/api/order-returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...receipt, reference: result.detail.number }),
      });
      const data = await response.json() as { error?: string; pickupReceived?: boolean; incidentCreated?: boolean };
      if (!response.ok) throw new Error(data.error);
      if (receipt.kind === 'incident') {
        const id = receipt.pickupId || result.pickups[0]?.id;
        setResult({ ...result, hasIncident: result.hasIncident || needsIncident, pickups: result.pickups.filter((pickup) => pickup.id !== id) });
      }
      setReceipt(null);
      setNotice(data.pickupReceived ? 'Nota guardada. Recogida marcada como recibida.' : data.incidentCreated ? 'Incidencia creada y nota guardada en el pedido.' : 'Recepción guardada en las notas del pedido.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo guardar la recepción.');
    } finally {
      setBusy(false);
    }
  }

  return <>
    <form className="grid min-w-0 gap-2 rounded-xl border bg-white p-3"
      onSubmit={(event) => { event.preventDefault(); void search(reference); }}>
      <label htmlFor="return-order">QR, referencia, nombre o teléfono</label>
      <div className="grid min-w-0 gap-2 sm:grid-cols-[1fr_auto_auto]">
        <Input id="return-order" ref={input} autoComplete="off" value={reference} disabled={busy}
          placeholder="Ej. PA51548, R11575 o nombre" onChange={(event) => setReference(event.target.value)} />
        <Button type="submit" className="min-h-11" disabled={busy || !reference.trim()}>Buscar</Button>
        <Button type="button" className="min-h-11" variant="outline" disabled={busy} onClick={() => setCamera(true)}>
          <ScanBarcode /> Escanear QR
        </Button>
      </div>
    </form>
    {notice && <p className="rounded-lg bg-white p-3" role="status">{notice}</p>}
    {matches.length > 0 && <section className="grid min-w-0 gap-2 rounded-xl border bg-white p-3">
      <h2 className="font-bold">Resultados de búsqueda</h2>
      {matches.map((match) => <article key={match.id} className="grid min-w-0 gap-2 rounded-lg border p-3">
        <p className="break-words font-semibold">{match.label} {match.reference}{match.customer && ' · ' + match.customer}</p>
        {match.details && <p className="whitespace-pre-line break-words">{match.details}</p>}
        <div className="flex flex-wrap gap-2">
          {match.order && <Button type="button" className="min-h-11" disabled={busy} onClick={() => void openOrder(match.order!)}>
            Abrir pedido para devolución
          </Button>}
          {match.label !== 'Pedido WooCommerce' && <a className="underline underline-offset-4" href={'/?' + new URLSearchParams({ order: match.reference, ...(match.incidentId ? { incidentId: match.incidentId } : {}) })}>
            Ver ficha en Consulta global
          </a>}
        </div>
      </article>)}
    </section>}
    {result && <section className="grid gap-2 rounded-xl border bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold">Pedido {result.detail.number}</h1>
        <Button type="button" variant="outline" disabled={busy} onClick={() => {
          setResult(null); setReceipt(null); setMatches([]); setNotice(''); input.current?.focus();
        }}>Leer otro pedido</Button>
      </div>
      {result.detail.items.map((item) => <article className="grid min-w-0 gap-2 rounded-lg border p-3" key={item.id}>
        <h2 className="break-words font-semibold">{item.name}</h2>
        <p>Talla {item.size} · {item.sku} · {item.quantity} uds. en el pedido</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" className="min-h-11" variant="outline" disabled={busy} onClick={() => select(item.id, 'return')}>Devolución</Button>
          {result.canMarkIncident && <Button type="button" className="min-h-11" variant="outline" disabled={busy}
            onClick={() => select(item.id, 'incident')}>Incidencia</Button>}
        </div>
        {receipt?.itemId === item.id && <div className="grid min-w-0 gap-2 rounded-lg border bg-slate-50 p-2">
          <label className="grid gap-1">
            Unidades recibidas de {item.sku}
            <Input type="number" inputMode="numeric" min={1} max={item.quantity} step={1}
              value={receipt.quantity || ''} disabled={busy}
              onChange={(event) => setReceipt({ ...receipt, quantity: Number(event.target.value), operationId: crypto.randomUUID() })} />
          </label>
          {receipt.kind === 'incident' && (result.pickups.length > 1
            ? <label className="grid min-w-0 gap-1">Recogida pendiente
                <select className="w-full min-w-0 rounded-lg border bg-white p-2" value={receipt.pickupId} disabled={busy}
                  onChange={(event) => setReceipt({ ...receipt, pickupId: event.target.value })}>
                  <option value="">Selecciona la incidencia</option>
                  {result.pickups.map((pickup) => <option key={pickup.id} value={pickup.id}>
                    {pickup.pickupDetails || pickup.incidentText || pickup.id}
                  </option>)}
                </select>
              </label>
            : <p>{result.pickups[0] ? 'Se marcará la recogida como recibida.' : result.hasIncident ? 'La incidencia ya está registrada. Se guardará la nota.' : null}</p>)}
          {needsIncident && (result.canCreateIncident ? <>
          <label className="grid gap-1">
            ¿Qué ha pasado?
            <textarea className="min-h-24 w-full rounded-lg border bg-white p-2" maxLength={4000}
              value={receipt.description} disabled={busy}
              onChange={(event) => setReceipt({ ...receipt, description: event.target.value })} />
          </label>
          <label className="flex min-h-11 items-center gap-2">
            <input type="checkbox" checked={receipt.shippingRequired} disabled={busy}
              onChange={(event) => setReceipt({ ...receipt, shippingRequired: event.target.checked })} />
            Requiere envío
          </label>
          </> : <p>Tu usuario necesita permiso de Incidencias para darla de alta.</p>)}
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="min-h-11" disabled={busy || (needsIncident && (!result.canCreateIncident || !receipt.description.trim())) || !Number.isSafeInteger(receipt.quantity) || receipt.quantity < 1 || receipt.quantity > item.quantity || (receipt.kind === 'incident' && result.pickups.length > 1 && !receipt.pickupId)}
              onClick={() => void receive()}>{receipt.kind === 'incident' ? 'Registrar incidencia' : 'Registrar devolución'}</Button>
            <Button type="button" className="min-h-11" variant="outline" disabled={busy} onClick={() => setReceipt(null)}>Cancelar</Button>
          </div>
        </div>}
      </article>)}
    </section>}
    {camera && <BarcodeCameraScanner target="order" onClose={() => setCamera(false)} onScan={(code) => {
      setCamera(false); void search(code);
    }} />}
  </>;
}
