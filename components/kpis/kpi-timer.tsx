'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  KPI_ACTIVITIES,
  MANUAL_KPI_ACTIVITIES,
  type KpiActivity,
} from '@/lib/kpi-work-log';
import { loadInitialStatusOrderCount, saveKpiWorkLog } from '@/lib/kpi-client';
import {
  AUTOMATIC_WORK_MESSAGE,
  beginAutomaticWork,
  cancelAutomaticWork,
  completeAutomaticWork,
  type AutomaticWorkMessage,
} from '@/lib/kpi-auto-timer';
import styles from './kpi-timer.module.css';

type ActiveTimer = {
  activity: KpiActivity;
  startedIso: string;
  initialOrders?: number;
  volumeCutoff?: string;
};
const storageKey = 'paddytools-kpi-active-timer';
const clock = (date: Date) =>
  date.toLocaleTimeString('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
const elapsedText = (milliseconds: number) => {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  const hours = Math.floor(seconds / 3600)
    .toString()
    .padStart(2, '0');
  const minutes = Math.floor((seconds % 3600) / 60)
    .toString()
    .padStart(2, '0');
  const rest = (seconds % 60).toString().padStart(2, '0');
  return `${hours}:${minutes}:${rest}`;
};

export function KpiTimer() {
  const [available, setAvailable] = useState(false);
  const [activity, setActivity] = useState<KpiActivity>('preparacion');
  const [active, setActive] = useState<ActiveTimer | null>(null);
  const [now, setNow] = useState(Date.now());
  const [completing, setCompleting] = useState(false);
  const [starting, setStarting] = useState(false);
  const [counts, setCounts] = useState({
    orders: 0,
    products: 0,
    packingLists: 0,
    notes: '',
  });
  const [error, setError] = useState('');
  useEffect(() => {
    if (window.location.pathname === '/login') return;
    fetch('/api/auth/session', { cache: 'no-store' }).then((response) => {
      if (!response.ok) return;
      setAvailable(true);
      const stored = localStorage.getItem(storageKey);
      if (stored)
        try {
          setActive(JSON.parse(stored));
        } catch {
          localStorage.removeItem(storageKey);
        }
    });
  }, []);
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [active]);
  useEffect(() => {
    if (active?.activity !== 'estado_inicial') return;
    setCounts((current) => ({
      ...current,
      orders:
        typeof active.initialOrders === 'number'
          ? active.initialOrders
          : current.orders,
      notes: active.volumeCutoff
        ? `Pedidos en Pago Aceptado hasta ${active.volumeCutoff}.`
        : current.notes,
    }));
  }, [active]);
  useEffect(() => {
    const receiveAutomaticWork = (
      event: MessageEvent<AutomaticWorkMessage>,
    ) => {
      if (event.origin !== window.location.origin) return;
      const message = event.data;
      if (!message || message.type !== AUTOMATIC_WORK_MESSAGE || !message.key)
        return;
      if (message.action === 'start' && message.activity)
        beginAutomaticWork(
          message.key,
          message.activity,
          message.context || '',
        );
      if (message.action === 'cancel') cancelAutomaticWork(message.key);
      if (message.action === 'complete')
        void completeAutomaticWork(message.key, message.counts || {}).catch(
          () => undefined,
        );
    };
    window.addEventListener('message', receiveAutomaticWork);
    return () => window.removeEventListener('message', receiveAutomaticWork);
  }, []);
  const elapsed = useMemo(
    () => (active ? now - new Date(active.startedIso).getTime() : 0),
    [active, now],
  );
  if (!available) return null;
  async function start() {
    setStarting(true);
    setError('');
    try {
      const started = new Date();
      let initialOrders: number | undefined;
      let volumeCutoff: string | undefined;
      if (activity === 'estado_inicial') {
        const exclusiveCutoff = started.toLocaleDateString('en-CA');
        const result = await loadInitialStatusOrderCount(exclusiveCutoff);
        if (!result.orders)
          throw new Error(
            'No hay pedidos en Pago Aceptado hasta ayer para medir esta tarea.',
          );
        initialOrders = result.orders;
        const previousDay = new Date(started);
        previousDay.setDate(previousDay.getDate() - 1);
        volumeCutoff = previousDay.toLocaleDateString('en-CA');
      }
      const next = {
        activity,
        startedIso: started.toISOString(),
        initialOrders,
        volumeCutoff,
      };
      localStorage.setItem(storageKey, JSON.stringify(next));
      setActive(next);
      setNow(Date.now());
    } catch (startError) {
      setError(
        startError instanceof Error
          ? startError.message
          : 'No se pudo iniciar el contador.',
      );
    } finally {
      setStarting(false);
    }
  }
  async function finish() {
    if (!active) return;
    setError('');
    try {
      const started = new Date(active.startedIso);
      const ended = new Date();
      await saveKpiWorkLog({
        workDate: started.toLocaleDateString('en-CA'),
        activity: active.activity,
        startedAt: clock(started),
        endedAt: clock(ended),
        measuredMinutes: Math.max(
          1,
          Math.ceil((ended.getTime() - started.getTime()) / 60000),
        ),
        ...counts,
      });
      localStorage.removeItem(storageKey);
      setActive(null);
      setCompleting(false);
      setCounts({ orders: 0, products: 0, packingLists: 0, notes: '' });
      window.dispatchEvent(new CustomEvent('paddytools:kpi-saved'));
    } catch (finishError) {
      setError(
        finishError instanceof Error
          ? finishError.message
          : 'No se pudo guardar el tiempo.',
      );
    }
  }
  const name =
    KPI_ACTIVITIES.find(([value]) => value === active?.activity)?.[1] || '';
  return (
    <aside className={styles.timer} aria-label="Contador de productividad">
      {!active ? (
        <div className={styles.closed}>
          <select
            value={activity}
            onChange={(e) => setActivity(e.target.value as KpiActivity)}
          >
            {MANUAL_KPI_ACTIVITIES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <button disabled={starting} onClick={() => void start()}>
            {starting ? 'Contando pedidos…' : 'Iniciar'}
          </button>
          {error && <p className={styles.error}>{error}</p>}
        </div>
      ) : completing ? (
        <div className={styles.form}>
          <h3>Terminar: {name}</h3>
          <p>Indica las unidades realizadas durante {elapsedText(elapsed)}.</p>
          {(['orders', 'products', 'packingLists'] as const).map((field) => (
            <label key={field}>
              {field === 'orders'
                ? 'Pedidos'
                : field === 'products'
                  ? 'Productos'
                  : 'PackingLists'}
              <input
                type="number"
                min={0}
                value={counts[field]}
                readOnly={
                  active.activity === 'estado_inicial' &&
                  field === 'orders' &&
                  typeof active.initialOrders === 'number'
                }
                onChange={(e) =>
                  setCounts({ ...counts, [field]: Number(e.target.value) })
                }
              />
            </label>
          ))}
          <label className={styles.wide}>
            Observaciones
            <input
              value={counts.notes}
              onChange={(e) => setCounts({ ...counts, notes: e.target.value })}
            />
          </label>
          {error && <p className={styles.error}>{error}</p>}
          <button
            className={styles.secondary}
            onClick={() => setCompleting(false)}
          >
            Seguir contando
          </button>
          <button onClick={() => void finish()}>Guardar y terminar</button>
        </div>
      ) : (
        <div className={styles.active}>
          <span className={styles.pulse} />
          <div>
            <span>{name}</span>
            <strong>{elapsedText(elapsed)}</strong>
          </div>
          <button onClick={() => setCompleting(true)}>Terminar</button>
        </div>
      )}
    </aside>
  );
}
