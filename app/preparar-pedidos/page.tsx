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
  Minus,
  Plus,
  RefreshCw,
  RotateCcw,
  ScanLine,
  ScanBarcode,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BarcodeCameraScanner } from '@/components/order-preparation/barcode-camera-scanner';
import { CustomerMessageDialog } from '@/components/dashboard/customer-message-dialog';
import {
  createDeliveryEmailDraft,
  updateDeliveryEmailDraft,
  type DeliveryEmailDraft,
} from '@/lib/delivery-message';
import { buildEmailLink, buildWhatsAppLink } from '@/lib/contact-links';
import { barcodeMatchesPreparationItem } from '@/lib/order-preparation-catalog';
import { fetchSessionUser } from '@/lib/dashboard-api';
import {
  beginAutomaticWork,
  cancelAutomaticWork,
  completeAutomaticWork,
  readAutomaticWork,
} from '@/lib/kpi-auto-timer';
import {
  reservationArticleCodeFromSku,
  reservationObservationFromShippingMethod,
  reservationSize,
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
  shippingMethod: string;
  items: PreparationItem[];
};
type PreparedOrder = {
  orderId: number;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  units: number;
  products: number;
  completedByName: string;
  completedAt: string;
  shippingMethod: string;
  hasReservation: boolean;
  treatment: string;
  wooStatus: string;
  carrier: string;
  trackingNumber: string;
  reservationSummary: string;
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
  const [preparedToday, setPreparedToday] = useState<PreparedOrder[]>([]);
  const [finishMessage, setFinishMessage] = useState('');
  const [cameraOpen, setCameraOpen] = useState(false);
  const [shippingDraft, setShippingDraft] = useState<DeliveryEmailDraft | null>(
    null,
  );
  const [markingSent, setMarkingSent] = useState(false);
  const [reopeningOrderId, setReopeningOrderId] = useState<number | null>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);
  const lastScanRef = useRef({ code: '', at: 0 });

  async function loadOrders() {
    setLoading(true);
    setError('');
    try {
      const data = await responseJson<{
        orders: PreparationOrder[];
        preparedToday: PreparedOrder[];
      }>(await fetch('/api/order-preparation', { cache: 'no-store' }));
      setOrders(data.orders);
      setPreparedToday(data.preparedToday || []);
      setFinalizedToday(data.preparedToday?.length || 0);
      const requestedOrder = new URLSearchParams(window.location.search)
        .get('order')
        ?.trim()
        .toUpperCase();
      if (requestedOrder) {
        setReference(requestedOrder);
        const match = data.orders.find(
          (order) => order.number.toUpperCase() === requestedOrder,
        );
        if (match) openOrder(match);
        window.history.replaceState({}, '', window.location.pathname);
      }
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
      barcodeMatchesPreparationItem(candidate.barcodes, code),
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
    updatePreparedUnits(item, current + 1);
  }

  function updatePreparedUnits(item: PreparationItem, nextValue: number) {
    if (!selectedOrder) return;
    const quantity = Math.min(item.quantity, Math.max(0, nextValue));
    const counts = { ...selectedCounts, [item.id]: quantity };
    setScanned((all) => ({ ...all, [selectedOrder.id]: counts }));
    window.localStorage.setItem(
      `paddytools:preparation:${selectedOrder.id}`,
      JSON.stringify(counts),
    );
  }

  function registerCameraScan(code: string) {
    setCameraOpen(false);
    registerScan(code);
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
        articleName: item.name,
        articleSku: item.sku,
        size: item.size === '—' ? '' : reservationSize(item.size),
        units,
        observations: reservationObservationFromShippingMethod(
          selectedOrder.shippingMethod,
        ),
        status: 'PARA PREPARAR',
        returnTo: `/preparar-pedidos?order=${encodeURIComponent(selectedOrder.number)}`,
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
      const { completion, routingMessage } = await responseJson<{
        completion: PreparedOrder;
        routingMessage: string;
      }>(
        await fetch('/api/order-preparation', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            orderId: selectedOrder.id,
            orderNumber: selectedOrder.number,
            customerName: selectedOrder.customer,
            units,
            products: selectedOrder.items.length,
          }),
        }),
      );
      let timeWarning = '';
      try {
        await completeAutomaticWork(PREPARATION_TIMER_KEY, {
          orders: 1,
          products: units,
          notes: `Pedido #${selectedOrder.number} finalizado`,
        });
      } catch {
        timeWarning = ' No se pudo guardar la medición KPI.';
      }
      setOrders((current) =>
        current.filter((order) => order.id !== selectedOrder.id),
      );
      setPreparedToday((current) => [completion, ...current]);
      setFinalizedToday((current) => current + 1);
      window.localStorage.removeItem(
        `paddytools:preparation:${selectedOrder.id}`,
      );
      setTimerStarted('');
      setSelectedOrderId(null);
      setFinishMessage(
        `Pedido #${selectedOrder.number} trasladado a Preparados. ${routingMessage}${timeWarning}`,
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

  function openShipping(order: PreparedOrder) {
    setFinishMessage('');
    setShippingDraft(
      createDeliveryEmailDraft({
        to: order.customerEmail,
        phone: order.customerPhone,
        customerName: order.customerName || 'cliente',
        recordKind: 'pedido',
        reference: order.orderNumber,
        school: '',
        delivery: 'domicilio',
      }),
    );
  }

  function openReservationNotice(order: PreparedOrder) {
    setFinishMessage('');
    setShippingDraft(
      createDeliveryEmailDraft({
        to: order.customerEmail,
        phone: order.customerPhone,
        customerName: order.customerName || 'cliente',
        recordKind: 'pedido',
        reference: order.orderNumber,
        school: '',
        delivery: 'reserva-pendiente',
        reservationSummary:
          order.reservationSummary || 'artículo pendiente en reserva',
      }),
    );
  }

  async function copyShippingMessage() {
    if (!shippingDraft) return;
    try {
      await navigator.clipboard.writeText(shippingDraft.body);
      setFinishMessage('Mensaje copiado.');
    } catch {
      setFinishMessage('No se pudo copiar el mensaje automáticamente.');
    }
  }

  function launchShippingEmail() {
    if (!shippingDraft) return;
    if (!shippingDraft.trackingNumber.trim()) {
      setFinishMessage('Escanea primero el número de seguimiento.');
      return;
    }
    const link = buildEmailLink(
      shippingDraft.to,
      shippingDraft.subject,
      shippingDraft.body,
    );
    if (!link) {
      setFinishMessage('El pedido no tiene un email válido.');
      return;
    }
    window.location.href = link;
  }

  function launchShippingWhatsApp() {
    if (!shippingDraft) return;
    if (!shippingDraft.trackingNumber.trim()) {
      setFinishMessage('Escanea primero el número de seguimiento.');
      return;
    }
    const link = buildWhatsAppLink(shippingDraft.phone, shippingDraft.body);
    if (!link) {
      setFinishMessage('El pedido no tiene un teléfono válido.');
      return;
    }
    window.location.href = link;
  }

  async function markShippingSent() {
    if (!shippingDraft || markingSent) return;
    if (!shippingDraft.trackingNumber.trim()) {
      setFinishMessage('Escanea primero el número de seguimiento.');
      return;
    }
    const prepared = preparedToday.find(
      (order) => order.orderNumber === shippingDraft.reference,
    );
    if (!prepared) return;
    setMarkingSent(true);
    try {
      const data = await responseJson<{
        completion: PreparedOrder;
        message: string;
      }>(
        await fetch('/api/order-preparation', {
          method: 'PUT',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            orderId: prepared.orderId,
            carrier: shippingDraft.carrier,
            trackingNumber: shippingDraft.trackingNumber,
          }),
        }),
      );
      setPreparedToday((current) =>
        current.map((order) =>
          order.orderId === data.completion.orderId ? data.completion : order,
        ),
      );
      setShippingDraft(null);
      setFinishMessage(data.message);
    } catch (sentError) {
      setFinishMessage(
        sentError instanceof Error
          ? sentError.message
          : 'No se pudo marcar el pedido como enviado.',
      );
    } finally {
      setMarkingSent(false);
    }
  }

  async function reopenPreparedOrder(order: PreparedOrder) {
    if (reopeningOrderId) return;
    if (
      !window.confirm(
        `¿Volver a abrir el pedido #${order.orderNumber}? Regresará a Pago aceptado y aparecerá otra vez en pendientes.`,
      )
    )
      return;
    setReopeningOrderId(order.orderId);
    setFinishMessage('');
    try {
      const data = await responseJson<{ message: string }>(
        await fetch('/api/order-preparation', {
          method: 'DELETE',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ orderId: order.orderId }),
        }),
      );
      setPreparedToday((current) =>
        current.filter((item) => item.orderId !== order.orderId),
      );
      setFinalizedToday((current) => Math.max(0, current - 1));
      await loadOrders();
      setFinishMessage(data.message);
    } catch (reopenError) {
      setFinishMessage(
        reopenError instanceof Error
          ? reopenError.message
          : 'No se pudo volver a abrir el pedido.',
      );
    } finally {
      setReopeningOrderId(null);
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
                <small>
                  {selectedOrder.shippingMethod ||
                    'Método de entrega no indicado'}
                </small>
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
              <Button
                type="button"
                variant="outline"
                className="camera-scan-button"
                onClick={() => setCameraOpen(true)}
              >
                <ScanBarcode /> Escanear con cámara
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
                          <small>preparadas</small>
                        </span>
                      </div>
                      <div
                        className="manual-preparation-controls"
                        aria-label={`Ajustar unidades preparadas de ${item.name}`}
                      >
                        <Button
                          type="button"
                          variant="outline"
                          aria-label={`Restar una unidad de ${item.name}`}
                          title="Restar una unidad preparada"
                          disabled={completed === 0}
                          onClick={() =>
                            updatePreparedUnits(item, completed - 1)
                          }
                        >
                          <Minus />
                        </Button>
                        <b>{completed}</b>
                        <Button
                          type="button"
                          variant="outline"
                          aria-label={`Sumar una unidad de ${item.name}`}
                          title="Sumar una unidad preparada"
                          disabled={completed >= item.quantity}
                          onClick={() =>
                            updatePreparedUnits(item, completed + 1)
                          }
                        >
                          <Plus />
                        </Button>
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
        {preparedToday.length > 0 && (
          <section className="prepared-orders">
            <header>
              <div>
                <span>PREPARADOS HOY</span>
                <h2>Pedidos finalizados</h2>
              </div>
              <strong>{preparedToday.length}</strong>
            </header>
            <div className="prepared-order-list">
              {preparedToday.map((order) => (
                <article key={order.orderId}>
                  <span>
                    <b>#{order.orderNumber}</b>
                    <small>{order.customerName || 'Cliente sin nombre'}</small>
                  </span>
                  <span>
                    <b>{order.units} uds.</b>
                    <small>{order.products} productos</small>
                  </span>
                  <span>
                    <b>{order.completedByName || 'PaddyTools'}</b>
                    <small>
                      {new Date(order.completedAt).toLocaleTimeString('es-ES', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </small>
                  </span>
                  <strong>
                    {order.treatment === 'school-ready'
                      ? 'Pedido preparado'
                      : order.treatment === 'store-ready'
                        ? 'Disponible en tienda'
                        : order.treatment === 'sent'
                          ? 'Enviado'
                          : order.hasReservation
                            ? 'Reserva · revisión manual'
                            : 'Revisión manual'}
                  </strong>
                  {order.treatment === 'manual-home-delivery' && (
                    <Button type="button" onClick={() => openShipping(order)}>
                      Gestionar envío
                    </Button>
                  )}
                  {order.treatment === 'manual-reservation' && (
                    <Button
                      type="button"
                      onClick={() => openReservationNotice(order)}
                    >
                      Avisar reserva
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    className="reopen-prepared-button"
                    disabled={reopeningOrderId === order.orderId}
                    onClick={() => void reopenPreparedOrder(order)}
                  >
                    <RotateCcw />
                    {reopeningOrderId === order.orderId
                      ? 'Reabriendo…'
                      : 'Volver a abrir'}
                  </Button>
                </article>
              ))}
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
      {cameraOpen && (
        <BarcodeCameraScanner
          onScan={registerCameraScan}
          onClose={() => setCameraOpen(false)}
        />
      )}
      <CustomerMessageDialog
        open={Boolean(shippingDraft)}
        draft={shippingDraft}
        onClose={() => setShippingDraft(null)}
        onChange={setShippingDraft}
        onGeneratedChange={(changes) =>
          setShippingDraft((current) =>
            current ? updateDeliveryEmailDraft(current, changes) : current,
          )
        }
        onCopy={() => void copyShippingMessage()}
        onWhatsApp={launchShippingWhatsApp}
        onEmail={launchShippingEmail}
        onMarkSent={() => void markShippingSent()}
        markingSent={markingSent}
      />
    </main>
  );
}
