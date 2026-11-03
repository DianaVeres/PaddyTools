'use client';

import { saveKpiWorkLog } from '@/lib/kpi-client';
import type { KpiActivity } from '@/lib/kpi-work-log';

type AutomaticTimer = {
  activity: KpiActivity;
  startedIso: string;
  context: string;
};
const prefix = 'paddytools-kpi-auto:';
const maximumAge = 12 * 60 * 60 * 1000;
const keyFor = (key: string) => `${prefix}${key}`;
const localClock = (date: Date) =>
  date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

export function beginAutomaticWork(
  key: string,
  activity: KpiActivity,
  context = '',
): AutomaticTimer {
  const stored = localStorage.getItem(keyFor(key));
  if (stored) {
    try {
      const current = JSON.parse(stored) as AutomaticTimer;
      if (Date.now() - new Date(current.startedIso).getTime() < maximumAge)
        return current;
    } catch {
      // Un contador dañado o antiguo se sustituye por uno nuevo.
    }
  }
  const timer = { activity, context, startedIso: new Date().toISOString() };
  localStorage.setItem(keyFor(key), JSON.stringify(timer));
  return timer;
}

export function cancelAutomaticWork(key: string) {
  localStorage.removeItem(keyFor(key));
}

export function readAutomaticWork(key: string): AutomaticTimer | null {
  const stored = localStorage.getItem(keyFor(key));
  if (!stored) return null;
  try {
    return JSON.parse(stored) as AutomaticTimer;
  } catch {
    cancelAutomaticWork(key);
    return null;
  }
}

export async function completeAutomaticWork(
  key: string,
  counts: {
    orders?: number;
    products?: number;
    packingLists?: number;
    notes?: string;
  },
) {
  const timer = readAutomaticWork(key);
  if (!timer) return null;
  const started = new Date(timer.startedIso);
  const ended = new Date();
  const measuredMinutes = Math.max(
    1,
    Math.ceil((ended.getTime() - started.getTime()) / 60000),
  );
  const log = await saveKpiWorkLog({
    workDate: started.toLocaleDateString('en-CA'),
    activity: timer.activity,
    startedAt: localClock(started),
    endedAt: localClock(ended),
    measuredMinutes,
    orders: counts.orders || 0,
    products: counts.products || 0,
    packingLists: counts.packingLists || 0,
    notes: [timer.context, counts.notes].filter(Boolean).join(' · '),
  });
  cancelAutomaticWork(key);
  window.dispatchEvent(new CustomEvent('paddytools:kpi-saved'));
  return log;
}
