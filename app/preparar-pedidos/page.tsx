'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, CheckCircle2, ClipboardList, PackageCheck, RefreshCw, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchSessionUser } from '@/lib/dashboard-api';
import './preparar-pedidos.css';

type PreparationItem = { id: number; name: string; sku: string; quantity: number; size: string };
type PreparationOrder = { id: number; number: string; customer: string; dateCreated: string; total: string; items: PreparationItem[] };

async function responseJson<T>(response: Response) {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || 'No se pudo completar la consulta.');
  return data;
}

export default function PrepararPedidosPage() {
  const [reference, setReference] = useState('');
  const [orders, setOrders] = useState<PreparationOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadOrders() {
    setLoading(true);
    setError('');
    try {
      const data = await responseJson<{ orders: PreparationOrder[] }>(
        await fetch('/api/order-preparation', { cache: 'no-store' }),
      );
      setOrders(data.orders);
    } catch (loadError) {
      setOrders([]);
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los pedidos.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchSessionUser().then(() => loadOrders()).catch(() => window.location.assign('/login'));
  }, []);

  const visibleOrders = useMemo(() => {
    const term = reference.trim().toLowerCase();
    if (!term) return orders;
    return orders.filter((order) => order.number.toLowerCase().includes(term) || order.customer.toLowerCase().includes(term));
  }, [orders, reference]);
  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) || null,
    [orders, selectedOrderId],
  );

  function showOrder(event: FormEvent) {
    event.preventDefault();
    const value = reference.trim().toUpperCase();
    const match = orders.find((order) => order.number.toUpperCase() === value);
    if (match) setSelectedOrderId(match.id);
  }

  return (
    <main className="order-preparation-page">
      <header className="order-preparation-topbar">
        <a href="/"><img src="/paddy-logo-granate.png" alt="Paddy" /><span><strong>PaddyTools · Preparar pedidos</strong><small>Control de preparación</small></span></a>
        <div id="kpi-timer-slot" className="kpi-timer-slot" />
        <Button variant="outline" onClick={() => window.location.assign('/')}><ArrowLeft /> Gestión unificada</Button>
      </header>

      <section className="order-preparation-hero">
        <div><span>PREPARACIÓN</span><h1>Pedidos con pago aceptado</h1><p>La lista se carga automáticamente desde WooCommerce. Pulsa sobre un pedido para consultar todos los productos que contiene.</p></div>
        <PackageCheck />
      </section>

      <section className="order-preparation-shell">
        <form className="order-preparation-search" onSubmit={showOrder}>
          <div><span>LOCALIZAR PEDIDO</span><h2>Filtra o escanea el número del pedido</h2></div>
          <label>Pedido o cliente<Input value={reference} onChange={(event) => setReference(event.target.value)} placeholder="Ej. PA51548" autoCapitalize="characters" autoComplete="off" /></label>
          <Button type="submit" disabled={!reference.trim()}><ScanLine /> Mostrar productos</Button>
        </form>

        <div className="order-preparation-columns">
          <article><ClipboardList /><div><span>POR PREPARAR</span><strong>{orders.length} pedidos pendientes</strong><p>Cargados automáticamente desde Pago aceptado.</p></div></article>
          <article><PackageCheck /><div><span>EN PREPARACIÓN</span><strong>Trabajo en curso</strong><p>En el siguiente paso registraremos quién empieza cada pedido.</p></div></article>
          <article><CheckCircle2 /><div><span>PREPARADOS</span><strong>Finalizados hoy</strong><p>Quedará registrado cuándo se terminó y quién lo hizo.</p></div></article>
        </div>

        {selectedOrder ? (
          <section className="preparation-order-detail">
            <header>
              <Button variant="outline" onClick={() => setSelectedOrderId(null)}>
                <ArrowLeft /> Volver al listado
              </Button>
              <div>
                <span>PEDIDO EN PAGO ACEPTADO</span>
                <h2>#{selectedOrder.number}</h2>
                <p>{selectedOrder.customer || 'Cliente sin nombre'} · {selectedOrder.total}</p>
              </div>
              <div className="preparation-order-totals">
                <b>{selectedOrder.items.reduce((sum, item) => sum + item.quantity, 0)}</b>
                <small>unidades</small>
                <b>{selectedOrder.items.length}</b>
                <small>productos</small>
              </div>
            </header>
            <div className="preparation-product-list">
              {selectedOrder.items.map((item) => (
                <article key={item.id}>
                  <div><b>{item.name}</b><small>{item.sku} · Talla {item.size}</small></div>
                  <strong>{item.quantity} uds.</strong>
                </article>
              ))}
            </div>
          </section>
        ) : (
        <section className="accepted-orders">
          <header><div><span>WOOCOMMERCE · PAGO ACEPTADO</span><h2>Pedidos para preparar</h2></div><Button variant="outline" onClick={() => void loadOrders()} disabled={loading}><RefreshCw className={loading ? 'spin' : ''} /> Actualizar</Button></header>
          {error && <p className="order-preparation-error">{error}</p>}
          {loading && <p className="order-preparation-empty">Cargando pedidos de WooCommerce…</p>}
          {!loading && !error && !visibleOrders.length && <p className="order-preparation-empty">{reference.trim() ? 'No hay coincidencias con ese pedido o cliente.' : 'No hay pedidos en Pago aceptado.'}</p>}
          <div className="accepted-order-list">
            {visibleOrders.map((order) => {
              const units = order.items.reduce((sum, item) => sum + item.quantity, 0);
              return (
                <article key={order.id}>
                  <button className="accepted-order-summary" onClick={() => setSelectedOrderId(order.id)}>
                    <span><b>#{order.number}</b><small>{order.customer || 'Cliente sin nombre'}</small></span>
                    <span><b>{units} uds.</b><small>{order.items.length} productos</small></span>
                    <span><b>{order.total}</b><small>{order.dateCreated ? new Date(order.dateCreated).toLocaleString('es-ES') : 'Sin fecha'}</small></span>
                    <strong>Abrir pedido</strong>
                  </button>
                </article>
              );
            })}
          </div>
        </section>
        )}
      </section>
    </main>
  );
}
