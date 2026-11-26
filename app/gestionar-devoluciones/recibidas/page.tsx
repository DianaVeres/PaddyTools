'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { setRemoteReturnAttended } from '@/lib/dashboard-api';

type ReceivedReturn = { id: string; orderId: number; orderNumber: string; itemName: string; size: string; receivedAt: string };
type Status = { orderId: number; attended: boolean };
const receivedDate = new Intl.DateTimeFormat('es-ES', { dateStyle: 'short', timeZone: 'Europe/Madrid' });

export default function ReceivedReturnsPage() {
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<ReceivedReturn[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingOrder, setPendingOrder] = useState<number | null>(null);
  const [selected, setSelected] = useState<Status | null>(null);
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    void (async () => {
      try {
        const response = await fetch('/api/order-returns?page=' + page, { cache: 'no-store', signal: controller.signal });
        const data = await response.json() as { rows: ReceivedReturn[]; hasMore: boolean; error?: string };
        if (!response.ok) throw new Error(data.error);
        setRows(data.rows);
        setHasMore(data.hasMore);
      } catch (error) {
        if (!controller.signal.aborted) setNotice(error instanceof Error ? error.message : 'No se pudo cargar el registro.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [page]);

  async function showStatus(row: ReceivedReturn) {
    setPendingOrder(row.orderId);
    setNotice('');
    setSelected(null);
    try {
      const response = await fetch('/api/order-returns?statusOnly=1&order=' + encodeURIComponent(row.orderNumber), { cache: 'no-store' });
      const data = await response.json() as { detail: { id: number; returnAttended: boolean }; error?: string };
      if (!response.ok) throw new Error(data.error);
      if (data.detail.id !== row.orderId) throw new Error('El pedido de WooCommerce ya no coincide con el registro.');
      setSelected({ orderId: row.orderId, attended: data.detail.returnAttended });
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo consultar WooCommerce.');
    } finally {
      setPendingOrder(null);
    }
  }

  async function changeStatus(row: ReceivedReturn, attended: boolean) {
    setPendingOrder(row.orderId);
    setNotice('');
    try {
      const result = await setRemoteReturnAttended({ orderId: row.orderId, orderNumber: row.orderNumber, attended });
      setSelected({ orderId: row.orderId, attended: result });
      setNotice(result === attended ? 'Estado actualizado en WooCommerce.' : 'WooCommerce no confirmó el cambio solicitado.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No se pudo actualizar WooCommerce.');
    } finally {
      setPendingOrder(null);
    }
  }

  function changePage(nextPage: number) {
    setLoading(true);
    setNotice('');
    setSelected(null);
    setPage(nextPage);
  }

  return <section className="grid min-w-0 gap-3 rounded-xl border bg-white p-3">
    <h1 className="text-lg font-bold">Devoluciones recibidas</h1>
    {notice && <p role="status">{notice}</p>}
    {loading ? <p role="status">Cargando devoluciones…</p> : (
      !rows.length && !notice ? <p>Todavía no hay devoluciones recibidas.</p> : rows.map((row) => (
        <article className="grid min-w-0 gap-2 rounded-lg border p-3" key={row.id}>
          <a className="font-semibold underline underline-offset-4" href={'/?order=' + encodeURIComponent(row.orderNumber)}>
            Pedido {row.orderNumber}
          </a>
          <p className="break-words">{row.itemName} · Talla {row.size} · {receivedDate.format(new Date(row.receivedAt))}</p>
          {selected?.orderId === row.orderId ? <label className="flex min-h-11 items-center gap-2">
            <input type="checkbox" checked={selected.attended} disabled={pendingOrder !== null}
              onChange={(event) => void changeStatus(row, event.target.checked)} /> Devolución atendida
          </label> : <Button type="button" className="min-h-11 w-fit" variant="outline" disabled={pendingOrder !== null}
            onClick={() => void showStatus(row)}>{pendingOrder === row.orderId ? 'Consultando…' : 'Ver estado de atención'}</Button>}
        </article>
      ))
    )}
    {(page > 0 || hasMore) && <div className="flex flex-wrap gap-2">
      <Button type="button" variant="outline" disabled={loading || page === 0 || pendingOrder !== null} onClick={() => changePage(page - 1)}>Anterior</Button>
      <Button type="button" variant="outline" disabled={loading || !hasMore || pendingOrder !== null} onClick={() => changePage(page + 1)}>Siguiente</Button>
    </div>}
  </section>;
}
