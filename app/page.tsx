'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ChevronRight, FileText, RefreshCw } from 'lucide-react';
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
import {
  incidentLabelLines,
  type IncidentRecord as Incident,
} from '@/lib/incident-record';
import { canDeleteIncidents } from '@/lib/permissions';
import {
  filterIncidentRegistry,
  filterReservationRegistry,
} from '@/lib/dashboard-registry-filter';
import {
  mondayReservationUpdateItemIds,
  reservationArticlesForSchool,
} from '@/lib/dashboard-reservation-options';
import {
  emptyConnectedSearchMessage,
  hasConnectedSearchResults,
} from '@/lib/dashboard-search-results';
import {
  fetchIncidentRegistry,
  fetchSchools,
  fetchSessionUser,
  fetchMondayUpdates,
  fetchOrderDocument,
  fetchOrderNotes,
  fetchReservationOptions,
  fetchReservations,
  fetchSchoolProducts,
  fetchShippingMatches,
  patchIncident,
  postIncident,
  uploadIncidentImages,
  postOrderNote,
  removeIncident,
  removeOrderNote,
  closeSession,
  runMondayMaintenance,
  saveMondayReservation,
  searchConnectedRecords,
  searchExactConnected,
  setRemoteReturnAttended,
} from '@/lib/dashboard-api';
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
} from '@/lib/delivery-message';
import { buildEmailLink, buildWhatsAppLink } from '@/lib/contact-links';
import {
  beginAutomaticWork,
  cancelAutomaticWork,
  completeAutomaticWork,
} from '@/lib/kpi-auto-timer';
import {
  selectedPickupLines,
  validateIncidentDraft,
  validateReservationDraft,
} from '@/lib/dashboard-form-rules';
import { useDraggableDialog } from '@/lib/use-draggable-dialog';
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
import { CustomerMessageDialog } from '@/components/dashboard/customer-message-dialog';
import { ShippingHistoryDialog } from '@/components/dashboard/shipping-history-dialog';
import { ReservationRegistryDialog } from '@/components/dashboard/reservation-registry-dialog';
import { IncidentRegistryDialog } from '@/components/dashboard/incident-registry-dialog';
import { ReservationResultDialog } from '@/components/dashboard/reservation-result-dialog';

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
  const reservationDialog = useDraggableDialog();
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);

  useEffect(() => {
    void fetchSessionUser()
      .then(async (user) => {
        setSessionUser(user);
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
          if (!canDeleteIncidents(user)) {
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
          await removeIncident({ orderNumber: pendingDelete });
          window.location.assign('/');
        }
      })
      .catch(() => window.location.assign('/login'));
  }, []);

  async function logout() {
    await closeSession();
    window.location.assign('/login');
  }

  useEffect(() => {
    if (
      new URLSearchParams(window.location.search).get('cleanup') !==
      'f8626767-5497-41dd-8d0a-cc43668155d8'
    )
      return;
    void runMondayMaintenance('f8626767-5497-41dd-8d0a-cc43668155d8')
      .then((result) => {
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
    shippingRequired: false,
    sent: false,
    images: [],
    newImages: [],
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
    () => mondayReservationUpdateItemIds(mondayRecords),
    [mondayRecords],
  );
  const linkedOrderNumber = useMemo(
    () => linkedWooOrderReference(normalized),
    [normalized],
  );
  const reservationArticles = useMemo(() => {
    const articles = reservationOptions?.articles || [];
    return reservationArticlesForSchool(articles, reservationDraft.school);
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
        school = (await fetchShippingMatches(order.number))[0]?.school || '';
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
        const { wooMatches, mondayMatches, incidentMatches } =
          await searchConnectedRecords(searchTerm, {
            onWooMatches: (matches) => {
              setOrderSearchMatches(matches);
              if (matches.length) setLoading(false);
            },
            onMondayMatches: (records) => {
              setMondayRecords(records);
              if (records.length) setLoading(false);
            },
            onIncidentMatches: (matches) => {
              setIncidentSearchMatches(matches);
              if (matches.length) setLoading(false);
            },
          });
        setOrderSearchMatches(wooMatches);
        setMondayRecords(mondayMatches);
        setIncidentSearchMatches(incidentMatches);
        if (
          !hasConnectedSearchResults(wooMatches, mondayMatches, incidentMatches)
        )
          setError(emptyConnectedSearchMessage(searchTerm));
        return;
      }
      const result = await searchExactConnected(
        {
          reference: selectedLinkedOrderNumber,
          ticketReference: searchTerm,
          incidentId: selectedIncidentId,
          wooOrder: isWooOrder,
        },
        {
          onOrder: (foundOrder) => {
            setOrder(foundOrder);
            setLoading(false);
          },
          onIncident: setIncident,
          onMondayRecords: setMondayRecords,
          onTicket: setTicket,
        },
      );
      if (result.order) setOrder(result.order);
      if (result.incident) setIncident(result.incident);
      setMondayRecords(result.mondayRecords);
      if (result.ticket) setTicket(result.ticket);
      if (!result.found)
        setError(
          isWooOrder
            ? result.errors.join(' · ') ||
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
      setOrderNotes(
        await fetchOrderNotes(normalizeOrderNoteReference(orderNumber)),
      );
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
      const returnAttended = await setRemoteReturnAttended({
        orderId: order.id,
        orderNumber: order.number,
        attended,
      });
      setOrder((current) =>
        current ? { ...current, returnAttended } : current,
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
      const url = URL.createObjectURL(await fetchOrderDocument(params));
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
      const note = await postOrderNote({
        orderNumber: normalizeOrderNoteReference(noteReference),
        kind: noteKind,
        content,
      });
      setOrderNotes((notes) => [note, ...notes]);
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
      await removeOrderNote({
        id: note.id,
        orderNumber: normalizeOrderNoteReference(noteReference),
      });
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
    void fetchMondayUpdates(mondayUpdateItemIds)
      .then((updates) => {
        if (!cancelled) setMondayUpdates(updates);
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
    if (!incident?.id)
      beginAutomaticWork(
        'incident-create',
        'incidencias',
        order?.number || mondayRecords[0]?.reference || '',
      );
    else cancelAutomaticWork('incident-create');
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
      shippingRequired: incident?.shippingRequired || false,
      sent: incident?.sent || false,
      images: incident?.images || [],
      newImages: [],
      pickupItems: {},
    });
    setModal('incidencia');
    if (!schoolOptions.length)
      void fetchSchools().then(
        (data) => Array.isArray(data) && setSchoolOptions(data),
      );
    if (incident?.pickupSchool && pickupSchool)
      void loadPickupProducts(pickupSchool);
  }
  async function openReservation(existing?: MondayRecord) {
    if (!existing)
      beginAutomaticWork(
        'reservation-create',
        'reservas',
        order?.number || mondayRecords[0]?.reference || '',
      );
    else cancelAutomaticWork('reservation-create');
    reservationDialog.reset();
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
      const [data, reservations] = await Promise.all([
        fetchReservationOptions(),
        fetchReservations().catch(() => []),
      ]);
      const recoveredArticles = reservations.flatMap((record) =>
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
      setReservationRows(await fetchReservations());
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
      setPickupProducts(await fetchSchoolProducts(school));
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
    const reference = rawReference ? linkedWooOrderReference(rawReference) : '';
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
      let record: { id?: string; formula?: string } = {};
      if (kind === 'incidencia') {
        const selected = selectedPickupLines(pickupProducts, incidentDraft);
        const validationError = validateIncidentDraft(
          incidentDraft,
          selected.length,
        );
        if (validationError) {
          setSaved(validationError);
          return;
        }
        const pickupDetails = [
          ...selected,
          incidentDraft.pickupNotes &&
            `Observaciones: ${incidentDraft.pickupNotes}`,
        ]
          .filter(Boolean)
          .join('\n');
        record = await postIncident({
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
          shipping_required: incidentDraft.shippingRequired ? 1 : 0,
          sent: incidentDraft.sent ? 1 : 0,
          incident_school_name: incidentDraft.school,
          is_recurrence: incidentDraft.recurrence ? 1 : 0,
          source_type: 'pedido',
          record_id: incidentDraft.recurrence ? '' : incident?.id || '',
        });
        if (record.id && incidentDraft.newImages.length) {
          await uploadIncidentImages(record.id, incidentDraft.newImages);
        }
      } else {
        const linkedCustomerFromSearch = Boolean(
          order?.customer.name ||
          incident?.customerName ||
          mondayRecords[0]?.customer,
        );
        const validationError = validateReservationDraft(reservationDraft, {
          newCustomer: newReservationCustomer,
          linkedCustomer: linkedCustomerFromSearch,
        });
        if (validationError) {
          setSaved(validationError);
          return;
        }
        setReservationSaving(true);
        const reservationReference = reservationStorageReference(reference);
        record = await saveMondayReservation(
          {
            id: editingReservationId || undefined,
            ...reservationDraft,
            createCustomer:
              newReservationCustomer ||
              (!reservationDraft.customerId && linkedCustomerFromSearch),
            reference: reservationReference,
          },
          Boolean(editingReservationId),
        );
      }
      let automaticKpiWarning = '';
      try {
        if (kind === 'incidencia') {
          await completeAutomaticWork('incident-create', {
            orders: 1,
            products: order?.items
              ? order.items.reduce(
                  (total, item) =>
                    total + Math.max(1, Number(item.quantity) || 1),
                  0,
                )
              : incident?.products.length || 0,
            notes: `Incidencia ${reference}`,
          });
        } else if (!editingReservationId) {
          await completeAutomaticWork('reservation-create', {
            orders: 1,
            products: Math.max(1, reservationDraft.units || 1),
            notes: `Reserva ${reservationStorageReference(reference)}`,
          });
        }
      } catch {
        automaticKpiWarning =
          ' La gestión se guardó, pero no se pudo registrar automáticamente su tiempo.';
      }
      const savedMessage =
        kind === 'reserva'
          ? editingReservationId
            ? `Reserva actualizada correctamente en Monday (${record.id}).`
            : `Reserva creada correctamente en Monday (${record.id}).`
          : `Incidencia del pedido #${reference} guardada en el registro compartido.`;
      setSaved(`${savedMessage}${automaticKpiWarning}`);
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
      setShipments(await fetchShippingMatches(shippingReference));
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
      setRegistryRows(
        await fetchIncidentRegistry(kind === 'registro' ? 'all' : 'pickups'),
      );
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
    const pickupDetails = selectedPickupLines(
      pickupProducts,
      incidentDraft,
      true,
    );
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
      shippingRequired: incidentDraft.shippingRequired,
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
      images: incidentDraft.images,
    };
    printIncidentDocument(row, mode);
  }
  async function setPickupReceived(row: Incident, received: boolean) {
    try {
      const data = await patchIncident({
        id: row.id,
        orderNumber: row.orderNumber,
        received,
      });
      const updated = data.incident || {
        ...row,
        pickupReceived: received,
        pickupReceivedAt: received ? new Date().toISOString() : '',
      };
      setRegistryRows((rows) =>
        rows.map((item) => (item.id === row.id ? updated : item)),
      );
      if (incident?.id === row.id) setIncident(updated);
      if (selectedIncident?.id === row.id) setSelectedIncident(updated);
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
      const data = await patchIncident({
        id: row.id,
        orderNumber: row.orderNumber,
        solved,
      });
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
      await removeIncident({ id: row.id, orderNumber: row.orderNumber });
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
  const visibleRegistryRows = filterIncidentRegistry(
    registryRows,
    registryFilter,
    modal === 'recogidas',
    showReceivedPickups,
  );
  const visibleReservationRows = filterReservationRegistry(
    reservationRows,
    registryFilter,
  );

  return (
    <main className="min-h-screen bg-background text-foreground">
      <DashboardHeader
        sessionUser={sessionUser}
        shippingLoading={shippingLoading}
        onOpenPackingList={() => window.location.assign('/packing-list')}
        onOpenKpis={() => window.location.assign('/kpis')}
        onOpenHotline={() => window.location.assign('/hotline')}
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
        incidentId={incident?.id || ''}
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
        offset={reservationDialog.offset}
        draft={reservationDraft}
        options={reservationOptions}
        articles={reservationArticles}
        newCustomer={newReservationCustomer}
        onClose={() => setModal(null)}
        onDraftChange={setReservationDraft}
        onNewCustomerChange={setNewReservationCustomer}
        onSave={() => void save('reserva')}
        onDragStart={reservationDialog.start}
        onDragMove={reservationDialog.move}
        onDragStop={reservationDialog.stop}
      />
      <ReservationResultDialog
        open={modal === 'reserva-creada'}
        record={createdReservation}
        onClose={() => setModal(null)}
        onPrintLabel={(record) => requestReservationPrint(record, 'label')}
        onPrint={(record) => requestReservationPrint(record)}
      />
      <CustomerMessageDialog
        open={modal === 'email'}
        draft={emailDraft}
        onClose={() => setModal(null)}
        onChange={setEmailDraft}
        onGeneratedChange={updateGeneratedEmail}
        onCopy={() => void copyEmailText()}
        onWhatsApp={launchWhatsApp}
        onEmail={launchEmail}
      />
      <ShippingHistoryDialog
        open={shippingOpen}
        loading={shippingLoading}
        reference={shippingReference}
        shipments={shipments}
        onOpenChange={setShippingOpen}
        onReferenceChange={(reference) => {
          setShippingReference(reference);
          setShipments(null);
        }}
        onSearch={() => void checkShipping()}
      />
      <ReservationRegistryDialog
        open={modal === 'reservas'}
        loading={reservationsLoading}
        filter={registryFilter}
        rows={visibleReservationRows}
        onClose={() => setModal(null)}
        onFilterChange={setRegistryFilter}
        onCreate={() => void openReservation()}
        onEdit={(row) => void openReservation(row)}
        onPrintLabel={(row) => requestReservationPrint(row, 'label')}
      />
      <IncidentRegistryDialog
        mode={modal === 'registro' || modal === 'recogidas' ? modal : null}
        loading={registryLoading}
        filter={registryFilter}
        rows={visibleRegistryRows}
        showReceived={showReceivedPickups}
        canDelete={canDeleteIncidents(sessionUser)}
        deletingReference={deletingIncident}
        onClose={() => setModal(null)}
        onFilterChange={setRegistryFilter}
        onShowReceivedChange={setShowReceivedPickups}
        onView={showIncidentDocument}
        onPrint={printIncidentDocument}
        onSolve={(row) => void setIncidentSolved(row, true)}
        onDelete={(row) => void deleteIncident(row)}
        onPickupReceivedChange={(row, received) =>
          void setPickupReceived(row, received)
        }
      />
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
