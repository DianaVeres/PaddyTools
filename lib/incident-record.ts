export type IncidentRecord = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  incidentText: string;
  observations: string;
  incidentDate: string;
  solved: boolean;
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
};

export const formatIncidentDate = (
  value: string,
  fallback = 'No indicada',
) => {
  const raw = value?.slice(0, 10) || '';
  return /^\d{4}-\d{2}-\d{2}$/.test(raw)
    ? `${raw.slice(8, 10)}/${raw.slice(5, 7)}/${raw.slice(0, 4)}`
    : value || fallback;
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
  [incident.solved ? 'Resuelta' : 'Pendiente', incident.sent ? 'Enviada' : 'No enviada'].join(
    ' · ',
  );
