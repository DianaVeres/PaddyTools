import { getPackingDb } from '@/db';
import { packingListOrders } from '@/db/schema';
import { listIncidents } from '@/lib/incident-query';
import { listPackingLists } from '@/lib/packing-list-store';
import { calculateKpiSnapshot, type KpiSnapshot } from '@/lib/kpi-metrics';
export type { KpiSnapshot } from '@/lib/kpi-metrics';

export async function buildKpiSnapshot(
  from: string,
  to: string,
): Promise<KpiSnapshot> {
  const [allIncidents, allPackingLists, allPackingOrders] = await Promise.all([
    listIncidents('all'),
    listPackingLists(),
    getPackingDb().select({ shippingDate: packingListOrders.shippingDate }).from(packingListOrders),
  ]);
  return calculateKpiSnapshot({
    from,
    to,
    incidents: allIncidents,
    packingLists: allPackingLists,
    packingOrders: allPackingOrders,
  });
}
