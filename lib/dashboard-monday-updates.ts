import type { DashboardMondayRecord } from '@/lib/dashboard-types';

export function mondayUpdateItemIds(records: DashboardMondayRecord[]): string {
  return [...new Set(records.map((record) => record.id).filter(Boolean))]
    .sort()
    .join(',');
}
