'use client';

import {
  FormEvent,
  PointerEvent as ReactPointerEvent,
  CSSProperties,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  AlertTriangle,
  Archive,
  CalendarDays,
  Check,
  ChevronRight,
  CircleUserRound,
  ClipboardList,
  ExternalLink,
  FileText,
  LogOut,
  Mail,
  MessageSquarePlus,
  PackageCheck,
  Phone,
  Printer,
  RefreshCw,
  Search,
  Shirt,
  ShoppingBag,
  Tag,
  Truck,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type Modal =
  | 'incidencia'
  | 'reserva'
  | 'registro'
  | 'reservas'
  | 'recogidas'
  | 'detalle-incidencia'
  | 'reserva-creada'
  | 'email'
  | null;
type Order = {
  id: number;
  number: string;
  status: string;
  statusLabel: string;
  dateCreated: string;
  dateModified: string;
  total: string;
  payment: string;
  transactionId: string;
  returnAttended: boolean;
  shippingMethod: string;
  wooUrl: string;
  movements: Array<{
    id: number;
    author: string;
    date: string;
    text: string;
    customerVisible: boolean;
  }>;
  customer: { name: string; phone: string; email: string; address: string };
  items: Array<{
    id: number;
    name: string;
    sku: string;
    quantity: number;
    size: string;
    total: string;
  }>;
};
type Shipment = {
  order: string;
  date: string;
  school: string;
  box: string;
  file: string;
};
type Incident = {
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  incidentText: string;
  observations: string;
  incidentDate: string;
  solved: boolean;
  solvedAt: string;
  updatedAt: string;
  pickupSchool: boolean;
  pickupSchoolName: string;
  pickupDetails: string;
  pickupReceived: boolean;
  pickupReceivedAt: string;
  school: string;
  recurrenceCount: number;
  products: unknown[];
};
type MondayRecord = {
  id: string;
  kind: 'reserva' | 'prenda';
  board: string;
  reference: string;
  customer: string;
  phone: string;
  customerEmail: string;
  school: string;
  date: string;
  article: string;
  articleDescription: string;
  code: string;
  size: string;
  units: string;
  sentUnits?: string;
  pending: string;
  paid: string;
  status: string;
  observations: string;
  specialDetails: string;
  articleIds?: string[];
  customerIds?: string[];
  endDate?: string;
  productionDate?: string;
  estimatedProduction?: string;
  formula?: string;
  updatedAt: string;
};
type DeliveryEmailKind = 'colegio' | 'domicilio' | 'tienda';
type EmailDraft = {
  to: string;
  phone: string;
  subject: string;
  body: string;
  delivery: DeliveryEmailKind;
  carrier: 'viaxpress' | 'dhl';
  trackingNumber: string;
  customerName: string;
  recordKind: 'pedido' | 'reserva';
  reference: string;
  school: string;
};
type IncidentDraft = {
  date: string;
  school: string;
  text: string;
  customerEmail: string;
  observations: string;
  pickup: boolean;
  pickupSchool: string;
  pickupNotes: string;
  recurrence: boolean;
  solved: boolean;
  pickupItems: Record<
    number,
    { selected: boolean; size: string; units: number }
  >;
};
type SchoolProduct = { id: number; name: string; sku: string };
type StoreTicket = {
  number: string;
  date: string;
  customer: string;
  store: string;
  operator: string;
  total: string;
  payment: string;
  items: Array<{
    name?: string;
    article?: string;
    size?: string;
    color?: string;
    units?: number;
    price?: string;
    total?: string;
  }>;
  syncedAt: number;
};
type ReservationDraft = {
  reference: string;
  customerId: string;
  customerName: string;
  phone: string;
  customerEmail: string;
  school: string;
  date: string;
  articleId: string;
  size: string;
  units: number;
  sentUnits: number;
  pending: number;
  paid: string;
  observations: string;
  status: string;
  endDate: string;
  productionDate: string;
  estimatedProduction: string;
  formula: string;
};
type ReservationOptions = {
  customers: Array<{
    id: string;
    name: string;
    phone: string;
    email: string;
    school: string;
  }>;
  articles: Array<{ id: string; code: string; description: string }>;
  schools: string[];
  paid: string[];
  observations: string[];
  status: string[];
};
type OrderNote = {
  id: string;
  orderNumber: string;
  kind: 'nota' | 'llamada' | 'email';
  content: string;
  authorEmail?: string | null;
  authorName?: string | null;
  createdAt: string;
};
type SessionUser = { email: string; displayName: string };
const fmt = (date: string) =>
  new Intl.DateTimeFormat('es-ES', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
const folded = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();

function printStandaloneLabel(lines: string[]) {
  const escapeHtml = (value: string) =>
    value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  const sizeFor = (text: string) =>
    text.length > 46 ? 11 : text.length > 40 ? 12.5 : text.length > 34 ? 14.5 : 17;
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.position = 'fixed';
  frame.style.width = '0';
  frame.style.height = '0';
  frame.style.border = '0';
  frame.style.right = '0';
  frame.style.bottom = '0';
  document.body.appendChild(frame);
  const labelDocument = frame.contentDocument;
  if (!labelDocument) {
    frame.remove();
    return;
  }
  const rows = lines
    .map(
      (line, index) =>
        `<p class="line-${index + 1}" style="font-size:${sizeFor(line)}pt">${escapeHtml(line.toUpperCase())}</p>`,
    )
    .join('');
  labelDocument.open();
  labelDocument.write(`<!doctype html><html><head><meta charset="utf-8"><title></title><style>
    @page { size: 150mm 100mm; margin: 0; }
    html, body { width: 150mm; height: 100mm; margin: 0; padding: 0; overflow: hidden; }
    body { background: #fff; color: #000; font-family: Arial, Helvetica, sans-serif; font-weight: 700; }
    .label { position: relative; width: 150mm; height: 100mm; overflow: hidden; }
    p { position: absolute; left: 15mm; width: 120mm; margin: 0; line-height: 1; white-space: nowrap; font-weight: 700; }
    .line-1 { bottom: 75mm; }
    .line-2 { bottom: 62mm; }
    .line-3 { bottom: 49mm; }
    .line-4 { bottom: 36mm; }
  </style></head><body><article class="label">${rows}</article></body></html>`);
  labelDocument.close();
  const cleanup = () => setTimeout(() => frame.remove(), 500);
  setTimeout(() => {
    const labelWindow = frame.contentWindow;
    if (!labelWindow) return cleanup();
    labelWindow.addEventListener('afterprint', cleanup, { once: true });
    labelWindow.focus();
    labelWindow.print();
  }, 150);
  setTimeout(() => frame.isConnected && frame.remove(), 60000);
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function SourceBadge({
  color,
  children,
  active = true,
}: {
  color: string;
  children: React.ReactNode;
  active?: boolean;
}) {
  return (
    <span className="source-badge" style={{ opacity: active ? 1 : 0.62 }}>
      <i style={{ background: color }} />
      {children}
      {active && <Check size={13} />}
    </span>
  );
}

export default function Home() {
  const today = new Date().toLocaleDateString('en-CA');
  const [query, setQuery] = useState('');
  const [order, setOrder] = useState<Order | null>(null);
  const [incident, setIncident] = useState<Incident | null>(null);
  const [mondayRecords, setMondayRecords] = useState<MondayRecord[]>([]);
  const [ticket, setTicket] = useState<StoreTicket | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<Modal>(null);
  const [saved, setSaved] = useState('');
  const [returnUpdating, setReturnUpdating] = useState(false);
  const [reservationDialogOffset, setReservationDialogOffset] = useState({ x: 0, y: 0 });
  const reservationDrag = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
  } | null>(null);

  function startReservationDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (window.innerWidth < 768 || event.button !== 0) return;
    const dialog = event.currentTarget.closest('[data-slot="dialog-content"]');
    if (!(dialog instanceof HTMLElement)) return;
    const rect = dialog.getBoundingClientRect();
    reservationDrag.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: reservationDialogOffset.x,
      originY: reservationDialogOffset.y,
      minX: reservationDialogOffset.x - rect.left + 12,
      maxX: reservationDialogOffset.x + window.innerWidth - rect.right - 12,
      minY: reservationDialogOffset.y - rect.top + 12,
      maxY: reservationDialogOffset.y + window.innerHeight - rect.bottom - 12,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function moveReservationDialog(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = reservationDrag.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setReservationDialogOffset({
      x: Math.min(drag.maxX, Math.max(drag.minX, drag.originX + event.clientX - drag.startX)),
      y: Math.min(drag.maxY, Math.max(drag.minY, drag.originY + event.clientY - drag.startY)),
    });
  }

  function stopReservationDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (reservationDrag.current?.pointerId === event.pointerId)
      reservationDrag.current = null;
  }
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    void fetch('/api/auth/session')
      .then(async (response) => {
        if (!response.ok) throw new Error('Sesión no válida');
        const data = await response.json() as { user: SessionUser };
        setSessionUser(data.user);
      })
      .catch(() => window.location.assign('/login'));
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.assign('/login');
  }

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('cleanup') !== 'f8626767-5497-41dd-8d0a-cc43668155d8') return;
    void fetch('/api/monday?maintenance=f8626767-5497-41dd-8d0a-cc43668155d8')
      .then(async (response) => {
        const result = (await response.json()) as { removed?: boolean; message?: string; error?: string };
        if (!response.ok) throw new Error(result.error || 'No se pudo eliminar la columna ETIQUETA.');
        setSaved(result.removed ? 'Columna ETIQUETA eliminada de Monday.' : result.message || 'La columna ETIQUETA ya no existe.');
      })
      .catch((error) => setSaved(error instanceof Error ? error.message : 'No se pudo eliminar la columna ETIQUETA.'));
  }, []);
  const [shipments, setShipments] = useState<Shipment[] | null>(null);
  const [shippingLoading, setShippingLoading] = useState(false);
  const [shippingOpen, setShippingOpen] = useState(false);
  const [shippingReference, setShippingReference] = useState('');
  const [incidentDraft, setIncidentDraft] = useState<IncidentDraft>({
    date: today,
    school: '',
    text: '',
    customerEmail: '',
    observations: '',
    pickup: false,
    pickupSchool: '',
    pickupNotes: '',
    recurrence: false,
    solved: false,
    pickupItems: {},
  });
  const [schoolOptions, setSchoolOptions] = useState<string[]>([]);
  const [pickupProducts, setPickupProducts] = useState<SchoolProduct[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [productsError, setProductsError] = useState('');
  const [reservationDraft, setReservationDraft] = useState<ReservationDraft>({
    reference: '',
    customerId: '',
    customerName: '',
    phone: '',
    customerEmail: '',
    school: '',
    date: today,
    articleId: '',
    size: '',
    units: 1,
    sentUnits: 0,
    pending: 0,
    paid: 'SÍ',
    observations: 'ENTREGA COLEGIO',
    status: '',
    endDate: '',
    productionDate: '',
    estimatedProduction: '',
    formula: '',
  });
  const [reservationOptions, setReservationOptions] =
    useState<ReservationOptions | null>(null);
  const [newReservationCustomer, setNewReservationCustomer] = useState(false);
  const [reservationLoading, setReservationLoading] = useState(false);
  const [reservationSaving, setReservationSaving] = useState(false);
  const [reservationRows, setReservationRows] = useState<MondayRecord[]>([]);
  const [reservationsLoading, setReservationsLoading] = useState(false);
  const [editingReservationId, setEditingReservationId] = useState('');
  const [registryRows, setRegistryRows] = useState<Incident[]>([]);
  const [registryLoading, setRegistryLoading] = useState(false);
  const [registryFilter, setRegistryFilter] = useState('');
  const [showReceivedPickups, setShowReceivedPickups] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(
    null,
  );
  const [printIncident, setPrintIncident] = useState<Incident | null>(null);
  const [printMode, setPrintMode] = useState<'document' | 'label'>('document');
  const [createdReservation, setCreatedReservation] =
    useState<MondayRecord | null>(null);
  const [printReservation, setPrintReservation] = useState<MondayRecord | null>(
    null,
  );
  const [reservationPrintMode, setReservationPrintMode] = useState<
    'card' | 'label'
  >('card');
  const [orderNotes, setOrderNotes] = useState<OrderNote[]>([]);
  const [notesLoading, setNotesLoading] = useState(false);
  const [noteKind, setNoteKind] = useState<OrderNote['kind']>('nota');
  const [noteDraft, setNoteDraft] = useState('');
  const [emailDraft, setEmailDraft] = useState<EmailDraft | null>(null);
  const normalized = useMemo(() => query.trim().replace(/^#/, ''), [query]);
  const linkedOrderNumber = useMemo(() => {
    const match = normalized.match(/^(?:I|R)?PA(.+)$/i);
    return match ? `PA${match[1]}` : normalized;
  }, [normalized]);
  const reservationArticles = useMemo(() => {
    const school = folded(reservationDraft.school);
    return school
      ? reservationOptions?.articles.filter((item) =>
          folded(item.description).includes(school),
        ) || []
      : [];
  }, [reservationDraft.school, reservationOptions]);

  // Genera el texto con los campos actuales para poder cambiar el tipo de
  // entrega, transportista, número de envío o colegio antes de abrir el correo.
  function emailBody(draft: EmailDraft) {
    if (draft.delivery === 'colegio') {
      return `Hola ${draft.customerName}. IMPORTANTE: su ${draft.recordKind} ${draft.reference} YA ESTÁ EN EL COLEGIO ${draft.school}. YA PUEDE IR AL COLEGIO A RECOGERLO. Gracias, un saludo.`;
    }
    if (draft.delivery === 'tienda') {
      return `Hola ${draft.customerName}, le comunicamos que ya tenemos su ${draft.recordKind} ${draft.reference} disponible para recoger en nuestra tienda de Paddy. Recuerde que ya estamos en el horario habitual (Mañanas de Lunes a Viernes de 10.00 a 14.00 y Tardes sólo Martes y Jueves de 15.00 a 19.00). Puede pasar cuando quiera a recogerlo. Gracias, un saludo`;
    }
    const trackingUrl = draft.carrier === 'dhl'
      ? 'https://www.dhl.com/'
      : 'https://viaxpress.es/envios/';
    return `Su pedido está preparado para ser enviado. El número de envío es ${draft.trackingNumber || '[Nº ENVÍO]'}. Podrá hacer el seguimiento en el siguiente enlace: ${trackingUrl}`;
  }

  function openEmailComposer(input: Omit<EmailDraft, 'subject' | 'body' | 'carrier' | 'trackingNumber'>) {
    const draft: EmailDraft = {
      ...input,
      carrier: 'viaxpress',
      trackingNumber: '',
      subject: `${input.recordKind === 'reserva' ? 'Reserva' : 'Pedido'} ${input.reference} preparado`,
      body: '',
    };
    setEmailDraft({ ...draft, body: emailBody(draft) });
    setModal('email');
    setSaved('');
  }

  function updateGeneratedEmail(changes: Partial<EmailDraft>) {
    setEmailDraft((current) => {
      if (!current) return current;
      const next = { ...current, ...changes };
      return { ...next, body: emailBody(next) };
    });
  }

  async function openOrderEmail() {
    if (!order) return;
    const method = folded(order.shippingMethod);
    const delivery: DeliveryEmailKind = method.includes('colegio')
      ? 'colegio'
      : method.includes('recog') || method.includes('tienda')
        ? 'tienda'
        : 'domicilio';
    const linkedReservation = mondayRecords.find((record) => record.kind === 'reserva');
    let school = linkedReservation?.school || '';
    // En los pedidos de colegio, PackingList es la fuente principal del colegio.
    if (delivery === 'colegio' && !school) {
      try {
        const response = await fetch(`/api/shipping?order=${encodeURIComponent(order.number)}`, { cache: 'no-store' });
        const data = await response.json() as { matches?: Shipment[] };
        school = data.matches?.[0]?.school || '';
      } catch {
        // El colegio seguirá siendo editable si PackingList no responde.
      }
    }
    openEmailComposer({
      to: order.customer.email,
      phone: order.customer.phone,
      customerName: order.customer.name || 'cliente',
      recordKind: 'pedido',
      reference: order.number,
      school,
      delivery,
    });
  }

  function openReservationEmail(record: MondayRecord) {
    const observation = folded(record.observations);
    const delivery: DeliveryEmailKind = observation.includes('colegio')
      ? 'colegio'
      : observation.includes('domicilio')
        ? 'domicilio'
        : 'tienda';
    openEmailComposer({
      to: record.customerEmail || '',
      phone: record.phone || '',
      customerName: record.customer || 'cliente',
      recordKind: 'reserva',
      reference: record.reference || record.id,
      school: record.school || '',
      delivery,
    });
  }

  async function copyEmailText() {
    if (!emailDraft) return;
    try {
      await navigator.clipboard.writeText(emailDraft.body);
      setSaved('Texto del email copiado.');
    } catch {
      setSaved('No se pudo copiar automáticamente. Puedes seleccionar el texto en el cuadro.');
    }
  }

  function launchEmail() {
    if (!emailDraft) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailDraft.to.trim())) {
      setSaved('Indica un email válido del cliente.');
      return;
    }
    const params = new URLSearchParams({ subject: emailDraft.subject, body: emailDraft.body });
    window.location.href = `mailto:${emailDraft.to.trim()}?${params.toString()}`;
  }

  function launchWhatsApp() {
    if (!emailDraft) return;
    let phone = emailDraft.phone.replace(/\D/g, '');
    if (phone.startsWith('00')) phone = phone.slice(2);
    if (phone.length === 9) phone = `34${phone}`;
    if (phone.length < 11) {
      setSaved('Indica un teléfono válido del cliente, incluyendo el prefijo si no es español.');
      return;
    }
    window.location.href = `https://wa.me/${phone}?text=${encodeURIComponent(emailDraft.body)}`;
  }
  async function search(event?: FormEvent) {
    event?.preventDefault();
    if (!normalized) {
      setError('Introduce un número de pedido.');
      return;
    }
    setLoading(true);
    setError('');
    setSaved('');
    setOrder(null);
    setIncident(null);
    setMondayRecords([]);
    setTicket(null);
    try {
      const isWooOrder = /^PA/i.test(linkedOrderNumber);
      const [wooResponse, incidentResponse, mondayResponse, ticketResponse] =
        await Promise.all([
          isWooOrder
            ? fetch(
                `/api/search?number=${encodeURIComponent(linkedOrderNumber)}`,
                {
                  cache: 'no-store',
                },
              )
            : Promise.resolve(null),
          fetch(
            `/api/incidents?number=${encodeURIComponent(linkedOrderNumber)}`,
            {
              cache: 'no-store',
            },
          ),
          fetch(`/api/monday?number=${encodeURIComponent(linkedOrderNumber)}`, {
            cache: 'no-store',
          }),
          fetch(`/api/tickets?number=${encodeURIComponent(normalized)}`, {
            cache: 'no-store',
          }),
        ]);
      const wooData = wooResponse
        ? ((await wooResponse.json()) as Order & { error?: string })
        : null;
      const incidentData = (await incidentResponse.json()) as {
        found?: boolean;
        incident?: Incident;
        error?: string;
      };
      const mondayData = (await mondayResponse.json()) as {
        found?: boolean;
        records?: MondayRecord[];
        error?: string;
      };
      const ticketData = (await ticketResponse.json()) as {
        found?: boolean;
        ticket?: StoreTicket;
        error?: string;
      };
      if (wooResponse?.ok && wooData) setOrder(wooData);
      if (incidentResponse.ok && incidentData.found)
        setIncident(incidentData.incident || null);
      if (mondayResponse.ok) setMondayRecords(mondayData.records || []);
      if (ticketResponse.ok && ticketData.found)
        setTicket(ticketData.ticket || null);
      if (
        (!wooResponse || !wooResponse.ok) &&
        !incidentData.found &&
        !mondayData.found &&
        !ticketData.found
      )
        setError(
          isWooOrder
            ? [wooData?.error, incidentData.error, mondayData.error]
                .filter(Boolean)
                .join(' · ') ||
                'No se encontró información para este número de pedido.'
            : `El ticket ${normalized} todavía no está sincronizado desde DetallWPF. Abre Reimpresión de Ticket, selecciónalo y ejecuta “sincronizar-ticket-actual.cmd”.`,
        );
    } catch {
      setError('No se pudo conectar con los registros. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }
  async function loadOrderNotes(orderNumber: string) {
    setNotesLoading(true);
    try {
      const response = await fetch(
        `/api/order-notes?number=${encodeURIComponent(orderNumber)}`,
        { cache: 'no-store' },
      );
      const data = (await response.json()) as {
        notes?: OrderNote[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error);
      setOrderNotes(data.notes || []);
    } catch (error) {
      setOrderNotes([]);
      setSaved(
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar las notas.',
      );
    } finally {
      setNotesLoading(false);
    }
  }
  async function updateReturnAttended(attended: boolean) {
    if (!order || returnUpdating) return;
    setReturnUpdating(true);
    setSaved('');
    try {
      const response = await fetch('/api/return-attended', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          orderNumber: order.number,
          attended,
        }),
      });
      const data = (await response.json()) as {
        returnAttended?: boolean;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error || 'No se pudo actualizar la devolución.');
      setOrder((current) => current ? { ...current, returnAttended: Boolean(data.returnAttended) } : current);
      setSaved(attended ? 'Devolución marcada como atendida en WooCommerce.' : 'Devolución marcada como pendiente en WooCommerce.');
    } catch (error) {
      setSaved(error instanceof Error ? error.message : 'No se pudo actualizar la devolución.');
    } finally {
      setReturnUpdating(false);
    }
  }
  async function saveOrderNote() {
    if (!order || !noteDraft.trim()) {
      setSaved('Escribe una nota antes de guardarla.');
      return;
    }
    try {
      const response = await fetch('/api/order-notes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          orderNumber: order.number,
          kind: noteKind,
          content: noteDraft,
        }),
      });
      const data = (await response.json()) as {
        note?: OrderNote;
        error?: string;
      };
      if (!response.ok || !data.note)
        throw new Error(data.error || 'No se pudo guardar la nota.');
      setOrderNotes((notes) => [data.note!, ...notes]);
      setNoteDraft('');
      setSaved('Nota guardada en el pedido.');
    } catch (error) {
      setSaved(
        error instanceof Error ? error.message : 'No se pudo guardar la nota.',
      );
    }
  }
  useEffect(() => {
    if (order?.number) void loadOrderNotes(order.number);
    else setOrderNotes([]);
  }, [order?.number]);
  function openIncident() {
    const school =
      incident?.school ||
      incident?.pickupSchoolName ||
      mondayRecords[0]?.school ||
      '';
    const pickupSchool = incident?.pickupSchoolName || school;
    setIncidentDraft({
      date: incident?.incidentDate?.slice(0, 10) || today,
      school,
      text: incident?.incidentText || '',
      customerEmail: order?.customer.email || incident?.customerEmail || '',
      observations: incident?.observations || '',
      pickup: incident?.pickupSchool || false,
      pickupSchool,
      pickupNotes: incident?.pickupDetails || '',
      recurrence: false,
      solved: incident?.solved || false,
      pickupItems: {},
    });
    setModal('incidencia');
    if (!schoolOptions.length)
      void fetch('/api/schools')
        .then((response) => response.json())
        .then((data) => Array.isArray(data) && setSchoolOptions(data));
    if (incident?.pickupSchool && pickupSchool)
      void loadPickupProducts(pickupSchool);
  }
  async function openReservation(existing?: MondayRecord) {
    setReservationDialogOffset({ x: 0, y: 0 });
    setModal('reserva');
    setEditingReservationId(existing?.id || '');
    setNewReservationCustomer(false);
    const customerName =
      existing?.customer ||
      order?.customer.name ||
      incident?.customerName ||
      mondayRecords[0]?.customer ||
      '';
    const sourcePhone =
      existing?.phone ||
      order?.customer.phone ||
      incident?.customerPhone ||
      mondayRecords[0]?.phone ||
      '';
    const sourceCustomerEmail =
      existing?.customerEmail ||
      order?.customer.email ||
      incident?.customerEmail ||
      '';
    const knownCustomer = reservationOptions?.customers.find(
      (item) => folded(item.name) === folded(customerName),
    );
    const phone = sourcePhone || knownCustomer?.phone || '';
    const customerEmail = sourceCustomerEmail || knownCustomer?.email || '';
    const school =
      existing?.school ||
      mondayRecords[0]?.school ||
      knownCustomer?.school ||
      '';
    setReservationDraft((current) => ({
      ...current,
      reference:
        existing?.reference ||
        order?.number ||
        incident?.orderNumber ||
        mondayRecords[0]?.reference ||
        '',
      customerId: knownCustomer?.id || '',
      customerName,
      phone,
      customerEmail,
      school,
      date: existing?.date || today,
      articleId: existing?.articleIds?.[0] || '',
      size: existing?.size || '',
      units: Number(existing?.units) || 1,
      sentUnits: Number(existing?.sentUnits) || 0,
      pending: Number(existing?.pending) || 0,
      paid: existing?.paid || 'SÍ',
      observations: existing?.observations || 'ENTREGA COLEGIO',
      status: existing?.status || '',
      endDate: existing?.endDate || '',
      productionDate: existing?.productionDate || '',
      estimatedProduction: existing?.estimatedProduction || '',
      formula: existing?.formula || '',
    }));
    if (reservationOptions) return;
    setReservationLoading(true);
    try {
      const response = await fetch('/api/monday?mode=reservation-options', {
        cache: 'no-store',
      });
      const data = (await response.json()) as ReservationOptions & {
        error?: string;
      };
      if (!response.ok) throw new Error(data.error);
      setReservationOptions(data);
      const customer = data.customers.find(
        (item) => folded(item.name) === folded(customerName),
      );
      setReservationDraft((current) => ({
        ...current,
        customerId: customer?.id || '',
        customerName,
        phone: sourcePhone || customer?.phone || '',
        customerEmail: sourceCustomerEmail || customer?.email || '',
        school:
          existing?.school ||
          mondayRecords[0]?.school ||
          customer?.school ||
          '',
        date: existing?.date || today,
        articleId: existing?.articleIds?.[0] || '',
      }));
    } catch (error) {
      setSaved(
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar las opciones de Monday.',
      );
    } finally {
      setReservationLoading(false);
    }
  }
  async function openReservations() {
    setModal('reservas');
    setRegistryFilter('');
    setReservationsLoading(true);
    try {
      const response = await fetch('/api/monday?mode=reservations', { cache: 'no-store' });
      const data = (await response.json()) as { records?: MondayRecord[]; error?: string };
      if (!response.ok) throw new Error(data.error);
      setReservationRows(data.records || []);
    } catch (error) {
      setReservationRows([]);
      setSaved(error instanceof Error ? error.message : 'No se pudieron cargar las reservas.');
    } finally {
      setReservationsLoading(false);
    }
  }
  async function loadPickupProducts(school: string) {
    setPickupProducts([]);
    setProductsError('');
    if (!school) return;
    setProductsLoading(true);
    try {
      const response = await fetch(
        `/api/school-products?school=${encodeURIComponent(school)}`,
        { cache: 'no-store' },
      );
      const data = (await response.json()) as SchoolProduct[] & {
        error?: string;
      };
      if (!response.ok)
        throw new Error(data.error || 'No se pudieron cargar los productos.');
      setPickupProducts(Array.isArray(data) ? data : []);
    } catch (error) {
      setProductsError(
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar los productos.',
      );
    } finally {
      setProductsLoading(false);
    }
  }
  async function save(kind: 'incidencia' | 'reserva', forceSolved = false) {
    const rawReference =
      kind === 'reserva'
        ? reservationDraft.reference
        : order?.number || incident?.orderNumber || mondayRecords[0]?.reference;
    const linkedMatch = rawReference?.match(/^(?:I|R)?PA(.+)$/i);
    const reference = linkedMatch ? `PA${linkedMatch[1]}` : rawReference;
    if (!reference) return;
    if (kind === 'reserva' && reservationSaving) return;
    try {
      const customerName =
        order?.customer.name ||
        incident?.customerName ||
        mondayRecords[0]?.customer ||
        '';
      const phone =
        order?.customer.phone ||
        incident?.customerPhone ||
        mondayRecords[0]?.phone ||
        '';
      let response: Response;
      if (kind === 'incidencia') {
        if (
          !incidentDraft.date ||
          !incidentDraft.school.trim() ||
          !incidentDraft.text.trim()
        ) {
          setSaved(
            !incidentDraft.date
              ? 'Indica la fecha de recepción.'
              : !incidentDraft.school.trim()
                ? 'Selecciona el colegio de la incidencia.'
                : 'Describe la incidencia antes de guardar.',
          );
          return;
        }
        const selected = pickupProducts
          .filter((item) => incidentDraft.pickupItems[item.id]?.selected)
          .map((item) => {
            const pick = incidentDraft.pickupItems[item.id];
            return `- ${item.name} | Talla: ${pick.size} | Unidades: ${pick.units || 1}`;
          });
        if (
          incidentDraft.pickup &&
          (!incidentDraft.pickupSchool.trim() || !selected.length)
        ) {
          setSaved(
            !incidentDraft.pickupSchool.trim()
              ? 'Selecciona el colegio de recogida.'
              : 'Selecciona al menos un producto para recoger.',
          );
          return;
        }
        const pickupDetails = [
          ...selected,
          incidentDraft.pickupNotes &&
            `Observaciones: ${incidentDraft.pickupNotes}`,
        ]
          .filter(Boolean)
          .join('\n');
        response = await fetch('/api/incidents', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            order_number: /^I/i.test(reference) ? reference : `I${reference}`,
            order_id: order?.id || '',
            customer_name: customerName,
            customer_email: incidentDraft.customerEmail,
            customer_phone: phone,
            order_date: order?.dateCreated || '',
            order_status: order?.status || '',
            order_total: order?.total || '',
            shipping_address: order?.customer.address || '',
            billing_address: order?.customer.address || '',
            products_json: JSON.stringify(
              order?.items || incident?.products || [],
            ),
            incident_text: `${incidentDraft.text}${incidentDraft.observations.trim() ? `\n\nOBSERVACIONES: ${incidentDraft.observations.trim()}` : ''}`,
            incident_date: incidentDraft.date,
            pickup_school: incidentDraft.pickup ? 1 : 0,
            pickup_school_name: incidentDraft.pickup
              ? incidentDraft.pickupSchool
              : '',
            pickup_details: incidentDraft.pickup ? pickupDetails : '',
            pickup_received: incident?.pickupReceived ? 1 : 0,
            solved: forceSolved || incidentDraft.solved ? 1 : 0,
            incident_school_name: incidentDraft.school,
            is_recurrence: incidentDraft.recurrence ? 1 : 0,
            source_type: 'pedido',
          }),
        });
      } else {
        if (
          !reservationDraft.reference.trim() ||
          !reservationDraft.customerName.trim() ||
          !reservationDraft.school ||
          !reservationDraft.date ||
          !reservationDraft.articleId ||
          !reservationDraft.size.trim() ||
          reservationDraft.units < 1
        ) {
          setSaved(
            'Completa referencia, cliente, colegio, fecha, artículo, talla y unidades.',
          );
          return;
        }
        const linkedCustomerFromSearch = Boolean(
          order?.customer.name ||
            incident?.customerName ||
            mondayRecords[0]?.customer,
        );
        if (
          !reservationDraft.customerId &&
          !newReservationCustomer &&
          !linkedCustomerFromSearch
        ) {
          setSaved('Selecciona un cliente del desplegable o pulsa Nuevo para crearlo.');
          return;
        }
        if (
          newReservationCustomer &&
          (!reservationDraft.phone.trim() || !reservationDraft.customerEmail.trim())
        ) {
          setSaved('Para un cliente nuevo, completa teléfono y e-mail.');
          return;
        }
        if (
          newReservationCustomer &&
          !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reservationDraft.customerEmail.trim())
        ) {
          setSaved('El e-mail del cliente nuevo no tiene un formato válido.');
          return;
        }
        setReservationSaving(true);
        const reservationReference = /^R/i.test(reference)
          ? reference
          : `R${reference}`;
        response = await fetch('/api/monday', {
          method: editingReservationId ? 'PUT' : 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            id: editingReservationId || undefined,
            ...reservationDraft,
            createCustomer:
              newReservationCustomer ||
              (!reservationDraft.customerId && linkedCustomerFromSearch),
            reference: reservationReference,
          }),
        });
      }
      if (!response.ok) {
        const data = (await response.json()) as { error?: string };
        throw new Error(data.error);
      }
      const record = (await response.json()) as { id?: string; formula?: string };
      setSaved(
        kind === 'reserva'
          ? editingReservationId
            ? `Reserva actualizada correctamente en Monday (${record.id}).`
            : `Reserva creada correctamente en Monday (${record.id}).`
          : `Incidencia del pedido #${reference} guardada en el registro compartido.`,
      );
      if (kind === 'reserva') {
        const article = reservationOptions?.articles.find(
          (item) => item.id === reservationDraft.articleId,
        );
        const reservationReference = /^R/i.test(reference)
          ? reference
          : `R${reference}`;
        const savedReservation: MondayRecord = {
          id: record.id || '',
          kind: 'reserva',
          board: 'Registro Reservas',
          reference: reservationReference,
          customer: reservationDraft.customerName,
          phone: reservationDraft.phone,
          school: reservationDraft.school,
          date: reservationDraft.date,
          article: article?.description || '',
          articleDescription: article?.description || '',
          code: article?.code || '',
          size: reservationDraft.size,
          units: String(reservationDraft.units),
          sentUnits: String(reservationDraft.sentUnits),
          pending: String(reservationDraft.pending),
          paid: reservationDraft.paid,
          status: reservationDraft.status,
          observations: reservationDraft.observations,
          specialDetails: '',
          articleIds: reservationDraft.articleId ? [reservationDraft.articleId] : [],
          customerIds: reservationDraft.customerId ? [reservationDraft.customerId] : [],
          endDate: reservationDraft.endDate,
          productionDate: reservationDraft.productionDate,
          estimatedProduction: reservationDraft.estimatedProduction,
          formula: record.formula || reservationDraft.formula,
          customerEmail: reservationDraft.customerEmail,
          updatedAt: new Date().toISOString(),
        };
        setCreatedReservation(savedReservation);
        if (editingReservationId) {
          setReservationRows((rows) =>
            rows.map((item) => item.id === editingReservationId ? savedReservation : item),
          );
          setEditingReservationId('');
          setModal('reservas');
        } else {
          setModal('reserva-creada');
        }
      }
      if (kind === 'incidencia') void search();
      if (kind === 'incidencia') setModal(null);
    } catch (error) {
      setSaved(
        error instanceof Error && error.message
          ? error.message
          : 'No se pudo guardar. Revisa la conexión e inténtalo de nuevo.',
      );
    } finally {
      if (kind === 'reserva') setReservationSaving(false);
    }
  }
  async function checkShipping() {
    if (!shippingReference) {
      setError('Introduce primero el número de pedido.');
      return;
    }
    setShippingLoading(true);
    setShipments(null);
    try {
      const response = await fetch(
        `/api/shipping?order=${encodeURIComponent(shippingReference)}`,
        { cache: 'no-store' },
      );
      const data = (await response.json()) as { matches?: Shipment[] };
      setShipments(data.matches ?? []);
    } catch {
      setShipments([]);
    } finally {
      setShippingLoading(false);
    }
  }
  function openShipping() {
    const match = normalized.match(/^(?:I|R)?PA(.+)$/i);
    const suffix = match?.[1] || normalized;
    const prefix = /^IPA/i.test(normalized)
      ? 'IPA'
      : /^RPA/i.test(normalized)
        ? 'RPA'
        : 'PA';
    setShippingReference(`${prefix}${suffix}`);
    setShipments(null);
    setShippingOpen(true);
  }
  async function openRegistry(kind: 'registro' | 'recogidas') {
    setModal(kind);
    setRegistryLoading(true);
    setRegistryFilter('');
    try {
      const response = await fetch(
        `/api/incidents?scope=${kind === 'registro' ? 'all' : 'pickups'}`,
        { cache: 'no-store' },
      );
      const data = (await response.json()) as {
        rows?: Incident[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error);
      setRegistryRows(data.rows || []);
    } catch (error) {
      setRegistryRows([]);
      setSaved(
        error instanceof Error
          ? error.message
          : 'No se pudo abrir el registro.',
      );
    } finally {
      setRegistryLoading(false);
    }
  }
  function showIncidentDocument(row: Incident) {
    setSelectedIncident(row);
    setModal('detalle-incidencia');
  }
  function printIncidentDocument(
    row: Incident,
    mode: 'document' | 'label' = 'document',
  ) {
    if (mode === 'label') {
      const rawDate = row.incidentDate?.slice(0, 10) || '';
      const shownDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
        ? `${rawDate.slice(8, 10)}/${rawDate.slice(5, 7)}/${rawDate.slice(0, 4)}`
        : rawDate;
      printStandaloneLabel([
        `INCIDENCIA ${row.orderNumber}`,
        `NOMBRE: ${row.customerName || 'SIN NOMBRE'}`,
        `FECHA: ${shownDate}`,
        `RECOGIDA ${row.pickupSchoolName || row.school || 'SIN COLEGIO'}`,
      ]);
      return;
    }
    setPrintMode(mode);
    setPrintIncident(row);
    setTimeout(() => {
      window.print();
      setPrintIncident(null);
    }, 100);
  }
  function requestReservationPrint(
    record: MondayRecord,
    mode: 'card' | 'label' = 'card',
  ) {
    if (mode === 'label') {
      const rawDate = record.updatedAt?.slice(0, 10) || '';
      const shownDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
        ? `${rawDate.slice(8, 10)}/${rawDate.slice(5, 7)}/${rawDate.slice(0, 4)}`
        : rawDate;
      printStandaloneLabel([
        `RESERVA ${record.reference}`,
        `NOMBRE: ${record.customer || 'SIN NOMBRE'}`,
        `FECHA: ${shownDate}`,
        `COLEGIO: ${record.school || 'SIN COLEGIO'}`,
      ]);
      return;
    }
    setReservationPrintMode(mode);
    setPrintReservation(record);
    setTimeout(() => {
      window.print();
      setPrintReservation(null);
    }, 100);
  }
  function printIncidentDraft(mode: 'document' | 'label') {
    const pickupDetails = pickupProducts
      .filter((item) => incidentDraft.pickupItems[item.id]?.selected)
      .map((item) => {
        const pick = incidentDraft.pickupItems[item.id];
        return `- ${item.name} | Talla: ${pick.size || 'Sin indicar'} | Unidades: ${pick.units || 1}`;
      });
    if (incidentDraft.pickupNotes.trim())
      pickupDetails.push(`Observaciones: ${incidentDraft.pickupNotes.trim()}`);
    const row: Incident = {
      orderNumber:
        order?.number ||
        incident?.orderNumber ||
        mondayRecords[0]?.reference ||
        '',
      customerName:
        order?.customer.name ||
        incident?.customerName ||
        mondayRecords[0]?.customer ||
        '',
      customerEmail: order?.customer.email || incident?.customerEmail || '',
      customerPhone:
        order?.customer.phone ||
        incident?.customerPhone ||
        mondayRecords[0]?.phone ||
        '',
      incidentText: incidentDraft.text,
      observations: incidentDraft.observations,
      incidentDate: incidentDraft.date,
      solved: incidentDraft.solved,
      solvedAt: '',
      updatedAt: '',
      pickupSchool: incidentDraft.pickup,
      pickupSchoolName: incidentDraft.pickupSchool,
      pickupDetails: pickupDetails.join('\n'),
      pickupReceived: incident?.pickupReceived || false,
      pickupReceivedAt: incident?.pickupReceivedAt || '',
      school: incidentDraft.school,
      recurrenceCount: incident?.recurrenceCount || 0,
      products: order?.items || incident?.products || [],
    };
    printIncidentDocument(row, mode);
  }
  async function setPickupReceived(row: Incident, received: boolean) {
    try {
      const response = await fetch('/api/incidents', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderNumber: row.orderNumber, received }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error);
      setRegistryRows((rows) =>
        rows.map((item) =>
          item.orderNumber === row.orderNumber
            ? {
                ...item,
                pickupReceived: received,
                pickupReceivedAt: received ? new Date().toISOString() : '',
              }
            : item,
        ),
      );
      if (incident?.orderNumber === row.orderNumber)
        setIncident({
          ...incident,
          pickupReceived: received,
          pickupReceivedAt: received ? new Date().toISOString() : '',
        });
      setSaved(
        received
          ? `Recogida del pedido #${row.orderNumber} marcada como recibida.`
          : `Recogida del pedido #${row.orderNumber} devuelta a pendiente.`,
      );
    } catch (error) {
      setSaved(
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar la recogida.',
      );
    }
  }
  async function setIncidentSolved(row: Incident, solved: boolean) {
    try {
      const response = await fetch('/api/incidents', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ orderNumber: row.orderNumber, solved }),
      });
      const data = (await response.json()) as {
        error?: string;
        incident?: Incident;
      };
      if (!response.ok) throw new Error(data.error);
      const updated = data.incident || {
        ...row,
        solved,
        solvedAt: solved ? new Date().toISOString() : '',
      };
      setRegistryRows((rows) =>
        rows.map((item) =>
          item.orderNumber === row.orderNumber ? updated : item,
        ),
      );
      if (incident?.orderNumber === row.orderNumber) setIncident(updated);
      if (selectedIncident?.orderNumber === row.orderNumber)
        setSelectedIncident(updated);
      setSaved(
        solved
          ? `Incidencia #${row.orderNumber} cerrada correctamente.`
          : `Incidencia #${row.orderNumber} reabierta.`,
      );
    } catch (error) {
      setSaved(
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar la incidencia.',
      );
    }
  }
  useEffect(() => {
    const context = (
      document as Document & {
        modelContext?: {
          registerTool: (
            tool: unknown,
            options?: { signal?: AbortSignal },
          ) => void | Promise<void>;
        };
      }
    ).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    void Promise.resolve(
      context.registerTool(
        {
          name: 'buscar_pedido',
          title: 'Buscar pedido',
          description:
            'Busca un pedido real en WooCommerce y muestra su ficha.',
          inputSchema: {
            type: 'object',
            properties: { numero: { type: 'string' } },
            required: ['numero'],
            additionalProperties: false,
          },
          annotations: { readOnlyHint: true, untrustedContentHint: true },
          async execute(input: unknown) {
            const numero = String(
              (input as { numero?: unknown }).numero ?? '',
            ).trim();
            if (!numero) throw new Error('El número es obligatorio.');
            setQuery(numero);
            return { numero, estado: 'preparado' };
          },
        },
        { signal: lifecycle.signal },
      ),
    ).catch(() => undefined);
    return () => lifecycle.abort();
  }, []);
  const units = order?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
  const schools = [
    ...new Set(
      [
        ...schoolOptions,
        incident?.school,
        incident?.pickupSchoolName,
        ...mondayRecords.map((record) => record.school),
      ].filter(Boolean) as string[],
    ),
  ].sort((a, b) => a.localeCompare(b, 'es'));
  const visibleRegistryRows = registryRows.filter((row) => {
    if (modal === 'recogidas' && !showReceivedPickups && row.pickupReceived)
      return false;
    const term = folded(registryFilter);
    return (
      !term ||
      folded(
        [
          row.orderNumber,
          row.customerName,
          row.school,
          row.pickupSchoolName,
          row.incidentText,
          row.pickupDetails,
        ].join(' '),
      ).includes(term)
    );
  });
  const visibleReservationRows = reservationRows.filter((row) => {
    const term = folded(registryFilter);
    return !term || folded([
      row.reference,
      row.customer,
      row.phone,
      row.school,
      row.articleDescription,
      row.size,
      row.status,
    ].join(' ')).includes(term);
  });

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="topbar">
        <a className="brand" href="#">
          <img
            className="brand-mark"
            src="/paddy-logo-granate.png"
            alt="Paddy"
          />
          <span>
            <strong>Detalle</strong>
            <small>Gestión unificada</small>
          </span>
        </a>
        <div className="top-actions">
          <Button
            className="action-button registry"
            variant="outline"
            onClick={() =>
              window.location.assign('https://paddy-packing-list.paddygestion.workers.dev/')
            }
          >
            <PackageCheck /> PackingList
          </Button>
          <Button
            className="action-button reservation"
            variant="outline"
            onClick={() => void openReservations()}
          >
            <CalendarDays /> Reservas
          </Button>
          <Button
            className="action-button pickups"
            variant="outline"
            onClick={() => void openRegistry('recogidas')}
          >
            <Shirt /> Recogidas
          </Button>
          <Button
            className="action-button shipping"
            disabled={!normalized || shippingLoading}
            onClick={openShipping}
          >
            <Truck /> ¿Envío?
          </Button>
          <Button
            className="action-button incident"
            onClick={() =>
              window.location.assign('https://incidencias-production-00a0.up.railway.app/')
            }
          >
            <AlertTriangle /> Incidencias
          </Button>
          <Button
            className="action-button reservation"
            onClick={() => void openReservation()}
          >
            <CalendarDays /> Generar reserva
          </Button>
          <span className="divider" />
          <button className="user-chip" onClick={() => void logout()} title="Cerrar sesión">
            <span>{sessionUser?.displayName.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase() || '··'}</span>
            <b>{sessionUser?.displayName || 'Usuario'}</b>
            <LogOut size={15} />
          </button>
        </div>
      </header>
      <section className="search-band">
        <div className="search-wrap">
          <p className="eyebrow">Consulta global</p>
          <h1>¿Qué necesitas localizar?</h1>
          <form onSubmit={search} className="search-box">
            <Search />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Introduce el número de pedido…"
              aria-label="Número de pedido"
            />
            {query && (
              <button
                type="button"
                className="clear"
                onClick={() => setQuery('')}
              >
                <X />
              </button>
            )}
            <Button type="submit" disabled={loading}>
              {loading ? 'Buscando…' : 'Buscar'}
            </Button>
          </form>
          <div className="source-row">
            <SourceBadge color="#7c3aed">WooCommerce conectado</SourceBadge>
            <SourceBadge color="#ea580c">Incidencias conectado</SourceBadge>
            <SourceBadge color="#16a34a">Monday Reservas conectado</SourceBadge>
            <SourceBadge color="#db2777">Monday Prendas conectado</SourceBadge>
            <SourceBadge color="#0284c7">DetalWPF sincronizado</SourceBadge>
          </div>
        </div>
      </section>
      {saved && (
        <div className="success-toast">
          <Check />
          {saved}
        </div>
      )}
      {error && (
        <div className="error-banner">
          <AlertTriangle />
          <div>
            <b>No hemos podido mostrar el pedido</b>
            <span>{error}</span>
          </div>
        </div>
      )}
      {!order &&
        !incident &&
        !mondayRecords.length &&
        !ticket &&
        !loading &&
        !error && (
          <div className="empty-state">
            <Search />
            <h2>Busca un pedido, reserva o prenda especial</h2>
            <p>Consultaremos WooCommerce, incidencias y Monday.</p>
          </div>
        )}
      {loading && (
        <div className="empty-state">
          <RefreshCw className="spin" />
          <h2>Consultando WooCommerce</h2>
          <p>Estamos buscando el pedido y sus artículos.</p>
        </div>
      )}
      {order && (
        <div className="workspace">
          <div className="result-heading">
            <div>
              <span className="result-label">Resultado en WooCommerce</span>
              <div className="title-row">
                <h2>Pedido #{order.number}</h2>
                <span
                  className={`status ${['completed', 'processing'].includes(order.status) ? 'status-green' : 'status-amber'}`}
                >
                  {order.statusLabel}
                </span>
              </div>
              <p>Actualizado {fmt(order.dateModified)}</p>
            </div>
            <div className="result-actions">
              <Button variant="outline" onClick={() => void search()}>
                <RefreshCw /> Actualizar
              </Button>
              <Button
                variant="outline"
                onClick={() => window.open(order.wooUrl, '_blank')}
              >
                <ExternalLink /> Abrir en WooCommerce
              </Button>
            </div>
          </div>
          <div className="content-grid">
            <section className="main-column">
              <Tabs defaultValue="resumen" className="record-tabs">
                <TabsList variant="line">
                  <TabsTrigger value="resumen">Resumen</TabsTrigger>
                  <TabsTrigger value="articulos">
                    Artículos{' '}
                    <span className="count">{order.items.length}</span>
                  </TabsTrigger>
                  <TabsTrigger value="seguimiento">Envío</TabsTrigger>
                  <TabsTrigger value="notas">
                    Notas <span className="count">{orderNotes.length}</span>
                  </TabsTrigger>
                  <TabsTrigger value="movimientos">
                    Movimientos{' '}
                    <span className="count">
                      {order.movements?.length || 0}
                    </span>
                  </TabsTrigger>
                  <TabsTrigger value="documentos">Documentos</TabsTrigger>
                </TabsList>
                <TabsContent value="resumen" className="tab-body">
                  <div className="two-cards">
                    <article className="info-card">
                      <div className="card-title">
                        <CircleUserRound />
                        <div>
                          <h3>Cliente</h3>
                          <p>Datos de WooCommerce</p>
                        </div>
                      </div>
                      <dl>
                        <div>
                          <dt>Nombre</dt>
                          <dd>{order.customer.name || 'No indicado'}</dd>
                        </div>
                        <div>
                          <dt>Teléfono</dt>
                          <dd>{order.customer.phone || 'No indicado'}</dd>
                        </div>
                        <div>
                          <dt>Email</dt>
                          <dd>{order.customer.email || 'No indicado'}</dd>
                        </div>
                        <div>
                          <dt>Dirección</dt>
                          <dd>{order.customer.address || 'No indicada'}</dd>
                        </div>
                      </dl>
                    </article>
                    <article className="info-card">
                      <div className="card-title">
                        <ShoppingBag />
                        <div>
                          <h3>Pedido</h3>
                          <p>Información comercial</p>
                        </div>
                      </div>
                      <dl>
                        <div>
                          <dt>Fecha</dt>
                          <dd>{fmt(order.dateCreated)}</dd>
                        </div>
                        <div>
                          <dt>Estado</dt>
                          <dd>{order.statusLabel}</dd>
                        </div>
                        <div>
                          <dt>Pago</dt>
                          <dd>{order.payment}</dd>
                        </div>
                        <div>
                          <dt>Total</dt>
                          <dd className="total">{order.total}</dd>
                        </div>
                      </dl>
                      <label className="return-attended-control">
                        <input
                          type="checkbox"
                          checked={order.returnAttended}
                          disabled={returnUpdating}
                          onChange={(event) => void updateReturnAttended(event.target.checked)}
                        />
                        <span>
                          <b>Devolución atendida</b>
                          <small>{returnUpdating ? 'Actualizando WooCommerce…' : 'Sincronizado con WooCommerce'}</small>
                        </span>
                      </label>
                    </article>
                  </div>
                  <Items order={order} units={units} />
                  {incident ? (
                    <IncidentCard
                      incident={incident}
                      onPrintIncident={printIncidentDocument}
                    />
                  ) : (
                    <article className="linked-card empty-linked">
                      <div className="linked-accent">
                        <Archive />
                      </div>
                      <div className="linked-main">
                        <span className="linked-type">Incidencias</span>
                        <h3>Este pedido no tiene incidencia registrada</h3>
                        <p>
                          No se encontró ninguna coincidencia en el registro
                          compartido.
                        </p>
                      </div>
                    </article>
                  )}
                  <MondayCards
                    records={mondayRecords}
                    onPrintReservation={requestReservationPrint}
                    onEmailReservation={openReservationEmail}
                  />
                </TabsContent>
                <TabsContent value="articulos" className="tab-body">
                  <Items order={order} units={units} />
                </TabsContent>
                <TabsContent value="seguimiento" className="tab-body">
                  <article className="info-card">
                    <div className="card-title">
                      <PackageCheck />
                      <div>
                        <h3>{order.shippingMethod}</h3>
                        <p>Método de envío registrado en WooCommerce</p>
                      </div>
                    </div>
                  </article>
                  <article className="email-action-card">
                    <div className="card-title">
                      <Mail />
                      <div>
                        <h3>Avisar al cliente por email</h3>
                        <p>El texto se adapta al tipo de entrega y se puede editar antes de enviarlo.</p>
                      </div>
                    </div>
                    <Button onClick={openOrderEmail}>
                      <Mail /> Preparar email
                    </Button>
                  </article>
                </TabsContent>
                <TabsContent value="notas" className="tab-body">
                  <article className="info-card notes-card">
                    <div className="card-title">
                      <MessageSquarePlus />
                      <div>
                        <h3>Notas de seguimiento</h3>
                        <p>Llamadas, emails y otras gestiones de este pedido</p>
                      </div>
                    </div>
                    <div className="note-composer">
                      <select
                        value={noteKind}
                        onChange={(e) =>
                          setNoteKind(e.target.value as OrderNote['kind'])
                        }
                        aria-label="Tipo de nota"
                      >
                        <option value="nota">Nota</option>
                        <option value="llamada">Llamada</option>
                        <option value="email">Email</option>
                      </select>
                      <Textarea
                        value={noteDraft}
                        onChange={(e) => setNoteDraft(e.target.value)}
                        placeholder="Ejemplo: Ha llamado para consultar cuándo estará preparado…"
                        rows={3}
                      />
                      <Button
                        onClick={() => void saveOrderNote()}
                        disabled={!noteDraft.trim()}
                      >
                        Guardar nota
                      </Button>
                    </div>
                    <div className="notes-list">
                      {notesLoading ? (
                        <p className="notes-empty">Cargando notas…</p>
                      ) : orderNotes.length ? (
                        orderNotes.map((note) => (
                          <article className="note-row" key={note.id}>
                            <span className={`note-icon ${note.kind}`}>
                              {note.kind === 'llamada' ? (
                                <Phone />
                              ) : note.kind === 'email' ? (
                                <Mail />
                              ) : (
                                <MessageSquarePlus />
                              )}
                            </span>
                            <div>
                              <div className="note-head">
                                <b>
                                  {note.kind === 'llamada'
                                    ? 'Llamada'
                                    : note.kind === 'email'
                                      ? 'Email'
                                      : 'Nota'}
                                </b>
                                <time>{fmt(note.createdAt)}</time>
                              </div>
                              <p>{note.content}</p>
                              {note.authorName && <small>Por {note.authorName}</small>}
                            </div>
                          </article>
                        ))
                      ) : (
                        <p className="notes-empty">
                          Todavía no hay notas en este pedido.
                        </p>
                      )}
                    </div>
                  </article>
                </TabsContent>
                <TabsContent value="movimientos" className="tab-body">
                  <article className="info-card notes-card">
                    <div className="card-title">
                      <ClipboardList />
                      <div>
                        <h3>Movimientos de WooCommerce</h3>
                        <p>
                          El historial que aparece en el margen derecho del
                          pedido
                        </p>
                      </div>
                    </div>
                    <div className="woo-movements">
                      {order.movements?.length ? (
                        order.movements.map((movement) => (
                          <article className="woo-movement" key={movement.id}>
                            <span className="woo-movement-dot" />
                            <div>
                              <div className="note-head">
                                <b>{movement.author}</b>
                                <time>
                                  {movement.date
                                    ? fmt(movement.date)
                                    : 'Sin fecha'}
                                </time>
                              </div>
                              <p>
                                {movement.text || 'Movimiento sin descripción'}
                              </p>
                              {movement.customerVisible && (
                                <small>Nota visible para el cliente</small>
                              )}
                            </div>
                          </article>
                        ))
                      ) : (
                        <p className="notes-empty">
                          WooCommerce no tiene movimientos para este pedido.
                        </p>
                      )}
                    </div>
                  </article>
                </TabsContent>
                <TabsContent value="documentos" className="tab-body">
                  <article className="info-card documents-card">
                    <div className="card-title">
                      <FileText />
                      <div>
                        <h3>Documentos del pedido</h3>
                        <p>Incidencias generadas y listas para reimprimir</p>
                      </div>
                    </div>
                    {incident ? (
                      <div className="document-row">
                        <span className="document-icon">
                          <FileText />
                        </span>
                        <div>
                          <b>Incidencia #{incident.orderNumber}</b>
                          <small>
                            {incident.incidentDate || 'Fecha no indicada'} ·{' '}
                            {incident.solved ? 'Resuelta' : 'Pendiente'}
                          </small>
                        </div>
                        <Button
                          variant="outline"
                          onClick={() => showIncidentDocument(incident)}
                        >
                          Ver
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => printIncidentDocument(incident)}
                        >
                          <Printer /> Reimprimir
                        </Button>
                      </div>
                    ) : (
                      <p className="documents-empty">
                        Este pedido todavía no tiene documentos de incidencia.
                      </p>
                    )}
                  </article>
                </TabsContent>
              </Tabs>
            </section>
            <aside className="side-column">
              <section className="side-card">
                <div className="side-title">
                  <ClipboardList />
                  <div>
                    <h3>Actividad</h3>
                    <p>Información disponible</p>
                  </div>
                </div>
                <div className="timeline">
                  {orderNotes.map((note) => (
                    <div className="timeline-row" key={note.id}>
                      <i className="blue" />
                      <div>
                        <time>{fmt(note.createdAt)}</time>
                        <b>
                          {note.kind === 'llamada'
                            ? 'Llamada'
                            : note.kind === 'email'
                              ? 'Email'
                              : 'Nota de seguimiento'}
                        </b>
                        <span>{note.content}</span>
                        {note.authorName && <small>Por {note.authorName}</small>}
                      </div>
                    </div>
                  ))}
                  {incident && (
                    <div className="timeline-row">
                      <i className="amber" />
                      <div>
                        <time>{incident.incidentDate}</time>
                        <b>
                          Incidencia{' '}
                          {incident.solved ? 'resuelta' : 'pendiente'}
                        </b>
                        <span>{incident.incidentText}</span>
                      </div>
                    </div>
                  )}
                  <div className="timeline-row">
                    <i className="green" />
                    <div>
                      <time>{fmt(order.dateModified)}</time>
                      <b>{order.statusLabel}</b>
                      <span>Última actualización en WooCommerce</span>
                    </div>
                  </div>
                  <div className="timeline-row">
                    <i className="slate" />
                    <div>
                      <time>{fmt(order.dateCreated)}</time>
                      <b>Pedido recibido</b>
                      <span>WooCommerce</span>
                    </div>
                  </div>
                </div>
              </section>
            </aside>
          </div>
        </div>
      )}
      {!order && (incident || mondayRecords.length > 0) && (
        <div className="workspace">
          <div className="result-heading">
            <div>
              <span className="result-label">Resultado encontrado</span>
              <div className="title-row">
                <h2>
                  Pedido #{incident?.orderNumber || mondayRecords[0]?.reference}
                </h2>
              </div>
              <p>Registros conectados</p>
            </div>
          </div>
          {incident && (
            <IncidentCard
              incident={incident}
              onPrintIncident={printIncidentDocument}
            />
          )}
          <MondayCards
            records={mondayRecords}
            onPrintReservation={requestReservationPrint}
            onEmailReservation={openReservationEmail}
          />
        </div>
      )}
      {ticket && (
        <div className="workspace">
          <div className="result-heading">
            <div>
              <span className="result-label">Ticket de caja · DetallWPF</span>
              <div className="title-row">
                <h2>Ticket #{ticket.number}</h2>
              </div>
              <p>
                {ticket.date || 'Fecha no indicada'} ·{' '}
                {ticket.store || 'Tienda no indicada'}
              </p>
            </div>
          </div>
          <article className="items-card">
            <div className="section-head">
              <div>
                <h3>{ticket.customer || 'Cliente desconocido'}</h3>
                <p>
                  Operario: {ticket.operator || 'No indicado'} · Pago:{' '}
                  {ticket.payment || 'No indicado'}
                </p>
              </div>
              <strong>{ticket.total || ''}</strong>
            </div>
            {ticket.items.map((item, index) => (
              <div className="item-row" key={index}>
                <div className="product-thumb">
                  <ShoppingBag />
                </div>
                <div className="product-name">
                  <b>{item.name || item.article || 'Artículo'}</b>
                  <small>
                    {[item.color, item.size && `Talla ${item.size}`]
                      .filter(Boolean)
                      .join(' · ')}
                  </small>
                </div>
                <div>
                  <small>Uds.</small>
                  <b>{item.units ?? '—'}</b>
                </div>
                <div />
                <strong>{item.total || item.price || ''}</strong>
              </div>
            ))}
          </article>
        </div>
      )}
      <Dialog
        open={modal === 'incidencia'}
        onOpenChange={(open) => !open && setModal(null)}
      >
        <DialogContent className="form-dialog incident-dialog">
          <DialogHeader>
            <div className="modal-icon orange">
              <AlertTriangle />
            </div>
            <DialogTitle>
              Incidencia del pedido #
              {order?.number ||
                incident?.orderNumber ||
                mondayRecords[0]?.reference}
            </DialogTitle>
            <DialogDescription>
              Los datos se guardarán en el registro compartido de incidencias.
            </DialogDescription>
          </DialogHeader>
          <div className="incident-form">
            <div className="incident-customer">
              <b>
                {order?.customer.name ||
                  incident?.customerName ||
                  mondayRecords[0]?.customer ||
                  'Cliente sin nombre'}
              </b>
              <span>
                {order?.customer.email || incident?.customerEmail || ''}
                {order?.customer.phone ||
                incident?.customerPhone ||
                mondayRecords[0]?.phone
                  ? ` · ${order?.customer.phone || incident?.customerPhone || mondayRecords[0]?.phone}`
                  : ''}
              </span>
            </div>
            <div className="form-grid two">
              <Field label="Email del cliente">
                <Input
                  type="email"
                  value={incidentDraft.customerEmail}
                  onChange={(e) =>
                    setIncidentDraft({
                      ...incidentDraft,
                      customerEmail: e.target.value,
                    })
                  }
                  placeholder="cliente@email.com"
                />
              </Field>
              <Field label="Fecha de recepción de la incidencia">
                <Input
                  type="date"
                  value={incidentDraft.date}
                  onChange={(e) =>
                    setIncidentDraft({ ...incidentDraft, date: e.target.value })
                  }
                />
              </Field>
              <Field label="Colegio de la incidencia">
                <Input
                  list="incident-schools"
                  value={incidentDraft.school}
                  onChange={(e) =>
                    setIncidentDraft({
                      ...incidentDraft,
                      school: e.target.value,
                    })
                  }
                  placeholder="Selecciona o escribe el colegio"
                />
                <datalist id="incident-schools">
                  {schools.map((school) => (
                    <option key={school} value={school} />
                  ))}
                </datalist>
              </Field>
              <Field label="Descripción de la incidencia">
                <Textarea
                  rows={6}
                  value={incidentDraft.text}
                  onChange={(e) =>
                    setIncidentDraft({ ...incidentDraft, text: e.target.value })
                  }
                  placeholder="Describe aquí qué ha ocurrido…"
                />
              </Field>
              <Field label="Observaciones">
                <Textarea
                  rows={3}
                  value={incidentDraft.observations}
                  onChange={(e) =>
                    setIncidentDraft({
                      ...incidentDraft,
                      observations: e.target.value,
                    })
                  }
                  placeholder="Añade cualquier observación adicional…"
                />
              </Field>
            </div>
            <div className="incident-checks">
              <label>
                <input
                  type="checkbox"
                  checked={incidentDraft.recurrence}
                  onChange={(e) =>
                    setIncidentDraft({
                      ...incidentDraft,
                      recurrence: e.target.checked,
                    })
                  }
                />{' '}
                Es una reincidencia
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={incidentDraft.pickup}
                  onChange={(e) =>
                    setIncidentDraft({
                      ...incidentDraft,
                      pickup: e.target.checked,
                    })
                  }
                />{' '}
                Recoger en el cole
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={incidentDraft.solved}
                  onChange={(e) =>
                    setIncidentDraft({
                      ...incidentDraft,
                      solved: e.target.checked,
                    })
                  }
                />{' '}
                Incidencia solucionada
              </label>
            </div>
            {incidentDraft.pickup && (
              <section className="pickup-box">
                <Field label="Colegio de recogida">
                  <select
                    value={incidentDraft.pickupSchool}
                    onChange={(e) => {
                      const school = e.target.value;
                      setIncidentDraft({
                        ...incidentDraft,
                        pickupSchool: school,
                        pickupItems: {},
                      });
                      void loadPickupProducts(school);
                    }}
                  >
                    <option value="">Selecciona un colegio</option>
                    {schools.map((school) => (
                      <option key={school} value={school}>
                        {school}
                      </option>
                    ))}
                  </select>
                </Field>
                <span className="pickup-label">Productos para recoger</span>
                <div className="pickup-products">
                  {productsLoading ? (
                    <p>Cargando productos de WooCommerce…</p>
                  ) : productsError ? (
                    <p className="pickup-error">{productsError}</p>
                  ) : pickupProducts.length ? (
                    <>
                      <div className="pickup-product-header">
                        <span />
                        <span>Artículo</span>
                        <span>Talla</span>
                        <span>Unidades</span>
                      </div>
                      {pickupProducts.map((item) => {
                        const pick = incidentDraft.pickupItems[item.id] || {
                          selected: false,
                          size: '',
                          units: 1,
                        };
                        return (
                          <div
                            className={`pickup-product ${pick.selected ? '' : 'disabled'}`}
                            key={item.id}
                          >
                            <input
                              type="checkbox"
                              checked={pick.selected}
                              onChange={(e) =>
                                setIncidentDraft({
                                  ...incidentDraft,
                                  pickupItems: {
                                    ...incidentDraft.pickupItems,
                                    [item.id]: {
                                      ...pick,
                                      selected: e.target.checked,
                                    },
                                  },
                                })
                              }
                            />
                            <div>
                              <b>{item.name}</b>
                              <small>{item.sku}</small>
                            </div>
                            <Input
                              placeholder="Talla"
                              value={pick.size}
                              disabled={!pick.selected}
                              onChange={(e) =>
                                setIncidentDraft({
                                  ...incidentDraft,
                                  pickupItems: {
                                    ...incidentDraft.pickupItems,
                                    [item.id]: {
                                      ...pick,
                                      size: e.target.value,
                                    },
                                  },
                                })
                              }
                            />
                            <Input
                              type="number"
                              min={1}
                              value={pick.units}
                              disabled={!pick.selected}
                              onChange={(e) =>
                                setIncidentDraft({
                                  ...incidentDraft,
                                  pickupItems: {
                                    ...incidentDraft.pickupItems,
                                    [item.id]: {
                                      ...pick,
                                      units: Number(e.target.value),
                                    },
                                  },
                                })
                              }
                            />
                          </div>
                        );
                      })}
                    </>
                  ) : (
                    <p>
                      {incidentDraft.pickupSchool
                        ? 'No hay productos publicados para este colegio.'
                        : 'Selecciona primero un colegio.'}
                    </p>
                  )}
                </div>
                <Field label="Observaciones">
                  <Textarea
                    rows={3}
                    value={incidentDraft.pickupNotes}
                    onChange={(e) =>
                      setIncidentDraft({
                        ...incidentDraft,
                        pickupNotes: e.target.value,
                      })
                    }
                    placeholder="Alumno u otros detalles opcionales…"
                  />
                </Field>
              </section>
            )}
            <div className="form-tools">
              <Button
                variant="outline"
                onClick={() => printIncidentDraft('label')}
              >
                <Tag /> Emitir etiqueta
              </Button>
              <Button
                variant="outline"
                onClick={() => printIncidentDraft('document')}
              >
                <Printer /> Imprimir
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(null)}>
              Cancelar
            </Button>
            <Button
              variant="outline"
              onClick={() => void save('incidencia', true)}
            >
              Guardar como solucionada
            </Button>
            <Button
              className="save-incident"
              onClick={() => void save('incidencia')}
            >
              Guardar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={modal === 'reserva'}
        onOpenChange={(open) => !open && setModal(null)}
      >
        <DialogContent
          className="form-dialog reservation-dialog"
          style={{
            '--reservation-drag-x': `${reservationDialogOffset.x}px`,
            '--reservation-drag-y': `${reservationDialogOffset.y}px`,
          } as CSSProperties}
        >
          <DialogHeader
            className="reservation-drag-handle"
            onPointerDown={startReservationDrag}
            onPointerMove={moveReservationDialog}
            onPointerUp={stopReservationDrag}
            onPointerCancel={stopReservationDrag}
          >
            <div className="modal-icon green">
              <CalendarDays />
            </div>
            <DialogTitle>{editingReservationId ? 'Completar reserva' : 'Generar reserva'}</DialogTitle>
            <DialogDescription>
              {editingReservationId
                ? 'Rellena o corrige los campos y guarda los cambios directamente en Monday.'
                : 'Puedes crear una reserva libre o asociarla a un pedido existente.'}
              .
            </DialogDescription>
            <small className="drag-help">
              Arrastra desde aquí para mover la ventana
            </small>
          </DialogHeader>
          {reservationLoading ? (
            <div className="reservation-loading">
              <RefreshCw className="spin" />
              Cargando campos de Monday…
            </div>
          ) : (
            <div className="form-grid two reservation-grid">
              <Field label="Nº reserva o pedido">
                <Input
                  value={reservationDraft.reference}
                  onChange={(e) =>
                    setReservationDraft({ ...reservationDraft, reference: e.target.value.toUpperCase() })
                  }
                  placeholder="Ej. PA12345 o RPA12345"
                  disabled={Boolean(editingReservationId)}
                />
              </Field>
              <Field label="Cliente">
                <div className="customer-picker">
                  <Input
                    list="monday-customers"
                    value={reservationDraft.customerName}
                    disabled={newReservationCustomer}
                    onChange={(e) => {
                      const name = e.target.value;
                      const match = reservationOptions?.customers.find(
                        (item) => folded(item.name) === folded(name),
                      );
                      setReservationDraft({
                        ...reservationDraft,
                        customerName: name,
                        customerId: match?.id || '',
                        phone: match?.phone || '',
                        customerEmail: match?.email || '',
                        school: match?.school || '',
                        articleId: match?.school ? '' : reservationDraft.articleId,
                      });
                    }}
                    placeholder="Selecciona un cliente de Monday"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const active = !newReservationCustomer;
                      setNewReservationCustomer(active);
                      setReservationDraft({
                        ...reservationDraft,
                        customerId: '',
                        customerName: active ? '' : reservationDraft.customerName,
                        phone: active ? '' : reservationDraft.phone,
                        customerEmail: active ? '' : reservationDraft.customerEmail,
                      });
                    }}
                  >
                    {newReservationCustomer ? 'Usar existente' : 'Nuevo'}
                  </Button>
                </div>
                <datalist id="monday-customers">
                  {reservationOptions?.customers.map((item) => (
                    <option key={item.id} value={item.name} />
                  ))}
                </datalist>
              </Field>
              {newReservationCustomer && (
                <Field label="Nombre del nuevo cliente">
                  <Input
                    value={reservationDraft.customerName}
                    onChange={(e) => setReservationDraft({
                      ...reservationDraft,
                      customerName: e.target.value,
                    })}
                    placeholder="Nombre y apellidos"
                  />
                </Field>
              )}
              <Field label="Teléfono">
                <Input
                  value={reservationDraft.phone}
                  onChange={(e) =>
                    setReservationDraft({
                      ...reservationDraft,
                      phone: e.target.value,
                    })
                  }
                />
              </Field>
              <Field label="E-mail">
                <Input
                  type="email"
                  value={reservationDraft.customerEmail}
                  onChange={(e) => setReservationDraft({
                    ...reservationDraft,
                    customerEmail: e.target.value,
                  })}
                  placeholder="cliente@email.com"
                />
              </Field>
              <Field label="Colegio">
                <select
                  value={reservationDraft.school}
                  onChange={(e) =>
                    setReservationDraft({
                      ...reservationDraft,
                      school: e.target.value,
                      articleId: '',
                    })
                  }
                >
                  <option value="">Selecciona un colegio</option>
                  {reservationOptions?.schools.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </Field>
              <Field label="Fecha reserva">
                <Input
                  type="date"
                  value={reservationDraft.date}
                  onChange={(e) =>
                    setReservationDraft({
                      ...reservationDraft,
                      date: e.target.value,
                    })
                  }
                />
              </Field>
              <Field label="Código / artículo">
                <select
                  value={reservationDraft.articleId}
                  disabled={!reservationDraft.school}
                  onChange={(e) =>
                    setReservationDraft({
                      ...reservationDraft,
                      articleId: e.target.value,
                    })
                  }
                >
                  <option value="">
                    {reservationDraft.school
                      ? 'Selecciona un artículo'
                      : 'Selecciona primero un colegio'}
                  </option>
                  {reservationArticles.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code}
                      {item.description ? ` · ${item.description}` : ''}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Talla">
                <Input
                  value={reservationDraft.size}
                  onChange={(e) =>
                    setReservationDraft({
                      ...reservationDraft,
                      size: e.target.value,
                    })
                  }
                />
              </Field>
              <Field label="Unidades">
                <Input
                  type="number"
                  min={1}
                  value={reservationDraft.units}
                  onChange={(e) =>
                    setReservationDraft({
                      ...reservationDraft,
                      units: Number(e.target.value),
                    })
                  }
                />
              </Field>
              <Field label="U. enviadas">
                <Input
                  type="number"
                  min={0}
                  value={reservationDraft.sentUnits}
                  onChange={(e) =>
                    setReservationDraft({
                      ...reservationDraft,
                      sentUnits: Number(e.target.value),
                    })
                  }
                />
              </Field>
              <Field label="U. pendientes">
                <Input
                  type="number"
                  min={0}
                  value={reservationDraft.pending}
                  onChange={(e) =>
                    setReservationDraft({
                      ...reservationDraft,
                      pending: Number(e.target.value),
                    })
                  }
                />
              </Field>
              <Field label="Pagada">
                <select
                  value={reservationDraft.paid}
                  onChange={(e) =>
                    setReservationDraft({
                      ...reservationDraft,
                      paid: e.target.value,
                    })
                  }
                >
                  {reservationOptions?.paid.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </Field>
              <Field label="Observaciones">
                <select
                  value={reservationDraft.observations}
                  onChange={(e) =>
                    setReservationDraft({
                      ...reservationDraft,
                      observations: e.target.value,
                    })
                  }
                >
                  <option value="">Sin indicar</option>
                  {reservationOptions?.observations.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </Field>
              <Field label="Estado">
                <select
                  value={reservationDraft.status}
                  onChange={(e) =>
                    setReservationDraft({
                      ...reservationDraft,
                      status: e.target.value,
                    })
                  }
                >
                  <option value="">Sin estado</option>
                  {reservationOptions?.status.map((item) => (
                    <option key={item}>{item}</option>
                  ))}
                </select>
              </Field>
              <Field label="Fecha fin">
                <Input
                  type="date"
                  value={reservationDraft.endDate}
                  onChange={(e) =>
                    setReservationDraft({
                      ...reservationDraft,
                      endDate: e.target.value,
                    })
                  }
                />
              </Field>
              <Field label="Entrega estimada producción">
                <Input
                  type="date"
                  value={reservationDraft.estimatedProduction}
                  onChange={(e) =>
                    setReservationDraft({
                      ...reservationDraft,
                      estimatedProduction: e.target.value,
                    })
                  }
                />
              </Field>
              <Field label="Fórmula (calculada por Monday)">
                <Input value={reservationDraft.formula} disabled />
              </Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(null)}>
              Cancelar
            </Button>
            <Button
              className="save-reservation"
              disabled={reservationLoading || reservationSaving}
              onClick={() => void save('reserva')}
            >
              {reservationSaving
                ? 'Guardando…'
                : editingReservationId
                  ? 'Guardar cambios'
                  : 'Crear en Monday'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={modal === 'reserva-creada'}
        onOpenChange={(open) => !open && setModal(null)}
      >
        <DialogContent className="reservation-result-dialog">
          <DialogHeader>
            <DialogTitle>Reserva creada</DialogTitle>
            <DialogDescription>
              La reserva se ha guardado correctamente en Monday.
            </DialogDescription>
          </DialogHeader>
          {createdReservation && (
            <ReservationPrintCard record={createdReservation} />
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(null)}>
              Cerrar
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                createdReservation &&
                requestReservationPrint(createdReservation, 'label')
              }
            >
              <Tag /> Generar etiqueta
            </Button>
            <Button
              onClick={() =>
                createdReservation &&
                requestReservationPrint(createdReservation)
              }
            >
              <Printer /> Imprimir reserva
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={modal === 'email'}
        onOpenChange={(open) => !open && setModal(null)}
      >
        <DialogContent className="email-dialog">
          <DialogHeader>
            <div className="modal-icon blue"><Mail /></div>
            <DialogTitle>Preparar aviso al cliente</DialogTitle>
            <DialogDescription>
              Revisa los datos y elige si quieres abrir el mensaje en el correo o en WhatsApp.
            </DialogDescription>
          </DialogHeader>
          {emailDraft && (
            <div className="email-form">
              <Field label="Tipo de entrega">
                <select value={emailDraft.delivery} onChange={(event) => updateGeneratedEmail({ delivery: event.target.value as DeliveryEmailKind })}>
                  <option value="colegio">Entrega en colegio</option>
                  <option value="domicilio">Envío a domicilio</option>
                  <option value="tienda">Recogida en tienda</option>
                </select>
              </Field>
              <Field label="Email del cliente">
                <Input type="email" value={emailDraft.to} onChange={(event) => setEmailDraft({ ...emailDraft, to: event.target.value })} placeholder="cliente@email.com" />
              </Field>
              <Field label="Teléfono del cliente">
                <Input type="tel" value={emailDraft.phone} onChange={(event) => setEmailDraft({ ...emailDraft, phone: event.target.value })} placeholder="Ej. 612345678" />
              </Field>
              {emailDraft.delivery === 'colegio' && (
                <Field label="Colegio">
                  <Input value={emailDraft.school} onChange={(event) => updateGeneratedEmail({ school: event.target.value })} placeholder="Nombre del colegio" />
                </Field>
              )}
              {emailDraft.delivery === 'domicilio' && (
                <div className="email-home-fields">
                  <Field label="Empresa de transporte">
                    <select value={emailDraft.carrier} onChange={(event) => updateGeneratedEmail({ carrier: event.target.value as EmailDraft['carrier'] })}>
                      <option value="viaxpress">ViaXpress</option>
                      <option value="dhl">DHL</option>
                    </select>
                  </Field>
                  <Field label="Número de envío">
                    <Input value={emailDraft.trackingNumber} onChange={(event) => updateGeneratedEmail({ trackingNumber: event.target.value })} placeholder="Introduce el nº de envío" />
                  </Field>
                </div>
              )}
              <Field label="Asunto">
                <Input value={emailDraft.subject} onChange={(event) => setEmailDraft({ ...emailDraft, subject: event.target.value })} />
              </Field>
              <Field label="Mensaje">
                <Textarea value={emailDraft.body} onChange={(event) => setEmailDraft({ ...emailDraft, body: event.target.value })} rows={7} />
              </Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(null)}>Cancelar</Button>
            <Button variant="outline" onClick={() => void copyEmailText()}>Copiar texto</Button>
            <Button className="whatsapp-action" onClick={launchWhatsApp}><Phone /> Abrir WhatsApp</Button>
            <Button onClick={launchEmail}><Mail /> Abrir correo</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={shippingOpen}
        onOpenChange={(open) => {
          if (!shippingLoading) setShippingOpen(open);
        }}
      >
        <DialogContent className="shipping-dialog">
          <DialogHeader>
            <div className="modal-icon blue">
              <Truck />
            </div>
            <DialogTitle>¿Cuándo se hizo el envío?</DialogTitle>
            <DialogDescription>
              Elige la referencia exacta que quieres localizar en Paddy Packing
              List.
            </DialogDescription>
          </DialogHeader>
          <div className="shipping-reference-picker">
            <label>
              <span>Referencia a buscar</span>
              <select
                value={shippingReference}
                disabled={shippingLoading}
                onChange={(event) => {
                  setShippingReference(event.target.value);
                  setShipments(null);
                }}
              >
                {(() => {
                  const match = normalized.match(/^(?:I|R)?PA(.+)$/i);
                  const suffix = match?.[1] || normalized;
                  return [`PA${suffix}`, `IPA${suffix}`, `RPA${suffix}`].map(
                    (reference) => (
                      <option key={reference} value={reference}>
                        {reference}
                      </option>
                    ),
                  );
                })()}
              </select>
            </label>
            <Button
              disabled={shippingLoading}
              onClick={() => void checkShipping()}
            >
              <Search /> Buscar esta referencia
            </Button>
          </div>
          {shippingLoading ? (
            <div className="shipping-loading">
              <RefreshCw className="spin" />
              Buscando en Paddy Packing List…
            </div>
          ) : shipments === null ? (
            <div className="shipping-empty shipping-prompt">
              <Archive />
              <b>Selecciona una referencia</b>
              <span>Buscaremos exactamente el PA, IPA o RPA elegido.</span>
            </div>
          ) : shipments.length ? (
            <div className="shipment-list">
              {shipments.map((item, index) => (
                <article
                  className="shipment-result"
                  key={`${item.file}-${index}`}
                >
                  <span className="shipment-ok">
                    <Check />
                  </span>
                  <div>
                    <small>Fecha de envío</small>
                    <strong>
                      {item.date
                        ? new Intl.DateTimeFormat('es-ES', {
                            dateStyle: 'long',
                          }).format(new Date(`${item.date}T12:00:00`))
                        : 'No indicada'}
                    </strong>
                    <dl>
                      <div>
                        <dt>Colegio</dt>
                        <dd>{item.school}</dd>
                      </div>
                      <div>
                        <dt>Caja</dt>
                        <dd>{item.box || 'No indicada'}</dd>
                      </div>
                      <div>
                        <dt>Pedido registrado</dt>
                        <dd>{item.order}</dd>
                      </div>
                      <div>
                        <dt>Archivo</dt>
                        <dd>{item.file}</dd>
                      </div>
                    </dl>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="shipping-empty">
              <Archive />
              <b>No aparece en los PackingList</b>
              <span>
                No se ha encontrado la referencia {shippingReference} en los
                PackingList guardados.
              </span>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShippingOpen(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={modal === 'reservas'}
        onOpenChange={(open) => !open && setModal(null)}
      >
        <DialogContent className="registry-dialog reservation-registry-dialog">
          <DialogHeader>
            <div className="modal-icon green"><CalendarDays /></div>
            <DialogTitle>Reservas</DialogTitle>
            <DialogDescription>
              Consulta las reservas de Monday y completa desde aquí cualquier casilla pendiente.
            </DialogDescription>
          </DialogHeader>
          <div className="registry-tools">
            <Input
              value={registryFilter}
              onChange={(e) => setRegistryFilter(e.target.value)}
              placeholder="Buscar reserva, cliente, teléfono, colegio o artículo…"
            />
            <Button onClick={() => void openReservation()}>
              <CalendarDays /> Generar reserva libre
            </Button>
          </div>
          <div className="registry-list">
            {reservationsLoading ? (
              <div className="registry-empty"><RefreshCw className="spin" /> Cargando reservas…</div>
            ) : visibleReservationRows.length ? (
              <div className="reservation-table-wrap">
                <table className="reservation-table">
                  <thead><tr>
                    {['Nº RESERVA', 'CLIENTE', 'TELÉFONO', 'COLEGIO', 'FECHA RESERVA', 'CÓDIGO ART.', 'DESCRIPCIÓN ARTÍCULO', 'TALLA', 'UDS.', 'U. ENVIADAS', 'U. PENDIENTES', 'PAGADA', 'OBSERVACIONES', 'ESTADO', 'FECHA FIN', 'ENTREGA ESTIMADA PRODUCCIÓN', 'FÓRMULA', 'EDITAR', 'ETIQUETA'].map((heading) => <th key={heading}>{heading}</th>)}
                  </tr></thead>
                  <tbody>
                    {visibleReservationRows.map((row) => (
                      <tr key={row.id}>
                        <td><b>{row.reference || row.id}</b></td>
                        <td>{row.customer || 'Pendiente'}</td>
                        <td>{row.phone || 'Pendiente'}</td>
                        <td>{row.school || 'Pendiente'}</td>
                        <td>{row.date || 'Pendiente'}</td>
                        <td>{row.code || 'Pendiente'}</td>
                        <td>{row.articleDescription || row.article || 'Pendiente'}</td>
                        <td>{row.size || 'Pendiente'}</td>
                        <td>{row.units || 'Pendiente'}</td>
                        <td>{row.sentUnits || 'Pendiente'}</td>
                        <td>{row.pending || 'Pendiente'}</td>
                        <td>{row.paid || 'Pendiente'}</td>
                        <td>{row.observations || 'Pendiente'}</td>
                        <td>{row.status || 'Pendiente'}</td>
                        <td>{row.endDate || 'Pendiente'}</td>
                        <td>{row.estimatedProduction || 'Pendiente'}</td>
                        <td>{row.formula || 'Calculada en Monday'}</td>
                        <td className="reservation-table-edit">
                          <Button onClick={() => void openReservation(row)}>Completar / editar</Button>
                        </td>
                        <td className="reservation-table-actions">
                          <Button variant="outline" onClick={() => requestReservationPrint(row, 'label')}><Printer /> Imprimir etiqueta</Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="registry-empty"><Archive /><b>No hay reservas para mostrar</b><span>Prueba a cambiar la búsqueda.</span></div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(null)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={modal === 'registro' || modal === 'recogidas'}
        onOpenChange={(open) => !open && setModal(null)}
      >
        <DialogContent className="registry-dialog">
          <DialogHeader>
            <div
              className={`modal-icon ${modal === 'recogidas' ? 'green' : 'orange'}`}
            >
              {modal === 'recogidas' ? <Shirt /> : <ClipboardList />}
            </div>
            <DialogTitle>
              {modal === 'recogidas'
                ? 'Prendas para recoger en colegios'
                : 'Registro de incidencias'}
            </DialogTitle>
            <DialogDescription>
              {modal === 'recogidas'
                ? 'Marca las prendas cuando hayan llegado.'
                : 'Consulta y reimprime cualquier incidencia generada.'}
            </DialogDescription>
          </DialogHeader>
          <div className="registry-tools">
            <Input
              value={registryFilter}
              onChange={(e) => setRegistryFilter(e.target.value)}
              placeholder="Buscar pedido, cliente, colegio o artículo…"
            />
            {modal === 'recogidas' && (
              <label className="show-received">
                <input
                  type="checkbox"
                  checked={showReceivedPickups}
                  onChange={(e) => setShowReceivedPickups(e.target.checked)}
                />{' '}
                Mostrar también las recibidas
              </label>
            )}
          </div>
          <div className="registry-list">
            {registryLoading ? (
              <div className="registry-empty">
                <RefreshCw className="spin" /> Cargando el registro…
              </div>
            ) : visibleRegistryRows.length ? (
              visibleRegistryRows.map((row) => (
                <article
                  className="registry-row"
                  key={`${modal}-${row.orderNumber}`}
                >
                  <div className="registry-reference">
                    <b>#{row.orderNumber}</b>
                    <small>{row.incidentDate || 'Sin fecha'}</small>
                  </div>
                  <div className="registry-summary">
                    <b>{row.customerName || 'Cliente sin nombre'}</b>
                    <span>
                      {modal === 'recogidas'
                        ? row.pickupDetails || 'Sin detalle de prendas'
                        : row.incidentText || 'Sin descripción'}
                    </span>
                    {modal === 'registro' && (
                      <>
                        <small>
                          Email: {row.customerEmail || 'No indicado'}
                        </small>
                        <small>
                          Observaciones:{' '}
                          {row.observations || 'Sin observaciones'}
                        </small>
                      </>
                    )}
                    <small>
                      {row.pickupSchoolName ||
                        row.school ||
                        'Colegio sin indicar'}
                    </small>
                  </div>
                  <span
                    className={`status ${modal === 'recogidas' ? (row.pickupReceived ? 'status-green' : 'status-amber') : row.solved ? 'status-green' : 'status-amber'}`}
                  >
                    {modal === 'recogidas'
                      ? row.pickupReceived
                        ? 'Recibida'
                        : 'Pendiente'
                      : row.solved
                        ? 'Resuelta'
                        : 'Pendiente'}
                  </span>
                  <div className="registry-actions">
                    {modal === 'registro' ? (
                      <>
                        <Button
                          variant="outline"
                          onClick={() => showIncidentDocument(row)}
                        >
                          Ver
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => printIncidentDocument(row)}
                        >
                          <Printer /> Reimprimir
                        </Button>
                        {!row.solved && (
                          <Button onClick={() => void setIncidentSolved(row, true)}>
                            <Check /> Cerrar incidencia
                          </Button>
                        )}
                      </>
                    ) : (
                      <Button
                        variant={row.pickupReceived ? 'outline' : 'default'}
                        onClick={() =>
                          void setPickupReceived(row, !row.pickupReceived)
                        }
                      >
                        {row.pickupReceived
                          ? 'Volver a pendiente'
                          : 'Marcar recibida'}
                      </Button>
                    )}
                  </div>
                </article>
              ))
            ) : (
              <div className="registry-empty">
                <Archive />
                <b>No hay registros para mostrar</b>
                <span>Prueba a cambiar la búsqueda o los filtros.</span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(null)}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog
        open={modal === 'detalle-incidencia'}
        onOpenChange={(open) => !open && setModal(null)}
      >
        <DialogContent className="incident-document-dialog">
          <DialogHeader>
            <DialogTitle>
              Incidencia #{selectedIncident?.orderNumber}
            </DialogTitle>
            <DialogDescription>
              Documento guardado en el registro compartido.
            </DialogDescription>
          </DialogHeader>
          {selectedIncident && <IncidentDocument incident={selectedIncident} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(null)}>
              Cerrar
            </Button>
            <Button
              onClick={() =>
                selectedIncident && printIncidentDocument(selectedIncident)
              }
            >
              <Printer /> Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {printIncident && (
        <div
          className={`print-sheet ${printMode === 'label' ? 'print-label-sheet' : ''}`}
        >
          {printMode === 'label' ? (
            <IncidentLabel incident={printIncident} />
          ) : (
            <IncidentDocument incident={printIncident} />
          )}
        </div>
      )}
      {printReservation && (
        <div
          className={`print-sheet ${reservationPrintMode === 'label' ? 'reservation-label-sheet' : 'reservation-print-sheet'}`}
        >
          {reservationPrintMode === 'label' ? (
            <ReservationLabel record={printReservation} />
          ) : (
            <ReservationPrintCard record={printReservation} />
          )}
        </div>
      )}
    </main>
  );
}

function IncidentLabel({ incident }: { incident: Incident }) {
  const rawDate = incident.incidentDate?.slice(0, 10) || '';
  const shownDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
    ? `${rawDate.slice(8, 10)}/${rawDate.slice(5, 7)}/${rawDate.slice(0, 4)}`
    : rawDate;
  const lines = [
    `INCIDENCIA ${incident.orderNumber}`,
    `NOMBRE: ${incident.customerName || 'SIN NOMBRE'}`,
    `FECHA: ${shownDate}`,
    `RECOGIDA ${incident.pickupSchoolName || incident.school || 'SIN COLEGIO'}`,
  ];
  const sizeFor = (text: string) =>
    text.length > 46
      ? 11
      : text.length > 40
        ? 12.5
        : text.length > 34
          ? 14.5
          : 17;
  return (
    <article className="incident-label">
      {lines.map((line) => (
        <p key={line} style={{ fontSize: `${sizeFor(line)}pt` }}>
          {line.toUpperCase()}
        </p>
      ))}
    </article>
  );
}

function IncidentDocument({ incident }: { incident: Incident }) {
  return (
    <article className="incident-document">
      <header>
        <div>
          <span>DETALLE · GESTIÓN UNIFICADA</span>
          <h1>Incidencia de pedido</h1>
        </div>
        <b>#{incident.orderNumber}</b>
      </header>
      <section className="document-meta">
        <div>
          <small>Fecha</small>
          <b>{incident.incidentDate || 'No indicada'}</b>
        </div>
        <div>
          <small>Estado</small>
          <b>{incident.solved ? 'Resuelta' : 'Pendiente'}</b>
        </div>
        <div>
          <small>Colegio</small>
          <b>{incident.school || incident.pickupSchoolName || 'No indicado'}</b>
        </div>
      </section>
      <section>
        <h2>Cliente</h2>
        <p>
          <b>{incident.customerName || 'No indicado'}</b>
          <br />
          {[incident.customerPhone, incident.customerEmail]
            .filter(Boolean)
            .join(' · ')}
        </p>
      </section>
      <section>
        <h2>Incidencia</h2>
        <p>{incident.incidentText || 'Sin descripción'}</p>
      </section>
      {incident.observations && (
        <section>
          <h2>Observaciones</h2>
          <p>{incident.observations}</p>
        </section>
      )}
      {incident.pickupSchool && (
        <section className="document-pickup">
          <h2>Recoger en el colegio</h2>
          <p>
            <b>
              {incident.pickupSchoolName || 'Colegio sin indicar'} ·{' '}
              {incident.pickupReceived ? 'RECIBIDO' : 'PENDIENTE'}
            </b>
          </p>
          <p>{incident.pickupDetails || 'Sin detalle de prendas'}</p>
          {incident.pickupReceivedAt && (
            <small>
              Fecha de recepción: {incident.pickupReceivedAt.replace('T', ' ')}
            </small>
          )}
        </section>
      )}
    </article>
  );
}

function ReservationPrintCard({ record }: { record: MondayRecord }) {
  const formatDate = (value: string) => {
    const raw = value?.slice(0, 10) || '';
    return /^\d{4}-\d{2}-\d{2}$/.test(raw)
      ? `${raw.slice(8, 10)}/${raw.slice(5, 7)}/${raw.slice(0, 4)}`
      : value || 'No indicada';
  };
  return (
    <article className="reservation-print-card">
      <div className="reservation-print-accent">
        <CalendarDays />
      </div>
      <div className="reservation-print-content">
        <span>MONDAY · REGISTRO RESERVAS</span>
        <h2>Reserva {record.reference || record.id || 'registrada'}</h2>
        <dl>
          <div>
            <dt>Número de reserva</dt>
            <dd>{record.reference || record.id || 'No indicado'}</dd>
          </div>
          <div>
            <dt>Estado</dt>
            <dd>{record.status || 'Sin estado'}</dd>
          </div>
          <div>
            <dt>Cliente</dt>
            <dd>{record.customer || 'No indicado'}</dd>
          </div>
          <div>
            <dt>Teléfono</dt>
            <dd>{record.phone || 'No indicado'}</dd>
          </div>
          <div>
            <dt>Colegio</dt>
            <dd>{record.school || 'No indicado'}</dd>
          </div>
          <div>
            <dt>Fecha de reserva</dt>
            <dd>{formatDate(record.date)}</dd>
          </div>
          <div>
            <dt>Código</dt>
            <dd>{record.code || 'No indicado'}</dd>
          </div>
          <div className="wide">
            <dt>Descripción del artículo</dt>
            <dd>
              {record.articleDescription || record.article || 'No indicada'}
            </dd>
          </div>
          <div>
            <dt>Talla</dt>
            <dd>{record.size || 'No indicada'}</dd>
          </div>
          <div>
            <dt>Unidades</dt>
            <dd>{record.units || 'No indicadas'}</dd>
          </div>
          <div>
            <dt>Unidades pendientes</dt>
            <dd>{record.pending || 'No indicadas'}</dd>
          </div>
          <div>
            <dt>Pagada</dt>
            <dd>{record.paid || 'No indicado'}</dd>
          </div>
          <div className="wide">
            <dt>Observaciones</dt>
            <dd>{record.observations || 'Sin observaciones'}</dd>
          </div>
          <div className="wide">
            <dt>Última actualización en Monday</dt>
            <dd>{formatDate(record.updatedAt)}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}

function ReservationLabel({ record }: { record: MondayRecord }) {
  const rawDate = record.updatedAt?.slice(0, 10) || '';
  const shownDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate)
    ? `${rawDate.slice(8, 10)}/${rawDate.slice(5, 7)}/${rawDate.slice(0, 4)}`
    : rawDate;
  const lines = [
    `RESERVA ${record.reference}`,
    `NOMBRE: ${record.customer || 'SIN NOMBRE'}`,
    `FECHA: ${shownDate}`,
    `COLEGIO: ${record.school || 'SIN COLEGIO'}`,
  ];
  const sizeFor = (text: string) =>
    text.length > 46
      ? 11
      : text.length > 40
        ? 12.5
        : text.length > 34
          ? 14.5
          : 17;
  return (
    <article className="reservation-label">
      {lines.map((line) => (
        <p key={line} style={{ fontSize: `${sizeFor(line)}pt` }}>
          {line.toUpperCase()}
        </p>
      ))}
    </article>
  );
}

function Items({ order, units }: { order: Order; units: number }) {
  return (
    <article className="items-card">
      <div className="section-head">
        <div>
          <h3>Artículos del pedido</h3>
          <p>
            {order.items.length} artículos · {units} unidades
          </p>
        </div>
      </div>
      {order.items.map((item) => (
        <div className="item-row" key={item.id}>
          <div className="product-thumb">
            <Shirt />
          </div>
          <div className="product-name">
            <b>{item.name}</b>
            <small>{item.sku}</small>
          </div>
          <div>
            <small>Talla</small>
            <b>{item.size}</b>
          </div>
          <div>
            <small>Uds.</small>
            <b>{item.quantity}</b>
          </div>
          <strong>{item.total}</strong>
        </div>
      ))}
    </article>
  );
}
function IncidentCard({
  incident,
  onPrintIncident,
}: {
  incident: Incident;
  onPrintIncident: (
    incident: Incident,
    mode?: 'document' | 'label',
  ) => void;
}) {
  return (
    <article className="linked-card incident-live">
      <div className="linked-accent">
        <AlertTriangle />
      </div>
      <div className="linked-main">
        <div className="section-head">
          <div>
            <span className="linked-type">
              Incidencia nº {incident.orderNumber || 'sin número'}
            </span>
            <h3>{incident.incidentText || 'Incidencia registrada'}</h3>
          </div>
          <span
            className={`status ${incident.solved ? 'status-green' : 'status-amber'}`}
          >
            {incident.solved ? 'Resuelta' : 'Pendiente'}
          </span>
        </div>
        <dl className="incident-details">
          <div>
            <dt>Fecha</dt>
            <dd>{incident.incidentDate || 'No indicada'}</dd>
          </div>
          <div>
            <dt>Cliente</dt>
            <dd>{incident.customerName || 'No indicado'}</dd>
          </div>
          <div>
            <dt>Colegio</dt>
            <dd>
              {incident.school || incident.pickupSchoolName || 'No indicado'}
            </dd>
          </div>
          <div>
            <dt>Recogida</dt>
            <dd>
              {incident.pickupSchool
                ? incident.pickupReceived
                  ? 'Recibida'
                  : 'Pendiente'
                : 'No solicitada'}
            </dd>
          </div>
          {incident.pickupDetails && (
            <div className="wide">
              <dt>Detalles de recogida</dt>
              <dd>{incident.pickupDetails}</dd>
            </div>
          )}
        </dl>
        {incident.recurrenceCount > 0 && (
          <div className="meta-line">
            <span>{incident.recurrenceCount} recurrencia(s) registrada(s)</span>
          </div>
        )}
        <div className="reservation-card-actions">
          <Button
            variant="outline"
            onClick={() => onPrintIncident(incident, 'label')}
          >
            <Tag /> Imprimir etiqueta
          </Button>
          <Button onClick={() => onPrintIncident(incident, 'document')}>
            <Printer /> Imprimir
          </Button>
        </div>
      </div>
    </article>
  );
}
function MondayCards({
  records,
  onPrintReservation,
  onEmailReservation,
}: {
  records: MondayRecord[];
  onPrintReservation: (record: MondayRecord, mode?: 'card' | 'label') => void;
  onEmailReservation: (record: MondayRecord) => void;
}) {
  return (
    <>
      {records.map((record) => (
        <article
          className={`linked-card monday-live ${record.kind}`}
          key={`${record.kind}-${record.id}`}
        >
          <div className="linked-accent">
            {record.kind === 'reserva' ? <CalendarDays /> : <Shirt />}
          </div>
          <div className="linked-main">
            <div className="section-head">
              <div>
                <span className="linked-type">
                  {record.kind === 'reserva'
                    ? `Reserva nº ${record.reference || record.id}`
                    : `Monday · ${record.board}`}
                </span>
                <h3>
                  {record.article ||
                    record.specialDetails ||
                    (record.kind === 'reserva'
                      ? 'Reserva registrada'
                      : 'Prenda especial')}
                </h3>
              </div>
              {record.status && (
                <span className="status status-green">{record.status}</span>
              )}
            </div>
            <dl className="incident-details">
              <div>
                <dt>Cliente</dt>
                <dd>{record.customer || 'No indicado'}</dd>
              </div>
              <div>
                <dt>Teléfono</dt>
                <dd>{record.phone || 'No indicado'}</dd>
              </div>
              <div>
                <dt>Colegio</dt>
                <dd>{record.school || 'No indicado'}</dd>
              </div>
              <div>
                <dt>Fecha</dt>
                <dd>{record.date || 'No indicada'}</dd>
              </div>
              <div>
                <dt>Código</dt>
                <dd>{record.code || 'No indicado'}</dd>
              </div>
              {record.kind === 'reserva' && (
                <div className="wide">
                  <dt>Descripción del artículo</dt>
                  <dd>
                    {record.articleDescription ||
                      record.article ||
                      'No indicada'}
                  </dd>
                </div>
              )}
              <div>
                <dt>Talla / unidades</dt>
                <dd>
                  {[record.size, record.units && `${record.units} uds.`]
                    .filter(Boolean)
                    .join(' · ') || 'No indicado'}
                </dd>
              </div>
              {record.specialDetails && (
                <div className="wide">
                  <dt>Datos de la prenda especial</dt>
                  <dd>{record.specialDetails}</dd>
                </div>
              )}
              {record.observations && (
                <div className="wide">
                  <dt>Observaciones</dt>
                  <dd>{record.observations}</dd>
                </div>
              )}
            </dl>
            {record.kind === 'reserva' && (
              <div className="reservation-card-actions">
                <Button
                  variant="outline"
                  onClick={() => onPrintReservation(record, 'label')}
                >
                  <Tag /> Imprimir etiqueta
                </Button>
                <Button onClick={() => onPrintReservation(record, 'card')}>
                  <Printer /> Imprimir
                </Button>
                <Button variant="outline" onClick={() => onEmailReservation(record)}>
                  <Mail /> Preparar email
                </Button>
              </div>
            )}
          </div>
        </article>
      ))}
    </>
  );
}
