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

const inRange = (value: string, from: string, to: string) => {
  const date = value?.slice(0, 10) || '';
  return Boolean(date) && (!from || date >= from) && (!to || date <= to);
};

const percentage = (part: number, total: number) =>
  total ? Math.round((part / total) * 100) : 0;

export function calculateKpiSnapshot(input: {
  from: string;
  to: string;
  incidents: KpiIncident[];
  packingLists: KpiPackingList[];
  packingOrders: KpiPackingOrder[];
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
  };
}
