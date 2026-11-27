'use client';

import { useRef, useState } from 'react';
import { ScanBarcode } from 'lucide-react';
import { BarcodeCameraScanner } from '@/components/order-preparation/barcode-camera-scanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

type OrderResult = {
  detail: { number: string; items: Array<{ id: number; name: string; size: string; sku: string; quantity: number }> };
  pickups: Array<{ id: string; incidentText: string; pickupDetails: string }>;
  canMarkIncident: boolean;
  hasIncident: boolean;
  canCreateIncident: boolean;
};
type Receipt = { itemId: number; kind: 'return' | 'incident'; pickupId: string; operationId: string; quantity: number; description: string };

export default function ReturnsPage() {
  const input = useRef<HTMLInputElement>(null);
  const [reference, setReference] = useState('');
  const [camera, setCamera] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [result, setResult] = useState<OrderResult | null>(null);
  const [receipt, setReceipt] = useState<Receipt | null>(null);

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
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo abrir el pedido.');
    } finally {
      setBusy(false);
    }
  }

  function select(itemId: number, kind: Receipt['kind']) {
    setNotice('');
    setReceipt({ itemId, kind, pickupId: '', quantity: 1, description: '', operationId: crypto.randomUUID() });
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
      onSubmit={(event) => { event.preventDefault(); void openOrder(reference); }}>
      <label htmlFor="return-order">QR o número de pedido</label>
      <div className="grid min-w-0 gap-2 sm:grid-cols-[1fr_auto_auto]">
        <Input id="return-order" ref={input} autoComplete="off" value={reference} disabled={busy}
          placeholder="Ej. PA51548" onChange={(event) => setReference(event.target.value)} />
        <Button type="submit" className="min-h-11" disabled={busy || !reference.trim()}>Abrir pedido</Button>
        <Button type="button" className="min-h-11" variant="outline" disabled={busy} onClick={() => setCamera(true)}>
          <ScanBarcode /> Escanear QR
        </Button>
      </div>
    </form>
    {notice && <p className="rounded-lg bg-white p-3" role="status">{notice}</p>}
    {result && <section className="grid gap-2 rounded-xl border bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-bold">Pedido {result.detail.number}</h1>
        <Button type="button" variant="outline" disabled={busy} onClick={() => {
          setResult(null); setReceipt(null); setNotice(''); input.current?.focus();
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
          {needsIncident && (result.canCreateIncident ? <label className="grid gap-1">
            ¿Qué ha pasado?
            <textarea className="min-h-24 w-full rounded-lg border bg-white p-2" maxLength={4000}
              value={receipt.description} disabled={busy}
              onChange={(event) => setReceipt({ ...receipt, description: event.target.value })} />
          </label> : <p>Tu usuario necesita permiso de Incidencias para darla de alta.</p>)}
          <div className="flex flex-wrap gap-2">
            <Button type="button" className="min-h-11" disabled={busy || (needsIncident && (!result.canCreateIncident || !receipt.description.trim())) || !Number.isSafeInteger(receipt.quantity) || receipt.quantity < 1 || receipt.quantity > item.quantity || (receipt.kind === 'incident' && result.pickups.length > 1 && !receipt.pickupId)}
              onClick={() => void receive()}>{receipt.kind === 'incident' ? 'Registrar incidencia' : 'Registrar devolución'}</Button>
            <Button type="button" className="min-h-11" variant="outline" disabled={busy} onClick={() => setReceipt(null)}>Cancelar</Button>
          </div>
        </div>}
      </article>)}
    </section>}
    {camera && <BarcodeCameraScanner target="order" onClose={() => setCamera(false)} onScan={(code) => {
      setCamera(false); void openOrder(code);
    }} />}
  </>;
}
