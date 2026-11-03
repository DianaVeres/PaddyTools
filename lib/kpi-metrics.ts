export type KpiSnapshot = {
  from: string;
  to: string;
  packingLists: number;
  shippedOrders: number;
  activeSchools: number;
  incidents: number;
  solvedIncidents: number;
  pendingIncidents: number;
  pickups: number;
  receivedPickups: number;
  recurrences: number;
  resolutionRate: number;
  pickupRate: number;
  workers: number;
  totalTrackedMinutes: number;
  preparationMinutesPerOrder: number;
  preparationMinutesPerProduct: number;
  orderWorkMinutesPerOrder: number;
  packingMinutesPerList: number;
  activityBreakdown: Array<{ activity: string; minutes: number; entries: number }>;
  workerBreakdown: Array<{
    workerName: string;
    minutes: number;
    entries: number;
    orders: number;
    products: number;
    packingLists: number;
  }>;
};

type KpiIncident = {
  incidentDate: string;
  updatedAt: string;
  solved: boolean;
  pickupSchool: boolean;
  pickupReceived: boolean;
  recurrenceCount: number;
};
type KpiPackingList = { shippingDate: string; school: string };
type KpiPackingOrder = { shippingDate: string };
type KpiWork = {
  workDate: string;
  workerEmail: string;
  workerName: string;
  activity: string;
  minutes: number;
  orders: number;
  products: number;
  packingLists: number;
};

const inRange = (value: string, from: string, to: string) => {
  const date = value?.slice(0, 10) || '';
  return Boolean(date) && (!from || date >= from) && (!to || date <= to);
};

const percentage = (part: number, total: number) =>
  total ? Math.round((part / total) * 100) : 0;
const average = (total: number, units: number) =>
  units ? Math.round((total / units) * 10) / 10 : 0;

export function requiredPeopleForOrders(
  targetOrders: number,
  availableHours: number,
  minutesPerOrder: number,
) {
  if (targetOrders <= 0 || availableHours <= 0 || minutesPerOrder <= 0) return 0;
  return Math.ceil((targetOrders * minutesPerOrder) / (availableHours * 60));
}

export function calculateKpiSnapshot(input: {
  from: string;
  to: string;
  incidents: KpiIncident[];
  packingLists: KpiPackingList[];
  packingOrders: KpiPackingOrder[];
  workLogs?: KpiWork[];
}): KpiSnapshot {
  const incidents = input.incidents.filter((row) =>
    inRange(row.incidentDate || row.updatedAt, input.from, input.to),
  );
  const packingLists = input.packingLists.filter((row) =>
    inRange(row.shippingDate, input.from, input.to),
  );
  const packingOrders = input.packingOrders.filter((row) =>
    inRange(row.shippingDate, input.from, input.to),
  );
  const solvedIncidents = incidents.filter((row) => row.solved).length;
  const pickups = incidents.filter((row) => row.pickupSchool);
  const receivedPickups = pickups.filter((row) => row.pickupReceived).length;
  const workLogs = (input.workLogs || []).filter((row) =>
    inRange(row.workDate, input.from, input.to),
  );
  const preparation = workLogs.filter((row) => row.activity === 'preparacion');
  const orderWork = workLogs.filter((row) =>
    row.activity === 'preparacion' || row.activity === 'comprobacion',
  );
  const packingWork = workLogs.filter((row) => row.activity === 'packing');
  const sum = (rows: KpiWork[], field: 'minutes' | 'orders' | 'products' | 'packingLists') =>
    rows.reduce((total, row) => total + (row[field] || 0), 0);
  const activities = new Map<string, { minutes: number; entries: number }>();
  const workers = new Map<string, KpiSnapshot['workerBreakdown'][number]>();
  for (const row of workLogs) {
    const activity = activities.get(row.activity) || { minutes: 0, entries: 0 };
    activity.minutes += row.minutes;
    activity.entries += 1;
    activities.set(row.activity, activity);
    const worker = workers.get(row.workerEmail) || {
      workerName: row.workerName,
      minutes: 0,
      entries: 0,
      orders: 0,
      products: 0,
      packingLists: 0,
    };
    worker.minutes += row.minutes;
    worker.entries += 1;
    worker.orders += row.orders;
    worker.products += row.products;
    worker.packingLists += row.packingLists;
    workers.set(row.workerEmail, worker);
  }
  return {
    from: input.from,
    to: input.to,
    packingLists: packingLists.length,
    shippedOrders: packingOrders.length,
    activeSchools: new Set(packingLists.map((row) => row.school)).size,
    incidents: incidents.length,
    solvedIncidents,
    pendingIncidents: incidents.length - solvedIncidents,
    pickups: pickups.length,
    receivedPickups,
    recurrences: incidents.reduce(
      (total, row) => total + Math.max(0, row.recurrenceCount || 0),
      0,
    ),
    resolutionRate: percentage(solvedIncidents, incidents.length),
    pickupRate: percentage(receivedPickups, pickups.length),
    workers: new Set(workLogs.map((row) => row.workerEmail)).size,
    totalTrackedMinutes: sum(workLogs, 'minutes'),
    preparationMinutesPerOrder: average(sum(preparation, 'minutes'), sum(preparation, 'orders')),
    preparationMinutesPerProduct: average(sum(preparation, 'minutes'), sum(preparation, 'products')),
    orderWorkMinutesPerOrder: average(sum(orderWork, 'minutes'), sum(orderWork, 'orders')),
    packingMinutesPerList: average(sum(packingWork, 'minutes'), sum(packingWork, 'packingLists')),
    activityBreakdown: [...activities.entries()].map(([activity, value]) => ({ activity, ...value })).sort((a, b) => b.minutes - a.minutes),
    workerBreakdown: [...workers.values()].sort((a, b) => b.minutes - a.minutes),
  };
}
