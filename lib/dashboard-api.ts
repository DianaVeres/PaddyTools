import { readJsonResponse } from '@/lib/http-response';
import type { IncidentRecord } from '@/lib/incident-record';
import type { OrderNoteRecord } from '@/lib/order-note';
import type {
  DashboardMondayRecord,
  DashboardOrder,
  DashboardShipment,
  MondayUpdate,
  OrderSearchMatch,
  ReservationOptions,
  SchoolProduct,
  SessionUser,
} from '@/lib/dashboard-types';
import type { StoreTicketRecord } from '@/lib/store-ticket';
import { incidentsMatchingCustomerQuery } from '@/lib/dashboard-search-results';
import {
  hotlineContactsForOrder,
  type HotlineOrderContact,
} from '@/lib/hotline-order-history';

async function requestJson<T>(
  url: string,
  init: RequestInit = { cache: 'no-store' },
  source?: string,
): Promise<T> {
  const response = await fetch(url, init);
  const data = await readJsonResponse<T & { error?: string }>(response, {
    source,
  });
  if (!response.ok)
    throw new Error(
      data.error ||
        `No se pudo completar la petición a ${source || 'PaddyTools'}.`,
    );
  return data;
}

const jsonMutation = (method: string, body: unknown): RequestInit => ({
  method,
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body),
});

export async function fetchOrderNotes(orderNumber: string) {
  const data = await requestJson<{ notes?: OrderNoteRecord[] }>(
    `/api/order-notes?number=${encodeURIComponent(orderNumber)}`,
  );
  return data.notes || [];
}

export async function fetchHotlineContacts(orderNumber: string) {
  const data = await requestJson<{ cases?: HotlineOrderContact[] }>(
    '/api/hotline/cases',
    { cache: 'no-store' },
    'Hotline',
  );
  return hotlineContactsForOrder(data.cases || [], orderNumber);
}

export async function postOrderNote(body: unknown) {
  const data = await requestJson<{ note?: OrderNoteRecord }>(
    '/api/order-notes',
    jsonMutation('POST', body),
  );
  if (!data.note) throw new Error('No se pudo guardar la nota.');
  return data.note;
}

export async function removeOrderNote(body: unknown) {
  const data = await requestJson<{ deleted?: boolean }>(
    '/api/order-notes',
    jsonMutation('DELETE', body),
  );
  if (!data.deleted) throw new Error('No se pudo eliminar la nota.');
}

export async function setRemoteReturnAttended(body: unknown) {
  const data = await requestJson<{ returnAttended?: boolean }>(
    '/api/return-attended',
    jsonMutation('POST', body),
    'WooCommerce',
  );
  return Boolean(data.returnAttended);
}

export async function fetchOrderDocument(params: URLSearchParams) {
  const response = await fetch(`/api/order-documents?${params}`, {
    cache: 'no-store',
  });
  if (!response.ok) {
    const data = await readJsonResponse<{ error?: string }>(response, {
      source: 'WooCommerce',
    });
    throw new Error(data.error || 'No se pudo descargar el documento.');
  }
  return response.blob();
}

export async function fetchMondayUpdates(itemIds: string) {
  const data = await requestJson<{ updates?: MondayUpdate[] }>(
    `/api/monday?updatesFor=${encodeURIComponent(itemIds)}`,
    { cache: 'no-store' },
    'Monday',
  );
  return data.updates || [];
}

export async function fetchReservationOptions() {
  return requestJson<ReservationOptions>(
    '/api/monday?mode=reservation-options',
    { cache: 'no-store' },
    'Monday',
  );
}

export async function fetchReservations() {
  const data = await requestJson<{ records?: DashboardMondayRecord[] }>(
    '/api/monday?mode=reservations',
    { cache: 'no-store' },
    'Monday',
  );
  return data.records || [];
}

export async function fetchSchoolProducts(school: string) {
  const data = await requestJson<SchoolProduct[]>(
    `/api/school-products?school=${encodeURIComponent(school)}`,
    { cache: 'no-store' },
    'WooCommerce',
  );
  return Array.isArray(data) ? data : [];
}

export function postIncident(body: unknown) {
  return requestJson<{ id?: string; incident?: IncidentRecord }>(
    '/api/incidents',
    jsonMutation('POST', body),
  );
}

export async function uploadIncidentImages(incidentId: string, images: File[]) {
  if (!images.length) return null;
  const form = new FormData();
  form.set('incidentId', incidentId);
  images.forEach((image) => form.append('images', image));
  return requestJson<{ incident?: IncidentRecord }>('/api/incidents/images', {
    method: 'POST',
    body: form,
  });
}

export function saveMondayReservation(body: unknown, editing: boolean) {
  return requestJson<{ id?: string; formula?: string }>(
    '/api/monday',
    jsonMutation(editing ? 'PUT' : 'POST', body),
    'Monday',
  );
}

export async function fetchShippingMatches(order: string) {
  const data = await requestJson<{ matches?: DashboardShipment[] }>(
    `/api/shipping?order=${encodeURIComponent(order)}`,
  );
  return data.matches || [];
}

export async function fetchIncidentRegistry(scope: 'all' | 'pickups') {
  const data = await requestJson<{ rows?: IncidentRecord[] }>(
    `/api/incidents?scope=${scope}`,
  );
  return data.rows || [];
}

export function patchIncident(body: unknown) {
  return requestJson<{ incident?: IncidentRecord }>(
    '/api/incidents',
    jsonMutation('PATCH', body),
  );
}

export async function removeIncident(body: unknown) {
  const data = await requestJson<{ deleted?: boolean }>(
    '/api/incidents',
    jsonMutation('DELETE', body),
  );
  if (!data.deleted) throw new Error('No se pudo eliminar la incidencia.');
}

