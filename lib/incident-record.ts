export type IncidentRecord = {
  id: string;
  orderNumber: string;
  sourceType?: 'order' | 'tienda' | 'manual' | string;
  ticketNumber?: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  incidentText: string;
  observations: string;
  incidentDate: string;
  solved: boolean;
  shippingRequired: boolean;
  sent: boolean;
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
  images: IncidentImage[];
};

export type IncidentImage = {
  key: string;
  name: string;
  type: string;
  size: number;
  uploadedAt: string;
};

export const incidentImageUrl = (incidentId: string, key: string) =>
  `/api/incidents/images?incidentId=${encodeURIComponent(incidentId)}&key=${encodeURIComponent(key)}`;

export const formatIncidentDate = (value: string, fallback = 'No indicada') => {
  const raw = value?.slice(0, 10) || '';
  return /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? `${raw.slice(8, 10)}/${raw.slice(5, 7)}/${raw.slice(0, 4)}`
    : value || fallback;
};

export const formatIncidentDateTime = (
  value: string,
  fallback = 'Fecha no registrada',
) => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('es-ES', {
    timeZone: 'Europe/Madrid',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

export const incidentSchoolName = (incident: IncidentRecord) =>
  incident.school || incident.pickupSchoolName || 'SIN COLEGIO';

export const incidentLabelLines = (incident: IncidentRecord) => [
  `INCIDENCIA ${incident.orderNumber}`,
  `NOMBRE: ${incident.customerName || 'SIN NOMBRE'}`,
  `FECHA: ${formatIncidentDate(incident.incidentDate, '')}`,
  `RECOGIDA ${incidentSchoolName(incident)}`,
];

export const incidentStatusLabel = (incident: IncidentRecord) =>
  [
    incident.solved ? 'Resuelta' : 'Pendiente',
    incident.shippingRequired
      ? incident.sent
        ? 'Enviada'
        : 'Envío pendiente'
      : 'Sin envío requerido',
  ].join(' · ');
