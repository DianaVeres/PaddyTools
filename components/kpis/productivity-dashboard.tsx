'use client';

import { useMemo, useState } from 'react';
import { Calculator, Clock3, Trash2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { requiredPeopleForOrders, type KpiSnapshot } from '@/lib/kpi-metrics';
import { KPI_ACTIVITIES, type KpiWorkLog } from '@/lib/kpi-work-log';
import { KpiCard } from '@/components/kpis/kpi-card';

const activityName = (value: string) => KPI_ACTIVITIES.find(([id]) => id === value)?.[1] || value;
const hours = (minutes: number) => `${Math.floor(minutes / 60)} h ${minutes % 60} min`;

export function ProductivityDashboard({ data, logs, onDelete }: { data: KpiSnapshot; logs: KpiWorkLog[]; onDelete: (id: string) => void }) {
  const [targetOrders, setTargetOrders] = useState(100);
  const [availableHours, setAvailableHours] = useState(8);
  const people = useMemo(() => requiredPeopleForOrders(targetOrders, availableHours, data.orderWorkMinutesPerOrder), [targetOrders, availableHours, data.orderWorkMinutesPerOrder]);
  return (
    <>
      <section className="kpi-section">
        <div className="kpi-section-heading"><span>Tiempos reales</span><h2>Productividad por unidad</h2></div>
        <div className="kpi-grid">
          <KpiCard label="Preparación / pedido" value={`${data.preparationMinutesPerOrder} min`} detail="Solo tiempo de preparación" icon={<Clock3 />} />
          <KpiCard label="Preparación / producto" value={`${data.preparationMinutesPerProduct} min`} detail="Según artículos preparados" icon={<Clock3 />} tone="green" />
          <KpiCard label="Trabajo / pedido" value={`${data.orderWorkMinutesPerOrder} min`} detail="Preparación + comprobación" icon={<Users />} tone="burgundy" />
          <KpiCard label="Tiempo / PackingList" value={`${data.packingMinutesPerList} min`} detail="PackingList completo" icon={<Clock3 />} tone="orange" />
        </div>
      </section>
      <section className="kpi-planner">
        <div><span>PLANIFICACIÓN</span><h2>Personas necesarias</h2><p>Calculado con el tiempo medio real de preparación y comprobación por pedido.</p></div>
        <label>Pedidos previstos<Input type="number" min={1} value={targetOrders} onChange={(e) => setTargetOrders(Number(e.target.value))} /></label>
        <label>Horas disponibles por persona<Input type="number" min={1} step="0.5" value={availableHours} onChange={(e) => setAvailableHours(Number(e.target.value))} /></label>
        <div className="kpi-people-result"><Calculator /><strong>{people || '—'}</strong><span>{people === 1 ? 'persona necesaria' : 'personas necesarias'}</span></div>
      </section>
      <section className="kpi-section kpi-tables">
        <div><div className="kpi-section-heading"><span>Reparto</span><h2>Tiempo por persona</h2></div><table><thead><tr><th>Persona</th><th>Tiempo</th><th>Pedidos</th><th>Productos</th><th>PackingLists</th></tr></thead><tbody>{data.workerBreakdown.map((row) => <tr key={row.workerName}><td>{row.workerName}</td><td>{hours(row.minutes)}</td><td>{row.orders}</td><td>{row.products}</td><td>{row.packingLists}</td></tr>)}</tbody></table></div>
        <div><div className="kpi-section-heading"><span>Funciones</span><h2>Tiempo por tarea</h2></div><table><thead><tr><th>Tarea</th><th>Tiempo</th><th>Registros</th></tr></thead><tbody>{data.activityBreakdown.map((row) => <tr key={row.activity}><td>{activityName(row.activity)}</td><td>{hours(row.minutes)}</td><td>{row.entries}</td></tr>)}</tbody></table></div>
      </section>
      <section className="kpi-section"><div className="kpi-section-heading"><span>Detalle</span><h2>Registros de trabajo</h2></div><div className="kpi-log-list">{logs.length ? logs.map((log) => <article key={log.id}><div><b>{log.workerName} · {activityName(log.activity)}</b><span>{log.workDate} · {log.startedAt}–{log.endedAt} · {log.minutes} min</span><small>{log.orders} pedidos · {log.products} productos · {log.packingLists} PackingLists{log.notes ? ` · ${log.notes}` : ''}</small></div><Button variant="outline" onClick={() => onDelete(log.id)} title="Eliminar registro"><Trash2 /></Button></article>) : <p className="kpi-empty">Todavía no hay tiempos registrados para estas fechas.</p>}</div></section>
    </>
  );
}
