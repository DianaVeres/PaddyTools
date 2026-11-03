import { getDb, getPackingDb } from '@/db';
import { kpiWorkLogs, packingListOrders } from '@/db/schema';
import { listIncidents } from '@/lib/incident-query';
import { listPackingLists } from '@/lib/packing-list-store';
import { calculateKpiSnapshot, type KpiSnapshot } from '@/lib/kpi-metrics';
export type { KpiSnapshot } from '@/lib/kpi-metrics';

export async function buildKpiSnapshot(
  from: string,
  to: string,
  workerEmail = '',
): Promise<KpiSnapshot> {
  const [allIncidents, allPackingLists, allPackingOrders, allWorkLogs] = await Promise.all([
    listIncidents('all'),
    listPackingLists(),
    getPackingDb().select({ shippingDate: packingListOrders.shippingDate }).from(packingListOrders),
    getDb().select().from(kpiWorkLogs),
  ]);
  return calculateKpiSnapshot({
    from,
    to,
    incidents: allIncidents,
    packingLists: allPackingLists,
    packingOrders: allPackingOrders,
    workLogs: workerEmail
      ? allWorkLogs.filter((row) => row.workerEmail === workerEmail)
      : allWorkLogs,
  });
}
