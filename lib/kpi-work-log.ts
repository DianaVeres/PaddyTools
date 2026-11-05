export const KPI_ACTIVITIES = [
  ['preparacion', 'Preparar pedidos'],
  ['estado_inicial', 'Cambiar estado inicial'],
  ['reservas', 'Preparar reservas'],
  ['avisos_colegios', 'Avisos llegada colegios'],
  // Se conserva para leer los registros históricos, pero ya no se ofrece
  // como una medición manual nueva.
  ['comprobacion', 'Comprobar pedidos'],
  ['packing', 'Preparar PackingLists'],
  ['incidencias', 'Preparar incidencias'],
  ['correos', 'Responder correos'],
  ['recogidas', 'Gestionar recogidas'],
  ['otro', 'Otra tarea'],
] as const;

// PackingList y Hotline abren y cierran su propio contador. No deben aparecer
// en el selector manual porque eso duplicaría el tiempo registrado.
export const AUTOMATIC_KPI_ACTIVITIES = ['packing', 'correos'] as const;
export const RETIRED_KPI_ACTIVITIES = ['comprobacion'] as const;
export const MANUAL_KPI_ACTIVITIES = KPI_ACTIVITIES.filter(
  ([value]) =>
    !AUTOMATIC_KPI_ACTIVITIES.some((automatic) => automatic === value) &&
    !RETIRED_KPI_ACTIVITIES.some((retired) => retired === value),
);

export type KpiActivity = (typeof KPI_ACTIVITIES)[number][0];
export type KpiWorkLog = {
  id: string;
  workDate: string;
  workerEmail: string;
  workerName: string;
  activity: KpiActivity;
  startedAt: string;
  endedAt: string;
  minutes: number;
  orders: number;
  products: number;
  packingLists: number;
  notes: string;
  createdAt: Date | string;
};

const timeMinutes = (value: string) => {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return -1;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  return hours < 24 && minutes < 60 ? hours * 60 + minutes : -1;
};

export function workDurationMinutes(startedAt: string, endedAt: string) {
  const start = timeMinutes(startedAt);
  const end = timeMinutes(endedAt);
  return start >= 0 && end > start ? end - start : 0;
}

const count = (value: unknown) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
};

export function validateKpiWorkLog(input: Record<string, unknown>) {
  const workDate = String(input.workDate || '').slice(0, 10);
  const activity = String(input.activity || '') as KpiActivity;
  const startedAt = String(input.startedAt || '').slice(0, 5);
  const endedAt = String(input.endedAt || '').slice(0, 5);
  const measuredMinutes = count(input.measuredMinutes);
  const minutes = measuredMinutes || workDurationMinutes(startedAt, endedAt);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(workDate))
    throw new Error('Indica la fecha del trabajo.');
  if (!KPI_ACTIVITIES.some(([value]) => value === activity))
    throw new Error('Selecciona la tarea realizada.');
  if (!minutes)
    throw new Error('La hora final debe ser posterior a la inicial.');
  const orders = count(input.orders);
  const products = count(input.products);
  const packingLists = count(input.packingLists);
  if (
    !orders &&
    !products &&
    !packingLists &&
    activity !== 'correos' &&
    activity !== 'incidencias' &&
    activity !== 'recogidas' &&
    activity !== 'otro'
  )
    throw new Error('Indica al menos un pedido, producto o PackingList.');
  return {
    workDate,
    activity,
    startedAt,
    endedAt,
    minutes,
    orders,
    products,
    packingLists,
    notes: String(input.notes || '')
      .trim()
      .slice(0, 500),
  };
}
