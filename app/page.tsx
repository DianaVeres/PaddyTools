'use client';

import {
  FormEvent,
  PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Archive,
  CalendarDays,
  Check,
  ChevronRight,
  ClipboardList,
  FileText,
  Mail,
  Phone,
  Printer,
  RefreshCw,
  Search,
  Shirt,
  Tag,
  Trash2,
  Truck,
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
import { readJsonResponse } from '@/lib/http-response';
import {
  incidentLabelLines,
  incidentStatusLabel,
  type IncidentRecord as Incident,
} from '@/lib/incident-record';
import { canDeleteIncidents } from '@/lib/permissions';
import {
  foldSearchText as folded,
  isExactRecordReference,
  incidentStorageReference,
  isWooOrderReference,
  linkedWooOrderReference,
  normalizeReferenceInput,
  reservationStorageReference,
  shippingReferences,
} from '@/lib/global-search';
import { printStandaloneLabel } from '@/lib/label-print';
import {
  createDeliveryEmailDraft,
  deliveryKindFromText,
  updateDeliveryEmailDraft,
  type DeliveryEmailDraft as EmailDraft,
  type DeliveryEmailKind,
} from '@/lib/delivery-message';
import {
  buildEmailLink,
  buildWhatsAppLink,
  isValidEmail,
} from '@/lib/contact-links';
import {
  normalizeOrderNoteContent,
  normalizeOrderNoteReference,
  type OrderNoteKind,
  type OrderNoteRecord as OrderNote,
} from '@/lib/order-note';
import type { StoreTicketRecord as StoreTicket } from '@/lib/store-ticket';
import type {
  DashboardModal as Modal,
  DashboardMondayRecord as MondayRecord,
  DashboardOrder as Order,
  DashboardShipment as Shipment,
  IncidentDraft,
  MondayUpdate,
  OrderSearchMatch,
  ReservationDraft,
  ReservationOptions,
  SchoolProduct,
  SessionUser,
} from '@/lib/dashboard-types';
import {
  DashboardField as Field,
  formatDashboardDate as fmt,
} from '@/components/dashboard/common';
import { ReservationPrintCard } from '@/components/dashboard/print-components';
import { OrderItems as Items } from '@/components/dashboard/order-items';
import { StoreTicketCard } from '@/components/dashboard/store-ticket-card';
import { OrderActivity } from '@/components/dashboard/order-activity';
import { OrderMovements } from '@/components/dashboard/order-movements';
import { OrderDocuments } from '@/components/dashboard/order-documents';
import { OrderNotesCard } from '@/components/dashboard/order-notes-card';
import { OrderFollowUp } from '@/components/dashboard/order-follow-up';
import { OrderSummary } from '@/components/dashboard/order-summary';
import { OrderHeading } from '@/components/dashboard/order-heading';
import { OrderLinkedRecords } from '@/components/dashboard/order-linked-records';
import { DashboardHeader } from '@/components/dashboard/dashboard-header';
import { GlobalSearchPanel } from '@/components/dashboard/global-search-panel';
import { DashboardFeedback } from '@/components/dashboard/dashboard-feedback';
import { ConnectedResults } from '@/components/dashboard/connected-results';
import { PrintSheets } from '@/components/dashboard/print-sheets';
import { IncidentDocumentDialog } from '@/components/dashboard/incident-document-dialog';
import { IncidentFormDialog } from '@/components/dashboard/incident-form-dialog';
import { ReservationFormDialog } from '@/components/dashboard/reservation-form-dialog';

export default function Home() {
  const today = new Date().toLocaleDateString('en-CA');
  const [query, setQuery] = useState('');
  const [orderSearchMatches, setOrderSearchMatches] = useState<
    OrderSearchMatch[]
  >([]);
  const [incidentSearchMatches, setIncidentSearchMatches] = useState<
    Incident[]
  >([]);
  const [order, setOrder] = useState<Order | null>(null);
  const [incident, setIncident] = useState<Incident | null>(null);
  const [mondayRecords, setMondayRecords] = useState<MondayRecord[]>([]);
  const [ticket, setTicket] = useState<StoreTicket | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [modal, setModal] = useState<Modal>(null);
  const [saved, setSaved] = useState('');
  const [returnUpdating, setReturnUpdating] = useState(false);
  const [documentLoading, setDocumentLoading] = useState<
    'invoice' | 'packing-slip' | null
  >(null);
  const [reservationDialogOffset, setReservationDialogOffset] = useState({
    x: 0,
    y: 0,
  });
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
      x: Math.min(
        drag.maxX,
        Math.max(drag.minX, drag.originX + event.clientX - drag.startX),
      ),
      y: Math.min(
        drag.maxY,
        Math.max(drag.minY, drag.originY + event.clientY - drag.startY),
      ),
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
        const data = await readJsonResponse<{ user: SessionUser }>(response);
        setSessionUser(data.user);
        const initialView = new URLSearchParams(window.location.search).get(
          'view',
        );
        if (initialView === 'incidencias') {
          window.history.replaceState({}, '', window.location.pathname);
          await openRegistry('registro');
        }
        const pendingDelete = new URLSearchParams(window.location.search).get(
          'deleteIncident',
        );
        if (pendingDelete) {
          window.history.replaceState({}, '', window.location.pathname);
          if (!canDeleteIncidents(data.user)) {
            window.alert(
              'Tu usuario no tiene permiso para eliminar incidencias.',
            );
            return;
          }
          if (
            !window.confirm(
              `¿Eliminar la incidencia #${pendingDelete}? No volverá a aparecer en el registro.`,
            )
          )
            return;
          const deleteResponse = await fetch('/api/incidents', {
            method: 'DELETE',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ orderNumber: pendingDelete }),
          });
          const deleteData = await readJsonResponse<{
            deleted?: boolean;
            error?: string;
          }>(deleteResponse);
          if (!deleteResponse.ok || !deleteData.deleted) {
            window.alert(
              deleteData.error || 'No se pudo eliminar la incidencia.',
            );
            return;
          }
          window.location.assign('/');
        }
      })
      .catch(() => window.location.assign('/login'));
  }, []);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.assign('/login');
  }

  useEffect(() => {
    if (
      new URLSearchParams(window.location.search).get('cleanup') !==
      'f8626767-5497-41dd-8d0a-cc43668155d8'
    )
      return;
    void fetch('/api/monday?maintenance=f8626767-5497-41dd-8d0a-cc43668155d8')
      .then(async (response) => {
        const result = await readJsonResponse<{
          removed?: boolean;
          message?: string;
          error?: string;
        }>(response);
        if (!response.ok)
          throw new Error(
            result.error || 'No se pudo eliminar la columna ETIQUETA.',
          );
        setSaved(
          result.removed
            ? 'Columna ETIQUETA eliminada de Monday.'
            : result.message || 'La columna ETIQUETA ya no existe.',
        );
      })
      .catch((error) =>
        setSaved(
          error instanceof Error
            ? error.message
            : 'No se pudo eliminar la columna ETIQUETA.',
        ),
      );
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
    sent: false,
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
  const [deletingIncident, setDeletingIncident] = useState('');
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
  const [mondayUpdates, setMondayUpdates] = useState<MondayUpdate[]>([]);
  const [mondayUpdatesLoading, setMondayUpdatesLoading] = useState(false);
  const [notesLoading, setNotesLoading] = useState(false);
  const [noteDeletingId, setNoteDeletingId] = useState('');
  const [noteKind, setNoteKind] = useState<OrderNoteKind>('nota');
  const [noteDraft, setNoteDraft] = useState('');
  const [emailDraft, setEmailDraft] = useState<EmailDraft | null>(null);
  const normalized = useMemo(() => normalizeReferenceInput(query), [query]);
  const mondayUpdateItemIds = useMemo(
    () =>
      [
        ...new Set(
          mondayRecords
            .filter((record) => record.kind === 'reserva')
            .map((record) => record.id)
            .filter(Boolean),
        ),
      ]
        .sort()
        .join(','),
    [mondayRecords],
  );
  const linkedOrderNumber = useMemo(
    () => linkedWooOrderReference(normalized),
    [normalized],
  );
  const reservationArticles = useMemo(() => {
    const articles = reservationOptions?.articles || [];
    const school = folded(reservationDraft.school);
    if (!school) return [];
    const ignoredWords = new Set([
      'colegio',
      'colegios',
      'escuela',
      'centro',
      'ceip',
      'ies',
      'san',
      'santa',
      'del',
      'las',
      'los',
    ]);
    const schoolWords = reservationDraft.school
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((word) => word.length >= 4 && !ignoredWords.has(word));
    const matches = articles.filter((item) => {
      const article = folded(`${item.code} ${item.description}`);
      return (
        article.includes(school) ||
        schoolWords.some((word) => article.includes(folded(word)))
      );
    });
    return matches.length ? matches : articles;
  }, [reservationDraft.school, reservationOptions]);

  function openEmailComposer(
    input: Omit<EmailDraft, 'subject' | 'body' | 'carrier' | 'trackingNumber'>,
  ) {
    setEmailDraft(createDeliveryEmailDraft(input));
    setModal('email');
    setSaved('');
  }

  function updateGeneratedEmail(changes: Partial<EmailDraft>) {
    setEmailDraft((current) => {
      if (!current) return current;
      return updateDeliveryEmailDraft(current, changes);
    });
  }

  async function openOrderEmail() {
    if (!order) return;
    const method = folded(order.shippingMethod);
    const delivery = deliveryKindFromText(method, 'domicilio');
    const linkedReservation = mondayRecords.find(
      (record) => record.kind === 'reserva',
    );
    let school = linkedReservation?.school || '';
    // En los pedidos de colegio, PackingList es la fuente principal del colegio.
    if (delivery === 'colegio' && !school) {
      try {
        const response = await fetch(
          `/api/shipping?order=${encodeURIComponent(order.number)}`,
          { cache: 'no-store' },
        );
        const data = await readJsonResponse<{ matches?: Shipment[] }>(response);
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
    const delivery = deliveryKindFromText(observation, 'tienda');
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
      setSaved(
        'No se pudo copiar automáticamente. Puedes seleccionar el texto en el cuadro.',
      );
    }
  }

  function launchEmail() {
    if (!emailDraft) return;
    const link = buildEmailLink(
      emailDraft.to,
      emailDraft.subject,
      emailDraft.body,
    );
    if (!link) {
      setSaved('Indica un email válido del cliente.');
      return;
    }
    window.location.href = link;
  }

  function launchWhatsApp() {
    if (!emailDraft) return;
    const link = buildWhatsAppLink(emailDraft.phone, emailDraft.body);
    if (!link) {
      setSaved(
        'Indica un teléfono válido del cliente, incluyendo el prefijo si no es español.',
      );
      return;
    }
    window.location.href = link;
  }
  async function search(
    event?: FormEvent,
    selectedOrderNumber?: string,
    selectedIncidentId?: string,
  ) {
    event?.preventDefault();
    const searchTerm = (selectedOrderNumber || normalized).trim();
    if (!searchTerm) {
      setError('Introduce un número de pedido, un nombre o un teléfono.');
      return;
    }
    setLoading(true);
    setError('');
    setSaved('');
    setOrder(null);
    setIncident(null);
    setMondayRecords([]);
    setTicket(null);
    setOrderSearchMatches([]);
    setIncidentSearchMatches([]);
    try {
      const selectedLinkedOrderNumber = linkedWooOrderReference(searchTerm);
      const isWooOrder = isWooOrderReference(selectedLinkedOrderNumber);
      const isExactReference = isExactRecordReference(
        selectedLinkedOrderNumber,
      );
      if (!isWooOrder && !isExactReference && !selectedOrderNumber) {
        const [wooResponse, mondayResponse, incidentsResponse] =
          await Promise.all([
            fetch(`/api/search?query=${encodeURIComponent(searchTerm)}`, {
              cache: 'no-store',
            }),
            fetch(`/api/monday?query=${encodeURIComponent(searchTerm)}`, {
              cache: 'no-store',
            }),
            fetch('/api/incidents?scope=all', { cache: 'no-store' }),
          ]);
        const wooData = await readJsonResponse<{
          matches?: OrderSearchMatch[];
          error?: string;
        }>(wooResponse, { source: 'WooCommerce' });
        const mondayData = await readJsonResponse<{
          records?: MondayRecord[];
          error?: string;
        }>(mondayResponse, { source: 'Monday' });
        const incidentsData = await readJsonResponse<{
          rows?: Incident[];
          error?: string;
        }>(incidentsResponse);
        const wooMatches = wooResponse.ok ? wooData.matches || [] : [];
        const mondayMatches = mondayResponse.ok ? mondayData.records || [] : [];
        const queryDigits = searchTerm.replace(/\D/g, '');
        const incidentMatches = incidentsResponse.ok
          ? (incidentsData.rows || []).filter((row) => {
              const nameMatches = folded(row.customerName).includes(
                folded(searchTerm),
              );
              const phone = row.customerPhone.replace(/\D/g, '');
              const phoneMatches =
                queryDigits.length >= 5 &&
                Boolean(phone) &&
                (phone.includes(queryDigits) || queryDigits.includes(phone));
              return nameMatches || phoneMatches;
            })
          : [];
        setOrderSearchMatches(wooMatches);
        setMondayRecords(mondayMatches);
        setIncidentSearchMatches(incidentMatches);
        if (
          !wooMatches.length &&
          !mondayMatches.length &&
          !incidentMatches.length
        )
          setError(
            `No se encontraron pedidos, reservas, prendas ni incidencias para “${searchTerm}”.`,
          );
        return;
      }
      const [wooResponse, incidentResponse, mondayResponse, ticketResponse] =
        await Promise.all([
          isWooOrder
            ? fetch(
                `/api/search?number=${encodeURIComponent(selectedLinkedOrderNumber)}`,
                {
                  cache: 'no-store',
                },
              )
            : Promise.resolve(null),
          fetch(
            selectedIncidentId
              ? `/api/incidents?id=${encodeURIComponent(selectedIncidentId)}`
              : `/api/incidents?number=${encodeURIComponent(selectedLinkedOrderNumber)}`,
            {
              cache: 'no-store',
            },
          ),
          fetch(
            `/api/monday?number=${encodeURIComponent(selectedLinkedOrderNumber)}`,
            {
              cache: 'no-store',
            },
          ),
          fetch(`/api/tickets?number=${encodeURIComponent(searchTerm)}`, {
            cache: 'no-store',
          }),
        ]);
      const wooData = wooResponse
        ? await readJsonResponse<Order & { error?: string }>(wooResponse, {
            source: 'WooCommerce',
          })
        : null;
      const incidentData = await readJsonResponse<{
        found?: boolean;
        incident?: Incident;
        error?: string;
      }>(incidentResponse);
      const mondayData = await readJsonResponse<{
        found?: boolean;
        records?: MondayRecord[];
        error?: string;
      }>(mondayResponse, { source: 'Monday' });
      const ticketData = await readJsonResponse<{
        found?: boolean;
        ticket?: StoreTicket;
        error?: string;
      }>(ticketResponse);
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
            : `El ticket ${searchTerm} todavía no está sincronizado desde DetallWPF. Abre Reimpresión de Ticket, selecciónalo y ejecuta “sincronizar-ticket-actual.cmd”.`,
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
        `/api/order-notes?number=${encodeURIComponent(normalizeOrderNoteReference(orderNumber))}`,
        { cache: 'no-store' },
      );
      const data = await readJsonResponse<{
        notes?: OrderNote[];
        error?: string;
      }>(response);
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
      const data = await readJsonResponse<{
        returnAttended?: boolean;
        error?: string;
      }>(response, { source: 'WooCommerce' });
      if (!response.ok)
        throw new Error(data.error || 'No se pudo actualizar la devolución.');
      setOrder((current) =>
        current
          ? { ...current, returnAttended: Boolean(data.returnAttended) }
          : current,
      );
      setSaved(
        attended
          ? 'Devolución marcada como atendida en WooCommerce.'
          : 'Devolución marcada como pendiente en WooCommerce.',
      );
    } catch (error) {
      setSaved(
        error instanceof Error
          ? error.message
          : 'No se pudo actualizar la devolución.',
      );
    } finally {
      setReturnUpdating(false);
    }
  }
  async function downloadOrderDocument(type: 'invoice' | 'packing-slip') {
    if (!order || documentLoading) return;
    setDocumentLoading(type);
    setSaved('');
    try {
      const params = new URLSearchParams({
        orderId: String(order.id),
        orderNumber: order.number,
        type,
      });
      const response = await fetch(`/api/order-documents?${params}`, {
        cache: 'no-store',
      });
      if (!response.ok) {
        const data = await readJsonResponse<{ error?: string }>(response, {
          source: 'WooCommerce',
        });
        throw new Error(data.error || 'No se pudo descargar el documento.');
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = `${type === 'invoice' ? 'factura' : 'albaran-devolucion'}-${order.number}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setSaved(
        type === 'invoice'
          ? 'Factura descargada.'
          : 'Albarán de devolución descargado.',
      );
    } catch (error) {
      setSaved(
        error instanceof Error
          ? error.message
          : 'No se pudo descargar el documento.',
      );
    } finally {
      setDocumentLoading(null);
    }
  }
  async function saveOrderNote() {
    const noteReference =
      order?.number ||
      mondayRecords.find((record) => record.kind === 'reserva')?.reference;
    const content = normalizeOrderNoteContent(noteDraft);
    if (!noteReference || !content) {
      setSaved('Escribe una nota antes de guardarla.');
      return;
    }
    try {
      const response = await fetch('/api/order-notes', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          orderNumber: normalizeOrderNoteReference(noteReference),
          kind: noteKind,
          content,
        }),
      });
      const data = await readJsonResponse<{
        note?: OrderNote;
        error?: string;
      }>(response);
      if (!response.ok || !data.note)
        throw new Error(data.error || 'No se pudo guardar la nota.');
      setOrderNotes((notes) => [data.note!, ...notes]);
      setNoteDraft('');
      setSaved(
        order ? 'Nota guardada en el pedido.' : 'Nota guardada en la reserva.',
      );
    } catch (error) {
      setSaved(
        error instanceof Error ? error.message : 'No se pudo guardar la nota.',
      );
    }
  }
  async function deleteOrderNote(note: OrderNote) {
    const noteReference =
      order?.number ||
      mondayRecords.find((record) => record.kind === 'reserva')?.reference;
    if (!noteReference || noteDeletingId) return;
    if (!window.confirm('¿Eliminar esta nota de PaddyTools?')) return;
    setNoteDeletingId(note.id);
    setSaved('');
    try {
      const response = await fetch('/api/order-notes', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          id: note.id,
          orderNumber: normalizeOrderNoteReference(noteReference),
        }),
      });
      const data = await readJsonResponse<{
        deleted?: boolean;
        error?: string;
      }>(response);
      if (!response.ok || !data.deleted)
        throw new Error(data.error || 'No se pudo eliminar la nota.');
      setOrderNotes((notes) =>
        notes.filter((current) => current.id !== note.id),
      );
      setSaved('Nota eliminada.');
    } catch (error) {
      setSaved(
        error instanceof Error ? error.message : 'No se pudo eliminar la nota.',
      );
    } finally {
      setNoteDeletingId('');
    }
  }
  useEffect(() => {
    const noteReference =
      order?.number ||
      mondayRecords.find((record) => record.kind === 'reserva')?.reference;
    if (noteReference) void loadOrderNotes(noteReference);
    else setOrderNotes([]);
  }, [order?.number, mondayRecords]);
  useEffect(() => {
    if (!mondayUpdateItemIds) {
      setMondayUpdates([]);
      return;
    }
    let cancelled = false;
    setMondayUpdatesLoading(true);
    void fetch(
      `/api/monday?updatesFor=${encodeURIComponent(mondayUpdateItemIds)}`,
      { cache: 'no-store' },
    )
      .then(async (response) => {
        const data = await readJsonResponse<{
          updates?: MondayUpdate[];
          error?: string;
        }>(response, { source: 'Monday' });
        if (!response.ok)
          throw new Error(
            data.error || 'No se pudieron cargar los comentarios de Monday.',
          );
        if (!cancelled) setMondayUpdates(data.updates || []);
      })
      .catch((error) => {
        if (!cancelled) {
          setMondayUpdates([]);
          setSaved(
            error instanceof Error
              ? error.message
              : 'No se pudieron cargar los comentarios de Monday.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) setMondayUpdatesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mondayUpdateItemIds]);
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
      sent: incident?.sent || false,
      pickupItems: {},
    });
    setModal('incidencia');
    if (!schoolOptions.length)
      void fetch('/api/schools')
        .then((response) => readJsonResponse<string[]>(response))
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
    if (reservationOptions?.articles?.length) return;
    setReservationLoading(true);
    try {
      const [response, reservationsResponse] = await Promise.all([
        fetch('/api/monday?mode=reservation-options', { cache: 'no-store' }),
        fetch('/api/monday?mode=reservations', { cache: 'no-store' }),
      ]);
      const data = await readJsonResponse<ReservationOptions & {
        error?: string;
      }>(response, { source: 'Monday' });
      if (!response.ok) throw new Error(data.error);
      const reservationsData = reservationsResponse.ok
        ? await readJsonResponse<{ records?: MondayRecord[] }>(
            reservationsResponse,
            { source: 'Monday' },
          )
        : { records: [] };
      const recoveredArticles = (reservationsData.records || []).flatMap(
        (record) =>
          (record.articleIds || []).map((id) => ({
            id,
            code: record.code || '',
            description: [
              record.articleDescription || record.article,
              record.school,
            ]
              .filter(Boolean)
              .join(' · '),
          })),
      );
      const articleMap = new Map(
        [...(data.articles || []), ...recoveredArticles].map((article) => [
          article.id,
          article,
        ]),
      );
      setReservationOptions({ ...data, articles: [...articleMap.values()] });
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
      const response = await fetch('/api/monday?mode=reservations', {
        cache: 'no-store',
      });
      const data = await readJsonResponse<{
        records?: MondayRecord[];
        error?: string;
      }>(response, { source: 'Monday' });
      if (!response.ok) throw new Error(data.error);
      setReservationRows(data.records || []);
    } catch (error) {
      setReservationRows([]);
      setSaved(
        error instanceof Error
          ? error.message
          : 'No se pudieron cargar las reservas.',
      );
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
      const data = await readJsonResponse<SchoolProduct[] & {
        error?: string;
      }>(response, { source: 'WooCommerce' });
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
    const reference = rawReference
      ? linkedWooOrderReference(rawReference)
      : '';
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
            order_number: incidentStorageReference(reference),
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
            sent: incidentDraft.sent ? 1 : 0,
            incident_school_name: incidentDraft.school,
            is_recurrence: incidentDraft.recurrence ? 1 : 0,
            source_type: 'pedido',
            record_id: incidentDraft.recurrence ? '' : incident?.id || '',
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
          setSaved(
            'Selecciona un cliente del desplegable o pulsa Nuevo para crearlo.',
          );
          return;
        }
        if (
          newReservationCustomer &&
          (!reservationDraft.phone.trim() ||
            !reservationDraft.customerEmail.trim())
        ) {
          setSaved('Para un cliente nuevo, completa teléfono y e-mail.');
          return;
        }
        if (
          newReservationCustomer &&
          !isValidEmail(reservationDraft.customerEmail)
        ) {
          setSaved('El e-mail del cliente nuevo no tiene un formato válido.');
          return;
        }
        setReservationSaving(true);
        const reservationReference = reservationStorageReference(reference);
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
        const data = await readJsonResponse<{ error?: string }>(response, {
          source: 'Monday',
        });
        throw new Error(data.error);
      }
      const record = await readJsonResponse<{
        id?: string;
        formula?: string;
      }>(response, { source: 'Monday' });
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
        const reservationReference = reservationStorageReference(reference);
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
          articleIds: reservationDraft.articleId
            ? [reservationDraft.articleId]
            : [],
          customerIds: reservationDraft.customerId
            ? [reservationDraft.customerId]
            : [],
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
            rows.map((item) =>
              item.id === editingReservationId ? savedReservation : item,
            ),
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
      const data = await readJsonResponse<{ matches?: Shipment[] }>(response);
      setShipments(data.matches ?? []);
    } catch {
      setShipments([]);
    } finally {
      setShippingLoading(false);
    }
  }
  function openShipping() {
    setShippingReference(shippingReferences(normalized)[0] || normalized);
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
      const data = await readJsonResponse<{
        rows?: Incident[];
        error?: string;
      }>(response);
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
      printStandaloneLabel(incidentLabelLines(row));
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
      id: incident?.id || '',
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
      sent: incidentDraft.sent,
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
        body: JSON.stringify({
          id: row.id,
          orderNumber: row.orderNumber,
          received,
        }),
      });
      const data = await readJsonResponse<{ error?: string }>(response);
      if (!response.ok) throw new Error(data.error);
      setRegistryRows((rows) =>
        rows.map((item) =>
          item.id === row.id
            ? {
                ...item,
                pickupReceived: received,
                pickupReceivedAt: received ? new Date().toISOString() : '',
              }
            : item,
        ),
      );
      if (incident?.id === row.id)
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
        body: JSON.stringify({
          id: row.id,
          orderNumber: row.orderNumber,
          solved,
        }),
      });
      const data = await readJsonResponse<{
        error?: string;
        incident?: Incident;
      }>(response);
      if (!response.ok) throw new Error(data.error);
      const updated = data.incident || {
        ...row,
        solved,
        solvedAt: solved ? new Date().toISOString() : '',
      };
      setRegistryRows((rows) =>
        rows.map((item) => (item.id === row.id ? updated : item)),
      );
      if (incident?.id === row.id) setIncident(updated);
      if (selectedIncident?.id === row.id) setSelectedIncident(updated);
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
  async function deleteIncident(row: Incident) {
    if (
      !window.confirm(
        `¿Eliminar definitivamente la incidencia #${row.orderNumber}? Esta acción no se puede deshacer.`,
      )
    )
      return;
    setDeletingIncident(row.orderNumber);
    try {
      const response = await fetch('/api/incidents', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id: row.id, orderNumber: row.orderNumber }),
      });
      const data = await readJsonResponse<{
        deleted?: boolean;
        error?: string;
      }>(response);
      if (!response.ok || !data.deleted)
        throw new Error(data.error || 'No se pudo eliminar la incidencia.');
      setRegistryRows((rows) => rows.filter((item) => item.id !== row.id));
      if (incident?.id === row.id) setIncident(null);
      if (selectedIncident?.id === row.id) setSelectedIncident(null);
      setSaved(`Incidencia #${row.orderNumber} eliminada correctamente.`);
    } catch (error) {
      setSaved(
        error instanceof Error
          ? error.message
          : 'No se pudo eliminar la incidencia.',
      );
    } finally {
      setDeletingIncident('');
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
    return (
      !term ||
      folded(
        [
          row.reference,
          row.customer,
          row.phone,
          row.school,
          row.articleDescription,
          row.size,
          row.status,
        ].join(' '),
      ).includes(term)
    );
  });

  return (
    <main className="min-h-screen bg-background text-foreground">
      <DashboardHeader
        sessionUser={sessionUser}
        shippingLoading={shippingLoading}
        onOpenPackingList={() => window.location.assign('/packing-list')}
        onOpenReservations={() => void openReservations()}
        onOpenPickups={() => void openRegistry('recogidas')}
        onOpenShipping={openShipping}
        onOpenIncidents={() => window.location.assign('/incidencias')}
        onCreateReservation={() => void openReservation()}
        onLogout={() => void logout()}
      />
      <GlobalSearchPanel
        query={query}
        loading={loading}
        orderMatches={orderSearchMatches}
        incidentMatches={incidentSearchMatches}
        onQueryChange={setQuery}
        onSubmit={search}
        onSelectOrder={(match) => {
          setQuery(match.number);
          void search(undefined, match.number);
        }}
        onSelectIncident={(match) => {
          setQuery(match.orderNumber);
          void search(undefined, match.orderNumber, match.id);
        }}
      />
      <DashboardFeedback
        saved={saved}
        error={error}
        loading={loading}
        hasContent={Boolean(
          order ||
          incident ||
          mondayRecords.length ||
          orderSearchMatches.length ||
          incidentSearchMatches.length ||
          ticket,
        )}
      />
      {order && (
        <div className="workspace">
          <OrderHeading
            order={order}
            documentLoading={documentLoading}
            onDownloadDocument={(type) => void downloadOrderDocument(type)}
            onRefresh={() => void search()}
            onOpenWooCommerce={() => window.open(order.wooUrl, '_blank')}
          />
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
                  <OrderSummary
                    order={order}
                    returnUpdating={returnUpdating}
                    onReturnAttendedChange={(attended) =>
                      void updateReturnAttended(attended)
                    }
                  />
                  <Items order={order} units={units} />
                  <OrderLinkedRecords
                    incident={incident}
                    mondayRecords={mondayRecords}
                    onPrintIncident={printIncidentDocument}
                    onPrintReservation={requestReservationPrint}
                    onEmailReservation={openReservationEmail}
                  />
                </TabsContent>
                <TabsContent value="articulos" className="tab-body">
                  <Items order={order} units={units} />
                </TabsContent>
                <TabsContent value="seguimiento" className="tab-body">
                  <OrderFollowUp
                    order={order}
                    onPrepareEmail={() => void openOrderEmail()}
                  />
                </TabsContent>
                <TabsContent value="notas" className="tab-body">
                  <OrderNotesCard
                    notes={orderNotes}
                    loading={notesLoading}
                    kind={noteKind}
                    draft={noteDraft}
                    deletingId={noteDeletingId}
                    onKindChange={setNoteKind}
                    onDraftChange={setNoteDraft}
                    onSave={() => void saveOrderNote()}
                    onDelete={(note) => void deleteOrderNote(note)}
                  />
                </TabsContent>
                <TabsContent value="movimientos" className="tab-body">
                  <OrderMovements order={order} />
                </TabsContent>
                <TabsContent value="documentos" className="tab-body">
                  <OrderDocuments
                    incident={incident}
                    onView={showIncidentDocument}
                    onPrint={printIncidentDocument}
                  />
                </TabsContent>
              </Tabs>
            </section>
            <OrderActivity
              order={order}
              notes={orderNotes}
              incident={incident}
            />
          </div>
        </div>
      )}
      {!order && (incident || mondayRecords.length > 0) && (
        <ConnectedResults
          incident={incident}
          mondayRecords={mondayRecords}
          notes={orderNotes}
          notesLoading={notesLoading}
          mondayUpdates={mondayUpdates}
          mondayUpdatesLoading={mondayUpdatesLoading}
          noteKind={noteKind}
          noteDraft={noteDraft}
          noteDeletingId={noteDeletingId}
          onPrintIncident={printIncidentDocument}
          onPrintReservation={requestReservationPrint}
          onEmailReservation={openReservationEmail}
          onNoteKindChange={setNoteKind}
          onNoteDraftChange={setNoteDraft}
          onSaveNote={() => void saveOrderNote()}
          onDeleteNote={(note) => void deleteOrderNote(note)}
        />
      )}
      {ticket && <StoreTicketCard ticket={ticket} />}
      <IncidentFormDialog
        open={modal === 'incidencia'}
        reference={
          order?.number ||
          incident?.orderNumber ||
          mondayRecords[0]?.reference ||
          ''
        }
        customerName={
          order?.customer.name ||
          incident?.customerName ||
          mondayRecords[0]?.customer ||
          ''
        }
        customerEmail={order?.customer.email || incident?.customerEmail || ''}
        customerPhone={
          order?.customer.phone ||
          incident?.customerPhone ||
          mondayRecords[0]?.phone ||
          ''
        }
        draft={incidentDraft}
        schools={schools}
        products={pickupProducts}
        productsLoading={productsLoading}
        productsError={productsError}
        onClose={() => setModal(null)}
        onDraftChange={setIncidentDraft}
        onPickupSchoolChange={(school) => {
          setIncidentDraft({
            ...incidentDraft,
            pickupSchool: school,
            pickupItems: {},
          });
          void loadPickupProducts(school);
        }}
        onPrint={printIncidentDraft}
        onSave={(solved) => void save('incidencia', solved)}
      />
      <ReservationFormDialog
        open={modal === 'reserva'}
        editing={Boolean(editingReservationId)}
        loading={reservationLoading}
        saving={reservationSaving}
        offset={reservationDialogOffset}
        draft={reservationDraft}
        options={reservationOptions}
        articles={reservationArticles}
        newCustomer={newReservationCustomer}
        onClose={() => setModal(null)}
        onDraftChange={setReservationDraft}
        onNewCustomerChange={setNewReservationCustomer}
        onSave={() => void save('reserva')}
        onDragStart={startReservationDrag}
        onDragMove={moveReservationDialog}
        onDragStop={stopReservationDrag}
      />
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
            <div className="modal-icon blue">
              <Mail />
            </div>
            <DialogTitle>Preparar aviso al cliente</DialogTitle>
            <DialogDescription>
              Revisa los datos y elige si quieres abrir el mensaje en el correo
              o en WhatsApp.
            </DialogDescription>
          </DialogHeader>
          {emailDraft && (
            <div className="email-form">
              <Field label="Tipo de entrega">
                <select
                  value={emailDraft.delivery}
                  onChange={(event) =>
                    updateGeneratedEmail({
                      delivery: event.target.value as DeliveryEmailKind,
                    })
                  }
                >
                  <option value="colegio">Entrega en colegio</option>
                  <option value="domicilio">Envío a domicilio</option>
                  <option value="tienda">Recogida en tienda</option>
                </select>
              </Field>
              <Field label="Email del cliente">
                <Input
                  type="email"
                  value={emailDraft.to}
                  onChange={(event) =>
                    setEmailDraft({ ...emailDraft, to: event.target.value })
                  }
                  placeholder="cliente@email.com"
                />
              </Field>
              <Field label="Teléfono del cliente">
                <Input
                  type="tel"
                  value={emailDraft.phone}
                  onChange={(event) =>
                    setEmailDraft({ ...emailDraft, phone: event.target.value })
                  }
                  placeholder="Ej. 612345678"
                />
              </Field>
              {emailDraft.delivery === 'colegio' && (
                <Field label="Colegio">
                  <Input
                    value={emailDraft.school}
                    onChange={(event) =>
                      updateGeneratedEmail({ school: event.target.value })
                    }
                    placeholder="Nombre del colegio"
                  />
                </Field>
              )}
              {emailDraft.delivery === 'domicilio' && (
                <div className="email-home-fields">
                  <Field label="Empresa de transporte">
                    <select
                      value={emailDraft.carrier}
                      onChange={(event) =>
                        updateGeneratedEmail({
                          carrier: event.target.value as EmailDraft['carrier'],
                        })
                      }
                    >
                      <option value="viaxpress">ViaXpress</option>
                      <option value="dhl">DHL</option>
                    </select>
                  </Field>
                  <Field label="Número de envío">
                    <Input
                      value={emailDraft.trackingNumber}
                      onChange={(event) =>
                        updateGeneratedEmail({
                          trackingNumber: event.target.value,
                        })
                      }
                      placeholder="Introduce el nº de envío"
                    />
                  </Field>
                </div>
              )}
              <Field label="Asunto">
                <Input
                  value={emailDraft.subject}
                  onChange={(event) =>
                    setEmailDraft({
                      ...emailDraft,
                      subject: event.target.value,
                    })
                  }
                />
              </Field>
              <Field label="Mensaje">
                <Textarea
                  value={emailDraft.body}
                  onChange={(event) =>
                    setEmailDraft({ ...emailDraft, body: event.target.value })
                  }
                  rows={7}
                />
              </Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModal(null)}>
              Cancelar
            </Button>
            <Button variant="outline" onClick={() => void copyEmailText()}>
              Copiar texto
            </Button>
            <Button className="whatsapp-action" onClick={launchWhatsApp}>
              <Phone /> Abrir WhatsApp
            </Button>
            <Button onClick={launchEmail}>
              <Mail /> Abrir correo
            </Button>
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
              <Input
                value={shippingReference}
                disabled={shippingLoading}
                placeholder="Ej. PA12345, R12345 o IPA12345"
                onChange={(event) => {
                  setShippingReference(event.target.value);
                  setShipments(null);
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && shippingReference.trim())
                    void checkShipping();
                }}
              />
            </label>
            <Button
              disabled={shippingLoading || !shippingReference.trim()}
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
              <b>Introduce una referencia</b>
              <span>Buscaremos exactamente el PA, R, IPA o RPA indicado.</span>
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
            <div className="modal-icon green">
              <CalendarDays />
            </div>
            <DialogTitle>Reservas</DialogTitle>
            <DialogDescription>
              Consulta las reservas de Monday y completa desde aquí cualquier
              casilla pendiente.
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
              <div className="registry-empty">
                <RefreshCw className="spin" /> Cargando reservas…
              </div>
            ) : visibleReservationRows.length ? (
              <div className="reservation-table-wrap">
                <table className="reservation-table">
                  <thead>
                    <tr>
                      {[
                        'Nº RESERVA',
                        'CLIENTE',
                        'TELÉFONO',
                        'COLEGIO',
                        'FECHA RESERVA',
                        'CÓDIGO ART.',
                        'DESCRIPCIÓN ARTÍCULO',
                        'TALLA',
                        'UDS.',
                        'U. ENVIADAS',
                        'U. PENDIENTES',
                        'PAGADA',
                        'OBSERVACIONES',
                        'ESTADO',
                        'FECHA FIN',
                        'ENTREGA ESTIMADA PRODUCCIÓN',
                        'FÓRMULA',
                        'EDITAR',
                        'ETIQUETA',
                      ].map((heading) => (
                        <th key={heading}>{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {visibleReservationRows.map((row) => (
                      <tr key={row.id}>
                        <td>
                          <b>{row.reference || row.id}</b>
                        </td>
                        <td>{row.customer || 'Pendiente'}</td>
                        <td>{row.phone || 'Pendiente'}</td>
                        <td>{row.school || 'Pendiente'}</td>
                        <td>{row.date || 'Pendiente'}</td>
                        <td>{row.code || 'Pendiente'}</td>
                        <td>
                          {row.articleDescription || row.article || 'Pendiente'}
                        </td>
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
                          <Button onClick={() => void openReservation(row)}>
                            Completar / editar
                          </Button>
                        </td>
                        <td className="reservation-table-actions">
                          <Button
                            variant="outline"
                            onClick={() =>
                              requestReservationPrint(row, 'label')
                            }
                          >
                            <Printer /> Imprimir etiqueta
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="registry-empty">
                <Archive />
                <b>No hay reservas para mostrar</b>
                <span>Prueba a cambiar la búsqueda.</span>
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
                      : incidentStatusLabel(row)}
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
                          <Button
                            onClick={() => void setIncidentSolved(row, true)}
                          >
                            <Check /> Cerrar incidencia
                          </Button>
                        )}
                        {canDeleteIncidents(sessionUser) && (
                          <Button
                            variant="outline"
                            className="incident-delete"
                            disabled={deletingIncident === row.orderNumber}
                            onClick={() => void deleteIncident(row)}
                          >
                            <Trash2 />
                            {deletingIncident === row.orderNumber
                              ? 'Eliminando…'
                              : 'Eliminar'}
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
      <IncidentDocumentDialog
        open={modal === 'detalle-incidencia'}
        incident={selectedIncident}
        onClose={() => setModal(null)}
        onPrint={printIncidentDocument}
      />
      <PrintSheets
        incident={printIncident}
        incidentMode={printMode}
        reservation={printReservation}
        reservationMode={reservationPrintMode}
      />
    </main>
  );
}
