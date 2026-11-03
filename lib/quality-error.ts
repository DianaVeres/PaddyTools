import { KPI_ACTIVITIES, type KpiActivity } from './kpi-work-log.ts';

export const QUALITY_SEVERITIES = [
  ['leve', 'Leve'],
  ['media', 'Media'],
  ['grave', 'Grave'],
  ['critica', 'Crítica'],
] as const;

export type QualitySeverity = (typeof QUALITY_SEVERITIES)[number][0];
export type QualityErrorInput = {
  errorDate: string;
  process: KpiActivity;
  responsibleEmail: string;
  responsibleName: string;
  severity: QualitySeverity;
  errorType: string;
  reference: string;
  description: string;
  affectedUnits: number;
  correctionMinutes: number;
  recurrence: boolean;
  resolved: boolean;
};

const nonNegativeInteger = (value: unknown) => {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
};

export function validateQualityError(input: Record<string, unknown>): QualityErrorInput {
  const errorDate = String(input.errorDate || '').slice(0, 10);
  const process = String(input.process || '') as KpiActivity;
  const responsibleEmail = String(input.responsibleEmail || '').trim().toLowerCase();
  const responsibleName = String(input.responsibleName || '').trim().slice(0, 120);
  const severity = String(input.severity || 'media') as QualitySeverity;
  const errorType = String(input.errorType || '').trim().slice(0, 120);
  const reference = String(input.reference || '').trim().slice(0, 120);
  const description = String(input.description || '').trim().slice(0, 1000);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(errorDate)) throw new Error('Indica la fecha del error.');
  if (!KPI_ACTIVITIES.some(([value]) => value === process)) throw new Error('Selecciona el proceso en el que ocurrió.');
  if (!responsibleEmail || !responsibleName) throw new Error('Selecciona a la persona responsable del proceso.');
  if (!QUALITY_SEVERITIES.some(([value]) => value === severity)) throw new Error('Selecciona una gravedad válida.');
  if (!errorType) throw new Error('Indica el tipo de error.');
  if (!description) throw new Error('Describe qué ha ocurrido.');
  return {
    errorDate,
    process,
    responsibleEmail,
    responsibleName,
    severity,
    errorType,
    reference,
    description,
    affectedUnits: Math.max(1, nonNegativeInteger(input.affectedUnits)),
    correctionMinutes: nonNegativeInteger(input.correctionMinutes),
    recurrence: Boolean(input.recurrence),
    resolved: Boolean(input.resolved),
  };
}

type QualityWork = {
  workerEmail: string;
  workerName: string;
  activity: string;
  orders: number;
  products: number;
  packingLists: number;
};
type QualityRow = Omit<QualityErrorInput, 'process' | 'severity'> & {
  id: string;
  process: string;
  severity: string;
};

const workUnits = (row: QualityWork) => {
  if (row.activity === 'packing') return row.packingLists;
  if (row.activity === 'preparacion' || row.activity === 'comprobacion') return row.orders;
  return 1;
};
const rate = (errors: number, units: number) =>
  units ? Math.round((errors * 1000) / units) / 10 : null;

export function calculateQualitySnapshot(errors: QualityRow[], workLogs: QualityWork[]) {
  const processMap = new Map<string, { errors: number; units: number; correctionMinutes: number; severe: number; recurrences: number }>();
  const workerMap = new Map<string, { workerEmail: string; workerName: string; errors: number; units: number; correctionMinutes: number; severe: number; recurrences: number }>();
  for (const log of workLogs) {
    const units = workUnits(log);
    const process = processMap.get(log.activity) || { errors: 0, units: 0, correctionMinutes: 0, severe: 0, recurrences: 0 };
    process.units += units;
    processMap.set(log.activity, process);
    const worker = workerMap.get(log.workerEmail) || { workerEmail: log.workerEmail, workerName: log.workerName, errors: 0, units: 0, correctionMinutes: 0, severe: 0, recurrences: 0 };
    worker.units += units;
    workerMap.set(log.workerEmail, worker);
  }
  for (const error of errors) {
    const process = processMap.get(error.process) || { errors: 0, units: 0, correctionMinutes: 0, severe: 0, recurrences: 0 };
    process.errors += 1;
    process.correctionMinutes += error.correctionMinutes;
    process.severe += error.severity === 'grave' || error.severity === 'critica' ? 1 : 0;
    process.recurrences += error.recurrence ? 1 : 0;
    processMap.set(error.process, process);
    const worker = workerMap.get(error.responsibleEmail) || { workerEmail: error.responsibleEmail, workerName: error.responsibleName, errors: 0, units: 0, correctionMinutes: 0, severe: 0, recurrences: 0 };
    worker.errors += 1;
    worker.correctionMinutes += error.correctionMinutes;
    worker.severe += error.severity === 'grave' || error.severity === 'critica' ? 1 : 0;
    worker.recurrences += error.recurrence ? 1 : 0;
    workerMap.set(error.responsibleEmail, worker);
  }
  const totalUnits = workLogs.reduce((total, row) => total + workUnits(row), 0);
  return {
    errors: errors.length,
    affectedUnits: errors.reduce((total, row) => total + row.affectedUnits, 0),
    severeErrors: errors.filter((row) => row.severity === 'grave' || row.severity === 'critica').length,
    recurrences: errors.filter((row) => row.recurrence).length,
    unresolved: errors.filter((row) => !row.resolved).length,
    correctionMinutes: errors.reduce((total, row) => total + row.correctionMinutes, 0),
    workUnits: totalUnits,
    errorsPer100: rate(errors.length, totalUnits),
    byProcess: [...processMap.entries()].map(([process, values]) => ({ process, ...values, errorsPer100: rate(values.errors, values.units) })).sort((a, b) => (b.errorsPer100 ?? -1) - (a.errorsPer100 ?? -1) || b.errors - a.errors),
    byWorker: [...workerMap.values()].map((values) => ({ ...values, errorsPer100: rate(values.errors, values.units) })).sort((a, b) => (b.errorsPer100 ?? -1) - (a.errorsPer100 ?? -1) || b.errors - a.errors),
  };
}
