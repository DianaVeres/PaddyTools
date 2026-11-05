import { getDb, getPackingDb } from '@/db';
import { kpiWorkLogs, packingListOrders } from '@/db/schema';
import { listIncidents } from '@/lib/incident-query';
import { listPackingLists } from '@/lib/packing-list-store';
import { calculateKpiSnapshot, type KpiSnapshot } from '@/lib/kpi-metrics';
export type { KpiSnapshot } from '@/lib/kpi-metrics';

const normalizedEmail = (value: string) => value.trim().toLowerCase();

export function filterKpiWorkLogsByWorker<T extends { workerEmail: string }>(
  rows: T[],
  workerEmail = '',
) {
  const selected = normalizedEmail(workerEmail);
  return selected
    ? rows.filter((row) => normalizedEmail(row.workerEmail) === selected)
    : rows;
}

export async function buildKpiSnapshot(
  from: string,
  to: string,
  workerEmail = '',
): Promise<KpiSnapshot> {
  const [allIncidents, allPackingLists, allPackingOrders, allWorkLogs] =
    await Promise.all([
      listIncidents('all'),
      listPackingLists(),
      getPackingDb()
        .select({ shippingDate: packingListOrders.shippingDate })
        .from(packingListOrders),
      getDb().select().from(kpiWorkLogs),
    ]);
  return calculateKpiSnapshot({
    from,
    to,
    incidents: allIncidents,
    packingLists: allPackingLists,
    packingOrders: allPackingOrders,
    workLogs: filterKpiWorkLogsByWorker(allWorkLogs, workerEmail),
  });
}
