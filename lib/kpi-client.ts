import { readJsonResponse } from '@/lib/http-response';
import type { KpiSnapshot } from '@/lib/kpi-metrics';
import type { KpiWorkLog } from '@/lib/kpi-work-log';

async function request<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const data = await readJsonResponse<T & { error?: string }>(response);
  if (!response.ok) throw new Error(data.error || 'No se pudo completar la operación de KPI.');
  return data;
}

export function loadKpiSnapshot(from: string, to: string) {
  const params = new URLSearchParams({ from, to });
  return request<KpiSnapshot>(`/api/kpis?${params}`, { cache: 'no-store' });
}

export async function loadKpiWorkLogs(from: string, to: string) {
  const params = new URLSearchParams({ from, to });
  const data = await request<{ logs?: KpiWorkLog[] }>(`/api/kpi-work-logs?${params}`, { cache: 'no-store' });
  return data.logs || [];
}

export async function saveKpiWorkLog(input: Record<string, unknown>) {
  const data = await request<{ log?: KpiWorkLog }>('/api/kpi-work-logs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!data.log) throw new Error('No se pudo guardar el registro de trabajo.');
  return data.log;
}

export function deleteKpiWorkLog(id: string) {
  return request<{ deleted?: boolean }>('/api/kpi-work-logs', {
    method: 'DELETE',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ id }),
  });
}
