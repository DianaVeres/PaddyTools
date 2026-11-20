'use client';

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  PackageCheck,
  RefreshCw,
  ScanLine,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetchSessionUser } from '@/lib/dashboard-api';
import {
  beginAutomaticWork,
  cancelAutomaticWork,
  completeAutomaticWork,
  readAutomaticWork,
} from '@/lib/kpi-auto-timer';
import {
  reservationArticleCodeFromSku,
  reservationPrefillStorageKey,
} from '@/lib/reservation-prefill';
import './preparar-pedidos.css';

const PREPARATION_TIMER_KEY = 'order-preparation';

type PreparationItem = {
  id: number;
  name: string;
  sku: string;
  quantity: number;
  size: string;
  barcodes: string[];
};
type PreparationOrder = {
  id: number;
  number: string;
  customer: string;
  phone: string;
  customerEmail: string;
  school: string;
  dateCreated: string;
  total: string;
  items: PreparationItem[];
};

async function responseJson<T>(response: Response) {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok)
    throw new Error(data.error || 'No se pudo completar la consulta.');
  return data;
}

export default function PrepararPedidosPage() {
  const [reference, setReference] = useState('');
  const [orders, setOrders] = useState<PreparationOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scanCode, setScanCode] = useState('');
  const [scanned, setScanned] = useState<
    Record<number, Record<number, number>>
  >({});
  const [scanAlert, setScanAlert] = useState('');
  const [timerStarted, setTimerStarted] = useState('');
  const [finishing, setFinishing] = useState(false);
  const [finalizedToday, setFinalizedToday] = useState(0);
  const [finishMessage, setFinishMessage] = useState('');
  const scanInputRef = useRef<HTMLInputElement>(null);
  const lastScanRef = useRef({ code: '', at: 0 });

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
      setError(
        loadError instanceof Error
          ? loadError.message
          : 'No se pudieron cargar los pedidos.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchSessionUser()
      .then(() => loadOrders())
      .catch(() => window.location.assign('/login'));
  }, []);

  const visibleOrders = useMemo(() => {
    const term = reference.trim().toLowerCase();
    if (!term) return orders;
    return orders.filter(
      (order) =>
        order.number.toLowerCase().includes(term) ||
        order.customer.toLowerCase().includes(term),
    );
  }, [orders, reference]);
  const selectedOrder = useMemo(
    () => orders.find((order) => order.id === selectedOrderId) || null,
    [orders, selectedOrderId],
  );
  const selectedCounts = selectedOrderId ? scanned[selectedOrderId] || {} : {};

  useEffect(() => {
    if (!selectedOrderId) return;
    const saved = window.localStorage.getItem(
      `paddytools:preparation:${selectedOrderId}`,
    );
    if (saved) {
      try {
        const counts = JSON.parse(saved) as Record<number, number>;
        setScanned((current) => ({ ...current, [selectedOrderId]: counts }));
      } catch {
        /* Si el dato local estaba dañado, el pedido empieza sin lecturas. */
      }
    }
    window.setTimeout(() => scanInputRef.current?.focus(), 80);
  }, [selectedOrderId]);

  function closeScanAlert() {
    setScanAlert('');
    window.setTimeout(() => scanInputRef.current?.focus(), 50);
  }

  function registerScan(rawCode: string) {
    if (!selectedOrder || scanAlert) return;
    const code = rawCode.trim().replace(/\s+/g, '').toUpperCase();
    setScanCode('');
    if (!code) return;
    const now = Date.now();
    if (lastScanRef.current.code === code && now - lastScanRef.current.at < 900)
      return;
    lastScanRef.current = { code, at: now };
    const item = selectedOrder.items.find((candidate) =>
      candidate.barcodes.includes(code),
    );
    if (!item) {
      setScanAlert('PRODUCTO ERRONEO');
      return;
    }
    const current = selectedCounts[item.id] || 0;
    if (current >= item.quantity) {
      setScanAlert('PRODUCTO YA COMPLETO');
      return;
    }
    const counts = { ...selectedCounts, [item.id]: current + 1 };
    setScanned((all) => ({ ...all, [selectedOrder.id]: counts }));
    window.localStorage.setItem(
      `paddytools:preparation:${selectedOrder.id}`,
      JSON.stringify(counts),
    );
  }

  function handleScanKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter' && event.key !== 'Tab') return;
    event.preventDefault();
    registerScan(scanCode);
  }

  function createReservation(item: PreparationItem, units: number) {
    if (!selectedOrder || units < 1) return;
    window.sessionStorage.setItem(
      reservationPrefillStorageKey,
      JSON.stringify({
        reference: selectedOrder.number,
        customerName: selectedOrder.customer,
        phone: selectedOrder.phone,
        customerEmail: selectedOrder.customerEmail,
        school: selectedOrder.school,
        articleCode: reservationArticleCodeFromSku(item.sku),
        size: item.size === '—' ? '' : item.size,
        units,
      }),
    );
    window.location.assign('/?createReservation=1');
  }

  function showOrder(event: FormEvent) {
    event.preventDefault();
    const value = reference.trim().toUpperCase();
    const match = orders.find((order) => order.number.toUpperCase() === value);
    if (match) openOrder(match);
  }

  function openOrder(order: PreparationOrder) {
    const context = `Pedido #${order.number}`;
    const existing = readAutomaticWork(PREPARATION_TIMER_KEY);
    if (existing && existing.context !== context)
      cancelAutomaticWork(PREPARATION_TIMER_KEY);
    const timer = beginAutomaticWork(
      PREPARATION_TIMER_KEY,
      'preparacion',
      context,
    );
    setTimerStarted(timer.startedIso);
    setFinishMessage('');
    setSelectedOrderId(order.id);
  }

  async function finishOrder() {
    if (!selectedOrder || finishing) return;
    setFinishing(true);
    setFinishMessage('');
    try {
      const units = selectedOrder.items.reduce(
        (sum, item) => sum + item.quantity,
        0,
      );
      await completeAutomaticWork(PREPARATION_TIMER_KEY, {
        orders: 1,
        products: units,
        notes: `Pedido #${selectedOrder.number} finalizado`,
      });
      setOrders((current) =>
        current.filter((order) => order.id !== selectedOrder.id),
      );
      setFinalizedToday((current) => current + 1);
      setTimerStarted('');
      setSelectedOrderId(null);
      setFinishMessage(
        `Pedido #${selectedOrder.number} finalizado y tiempo guardado.`,
      );
    } catch (finishError) {
      setFinishMessage(
        finishError instanceof Error
          ? finishError.message
          : 'No se pudo guardar el tiempo de preparación.',
      );
    } finally {
      setFinishing(false);
    }
  }

  return (
    <main className="order-preparation-page">
      <header className="order-preparation-topbar">
        <a href="/">
          <img src="/paddy-logo-granate.png" alt="Paddy" />
          <span>
            <strong>PaddyTools · Preparar pedidos</strong>
            <small>Control de preparación</small>
          </span>
        </a>
        <div id="kpi-timer-slot" className="kpi-timer-slot" />
        <Button variant="outline" onClick={() => window.location.assign('/')}>
          <ArrowLeft /> Gestión unificada
        </Button>
      </header>

      <section className="order-preparation-hero">
        <form className="order-preparation-search" onSubmit={showOrder}>
          <div>
            <span>LOCALIZAR PEDIDO</span>
            <h2>Filtra o escanea el número del pedido</h2>
          </div>
          <label>
            Pedido o cliente
            <Input
              value={reference}
              onChange={(event) => setReference(event.target.value)}
              placeholder="Ej. PA51548"
              autoCapitalize="characters"
              autoComplete="off"
            />
          </label>
          <Button type="submit" disabled={!reference.trim()}>
            <ScanLine /> Mostrar productos
          </Button>
        </form>
      </section>

      <section className="order-preparation-shell">
        <div className="order-preparation-columns">
          <article>
            <ClipboardList />
            <div>
              <span>POR PREPARAR</span>
              <strong>{orders.length} pedidos pendientes</strong>
            </div>
          </article>
          <article>
            <PackageCheck />
            <div>
              <span>EN PREPARACIÓN</span>
              <strong>Trabajo en curso</strong>
            </div>
          </article>
          <article>
            <CheckCircle2 />
            <div>
              <span>PREPARADOS</span>
              <strong>{finalizedToday} finalizados hoy</strong>
            </div>
          </article>
        </div>

        {selectedOrder ? (
          <section className="preparation-order-detail">
            <header>
              <Button
                variant="outline"
                onClick={() => setSelectedOrderId(null)}
              >
                <ArrowLeft /> Volver al listado
              </Button>
              <div>
                <span>PEDIDO EN PAGO ACEPTADO</span>
                <h2>#{selectedOrder.number}</h2>
                <p>
                  {selectedOrder.customer || 'Cliente sin nombre'} ·{' '}
                  {selectedOrder.total}
                </p>
              </div>
              <div className="preparation-order-totals">
                <b>
                  {selectedOrder.items.reduce(
                    (sum, item) => sum + item.quantity,
                    0,
                  )}
                </b>
                <small>unidades</small>
                <b>{selectedOrder.items.length}</b>
                <small>productos</small>
              </div>
            </header>
            <div className="preparation-finish-bar">
              <span>
                {timerStarted
                  ? `Medición automática activa desde ${new Date(timerStarted).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`
                  : 'Iniciando medición automática…'}
              </span>
              <Button onClick={() => void finishOrder()} disabled={finishing}>
                <CheckCircle2 />
                {finishing ? 'Finalizando…' : 'Finalizar pedido'}
              </Button>
            </div>
            <div className="preparation-scanner">
              <label htmlFor="product-barcode">
                <ScanLine />
                <span>
                  <b>Escanear productos</b>
                  <small>Lee cada código con el botón SCAN de la PDA.</small>
                </span>
              </label>
              <Input
                ref={scanInputRef}
                id="product-barcode"
                value={scanCode}
                onChange={(event) => setScanCode(event.target.value)}
                onKeyDown={handleScanKey}
                placeholder="Código de barras"
                autoComplete="off"
                inputMode="numeric"
              />
              <Button
                onClick={() => registerScan(scanCode)}
                disabled={!scanCode.trim()}
              >
                Añadir
              </Button>
            </div>
            <div className="preparation-product-list">
              {selectedOrder.items.map((item) => {
                const completed = selectedCounts[item.id] || 0;
                const remaining = Math.max(0, item.quantity - completed);
                return (
                  <article
                    key={item.id}
                    className={remaining === 0 ? 'complete' : 'incomplete'}
                  >
                    <div>
                      <b>{item.name}</b>
                      <small>
                        {item.sku} · Talla {item.size}
                      </small>
                    </div>
                    <div className="preparation-product-progress">
                      <div className="preparation-quantity">
                        <span>
                          <b>{remaining}</b>
                          <small>pendientes</small>
                        </span>
                        <span>
                          <b>
                            {completed}/{item.quantity}
                          </b>
                          <small>escaneadas</small>
                        </span>
                      </div>
                      {remaining > 0 && (
                        <Button
                          variant="outline"
                          onClick={() => createReservation(item, remaining)}
                        >
                          <CalendarDays /> Generar reserva
                        </Button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        ) : (
          <section className="accepted-orders">
            <header>
              <div>
                <span>WOOCOMMERCE · PAGO ACEPTADO</span>
                <h2>Pedidos para preparar</h2>
              </div>
              <Button
                variant="outline"
                onClick={() => void loadOrders()}
                disabled={loading}
              >
                <RefreshCw className={loading ? 'spin' : ''} /> Actualizar
              </Button>
            </header>
            {error && <p className="order-preparation-error">{error}</p>}
            {loading && (
              <p className="order-preparation-empty">
                Cargando pedidos de WooCommerce…
              </p>
            )}
            {!loading && !error && !visibleOrders.length && (
              <p className="order-preparation-empty">
                {reference.trim()
                  ? 'No hay coincidencias con ese pedido o cliente.'
                  : 'No hay pedidos en Pago aceptado.'}
              </p>
            )}
            <div className="accepted-order-list">
              {visibleOrders.map((order) => {
                const units = order.items.reduce(
                  (sum, item) => sum + item.quantity,
                  0,
                );
                return (
                  <article key={order.id}>
                    <button
                      className="accepted-order-summary"
                      onClick={() => openOrder(order)}
                    >
                      <span>
                        <b>#{order.number}</b>
                        <small>{order.customer || 'Cliente sin nombre'}</small>
                      </span>
                      <span>
                        <b>{units} uds.</b>
                        <small>{order.items.length} productos</small>
                      </span>
                      <span>
                        <b>{order.total}</b>
                        <small>
                          {order.dateCreated
                            ? new Date(order.dateCreated).toLocaleString(
                                'es-ES',
                              )
                            : 'Sin fecha'}
                        </small>
                      </span>
                      <strong>Abrir pedido</strong>
                    </button>
                  </article>
                );
              })}
            </div>
          </section>
        )}
        {finishMessage && (
          <p className="order-preparation-success">{finishMessage}</p>
        )}
      </section>
      {scanAlert && (
        <div
          className="preparation-alert"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="scan-alert-title"
        >
          <div>
            <ScanLine />
            <h2 id="scan-alert-title">{scanAlert}</h2>
            <p>
              {scanAlert === 'PRODUCTO ERRONEO'
                ? 'El código escaneado no pertenece a este pedido.'
                : 'Ya se han escaneado todas las unidades solicitadas de este producto.'}
            </p>
            <Button autoFocus onClick={closeScanAlert}>
              OK
            </Button>
          </div>
        </div>
      )}
    </main>
  );
}