export function fetchSessionUser() {
  return requestJson<{ user: SessionUser }>('/api/auth/session').then(
    (data) => data.user,
  );
}

export async function closeSession() {
  const response = await fetch('/api/auth/logout', { method: 'POST' });
  if (!response.ok) throw new Error('No se pudo cerrar la sesión.');
}

export function runMondayMaintenance(token: string) {
  return requestJson<{ removed?: boolean; message?: string }>(
    `/api/monday?maintenance=${encodeURIComponent(token)}`,
  );
}

export function fetchSchools() {
  return requestJson<string[]>('/api/schools');
}

async function safeJson<T>(
  response: Response,
  source?: string,
): Promise<{ ok: boolean; data: T & { error?: string } }> {
  const data = await readJsonResponse<T & { error?: string }>(response, {
    source,
  });
  return { ok: response.ok, data };
}

type ConnectedSearchCallbacks = {
  onWooMatches?: (matches: OrderSearchMatch[]) => void;
  onMondayMatches?: (records: DashboardMondayRecord[]) => void;
  onIncidentMatches?: (incidents: IncidentRecord[]) => void;
};

export async function searchConnectedRecords(
  searchTerm: string,
  callbacks: ConnectedSearchCallbacks = {},
) {
  const wooPromise = fetch(`/api/search?query=${encodeURIComponent(searchTerm)}`, {
      cache: 'no-store',
    }).then((response) => safeJson<{ matches?: OrderSearchMatch[] }>(response, 'WooCommerce'))
    .then((result) => {
      const matches = result.ok ? result.data.matches || [] : [];
      callbacks.onWooMatches?.(matches);
      return result;
    });
  const mondayPromise = fetch(`/api/monday?query=${encodeURIComponent(searchTerm)}`, {
      cache: 'no-store',
    }).then((response) => safeJson<{ records?: DashboardMondayRecord[] }>(response, 'Monday'))
    .then((result) => {
      const records = result.ok ? result.data.records || [] : [];
      callbacks.onMondayMatches?.(records);
      return result;
    });
  const incidentsPromise = fetch('/api/incidents?scope=all', { cache: 'no-store' })
    .then((response) => safeJson<{ rows?: IncidentRecord[] }>(response))
    .then((result) => {
      const matches = result.ok
        ? incidentsMatchingCustomerQuery(result.data.rows || [], searchTerm)
        : [];
      callbacks.onIncidentMatches?.(matches);
      return result;
    });
  const [woo, monday, incidents] = await Promise.all([
    wooPromise,
    mondayPromise,
    incidentsPromise,
  ]);
  return {
    wooMatches: woo.ok ? woo.data.matches || [] : [],
    mondayMatches: monday.ok ? monday.data.records || [] : [],
    incidentMatches: incidents.ok
      ? incidentsMatchingCustomerQuery(incidents.data.rows || [], searchTerm)
      : [],
  };
}

export async function searchExactConnected(input: {
  reference: string;
  ticketReference: string;
  incidentId?: string;
  wooOrder: boolean;
}, callbacks: {
  onOrder?: (order: DashboardOrder) => void;
  onIncident?: (incident: IncidentRecord) => void;
  onMondayRecords?: (records: DashboardMondayRecord[]) => void;
  onTicket?: (ticket: StoreTicketRecord) => void;
} = {}) {
  const wooPromise = input.wooOrder
    ? fetch(`/api/search?number=${encodeURIComponent(input.reference)}`, {
            cache: 'no-store',
          })
        .then((response) => safeJson<DashboardOrder>(response, 'WooCommerce'))
        .then((result) => {
          if (result.ok) callbacks.onOrder?.(result.data);
          return result;
        })
    : Promise.resolve({
        ok: false,
        data: {} as DashboardOrder & { error?: string },
      });
  const incidentPromise = fetch(
        input.incidentId
          ? `/api/incidents?id=${encodeURIComponent(input.incidentId)}`
          : `/api/incidents?number=${encodeURIComponent(input.reference)}`,
        { cache: 'no-store' },
      ).then((response) => safeJson<{ found?: boolean; incident?: IncidentRecord }>(response))
      .then((result) => {
        if (result.ok && result.data.found && result.data.incident)
          callbacks.onIncident?.(result.data.incident);
        return result;
      });
  const mondayPromise = fetch(`/api/monday?number=${encodeURIComponent(input.reference)}`, {
        cache: 'no-store',
      }).then((response) => safeJson<{ found?: boolean; records?: DashboardMondayRecord[] }>(response, 'Monday'))
      .then((result) => {
        if (result.ok) callbacks.onMondayRecords?.(result.data.records || []);
        return result;
      });
  const ticketPromise = fetch(
        `/api/tickets?number=${encodeURIComponent(input.ticketReference)}`,
        {
          cache: 'no-store',
        },
      ).then((response) => safeJson<{ found?: boolean; ticket?: StoreTicketRecord }>(response))
      .then((result) => {
        if (result.ok && result.data.found && result.data.ticket)
          callbacks.onTicket?.(result.data.ticket);
        return result;
      });
  const [woo, incident, monday, ticket] = await Promise.all([
    wooPromise,
    incidentPromise,
    mondayPromise,
    ticketPromise,
  ]);
  return {
    order: woo.ok ? woo.data : null,
    incident:
      incident.ok && incident.data.found
        ? incident.data.incident || null
        : null,
    mondayRecords: monday.ok ? monday.data.records || [] : [],
    ticket: ticket.ok && ticket.data.found ? ticket.data.ticket || null : null,
    found:
      woo.ok ||
      Boolean(incident.data.found || monday.data.found || ticket.data.found),
    errors: [woo.data.error, incident.data.error, monday.data.error].filter(
      Boolean,
    ),
  };
}
