import { readJsonResponse } from '@/lib/http-response';
import type { QualitySeverity } from '@/lib/quality-error';

export type QualityErrorRecord = {
  id: string;
  errorDate: string;
  process: string;
  responsibleEmail: string;
  responsibleName: string;
  reporterName: string;
  severity: QualitySeverity;
  errorType: string;
  reference: string;
  description: string;
  affectedUnits: number;
  correctionMinutes: number;
  recurrence: boolean;
  resolved: boolean;
};
export type QualityMetrics = {
  errors: number;
  affectedUnits: number;
  severeErrors: number;
  recurrences: number;
  unresolved: number;
  correctionMinutes: number;
  workUnits: number;
  errorsPer100: number | null;
  byProcess: Array<{ process: string; errors: number; units: number; errorsPer100: number | null; correctionMinutes: number; severe: number; recurrences: number }>;
  byWorker: Array<{ workerEmail: string; workerName: string; errors: number; units: number; errorsPer100: number | null; correctionMinutes: number; severe: number; recurrences: number }>;
};
export type QualityResponse = {
  errors: QualityErrorRecord[];
  workers: Array<{ email: string; displayName: string }>;
  metrics: QualityMetrics;
};

async function request<T>(init?: RequestInit, query = '') {
  const response = await fetch(`/api/quality-errors${query}`, init);
  const data = await readJsonResponse<T & { error?: string }>(response);
  if (!response.ok) throw new Error(data.error || 'No se pudo completar la operación de calidad.');
  return data;
}
export function loadQuality(from: string, to: string, worker = '') {
  const params = new URLSearchParams({ from, to });
  if (worker) params.set('worker', worker);
  return request<QualityResponse>({ cache: 'no-store' }, `?${params}`);
}
export function saveQualityError(input: Record<string, unknown>) {
  return request<{ errorRecord: QualityErrorRecord }>({ method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) });
}
export function updateQualityError(id: string, resolved: boolean) {
  return request<{ updated: boolean }>({ method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id, resolved }) });
}
export function deleteQualityError(id: string) {
  return request<{ deleted: boolean }>({ method: 'DELETE', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ id }) });
}
