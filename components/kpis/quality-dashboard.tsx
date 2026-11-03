'use client';

import { FormEvent, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, RefreshCcw, Save, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KpiCard } from '@/components/kpis/kpi-card';
import { KPI_ACTIVITIES } from '@/lib/kpi-work-log';
import { QUALITY_SEVERITIES } from '@/lib/quality-error';
import {
  deleteQualityError,
  saveQualityError,
  updateQualityError,
  type QualityResponse,
} from '@/lib/quality-client';

const localDate = () => new Date().toLocaleDateString('en-CA');
const activityName = (value: string) =>
  KPI_ACTIVITIES.find(([id]) => id === value)?.[1] || value;
const severityName = (value: string) =>
  QUALITY_SEVERITIES.find(([id]) => id === value)?.[1] || value;

export function QualityDashboard({
  data,
  onChanged,
}: {
  data: QualityResponse;
  onChanged: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [form, setForm] = useState({
    errorDate: localDate(),
    process: 'preparacion',
    responsibleEmail: '',
    severity: 'media',
    errorType: '',
    reference: '',
    description: '',
    affectedUnits: 1,
    correctionMinutes: 0,
    recurrence: false,
    resolved: false,
  });

  async function submit(event: FormEvent) {
    event.preventDefault();
    const worker = data.workers.find((item) => item.email === form.responsibleEmail);
    if (!worker) return setMessage('Selecciona a la persona responsable del proceso.');
    setSaving(true);
    setMessage('');
    try {
      await saveQualityError({ ...form, responsibleName: worker.displayName });
      setForm({ ...form, errorType: '', reference: '', description: '', affectedUnits: 1, correctionMinutes: 0, recurrence: false, resolved: false });
      setMessage('Error registrado y añadido a los indicadores.');
      onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo registrar el error.');
    } finally {
      setSaving(false);
    }
  }

  async function changeResolved(id: string, resolved: boolean) {
    try {
      await updateQualityError(id, resolved);
      onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo actualizar el error.');
    }
  }

  async function remove(id: string) {
    if (!window.confirm('¿Eliminar este registro de error?')) return;
    try {
      await deleteQualityError(id);
      onChanged();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'No se pudo eliminar el error.');
    }
  }

  const metrics = data.metrics;
  return (
    <>
      <section className="kpi-section">
        <div className="kpi-section-heading">
          <span>Calidad y errores</span>
          <h2>Resultados normalizados por volumen</h2>
          <p>La tasa compara los errores con las gestiones reales para no penalizar a quien realiza más trabajo.</p>
        </div>
        <div className="kpi-grid">
          <KpiCard label="Errores registrados" value={metrics.errors} detail={`${metrics.unresolved} pendientes`} icon={<AlertTriangle />} tone="orange" />
          <KpiCard label="Errores / 100 tareas" value={metrics.errorsPer100 ?? '—'} detail={metrics.workUnits ? `${metrics.workUnits} tareas medidas` : 'Sin volumen medido suficiente'} icon={<RefreshCcw />} tone="burgundy" />
          <KpiCard label="Graves o críticos" value={metrics.severeErrors} detail={`${metrics.recurrences} reincidencias`} icon={<AlertTriangle />} tone="burgundy" />
          <KpiCard label="Tiempo de corrección" value={`${metrics.correctionMinutes} min`} detail={`${metrics.affectedUnits} unidades afectadas`} icon={<Clock3 />} tone="green" />
        </div>
      </section>

      <section className="kpi-section kpi-quality-tables">
        <QualityTable title="Procesos a mejorar" rows={metrics.byProcess.map((row) => ({ name: activityName(row.process), ...row }))} />
        <QualityTable title="Comparativa por persona" rows={metrics.byWorker.map((row) => ({ name: row.workerName, ...row }))} />
      </section>

      <section className="kpi-quality-form">
        <div className="kpi-section-heading"><span>Nuevo registro</span><h2>Registrar un error</h2><p>Registra errores de proceso, no valoraciones personales. Indica siempre un hecho comprobable.</p></div>
        <form onSubmit={submit}>
          <label>Fecha<Input type="date" value={form.errorDate} onChange={(event) => setForm({ ...form, errorDate: event.target.value })} /></label>
          <label>Proceso<select value={form.process} onChange={(event) => setForm({ ...form, process: event.target.value })}>{KPI_ACTIVITIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Responsable del proceso<select value={form.responsibleEmail} onChange={(event) => setForm({ ...form, responsibleEmail: event.target.value })}><option value="">Seleccionar persona</option>{data.workers.map((worker) => <option key={worker.email} value={worker.email}>{worker.displayName}</option>)}</select></label>
          <label>Gravedad<select value={form.severity} onChange={(event) => setForm({ ...form, severity: event.target.value })}>{QUALITY_SEVERITIES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label>Tipo de error<Input value={form.errorType} onChange={(event) => setForm({ ...form, errorType: event.target.value })} placeholder="Ej. colegio incorrecto" /></label>
          <label>Pedido / referencia<Input value={form.reference} onChange={(event) => setForm({ ...form, reference: event.target.value })} /></label>
          <label>Unidades afectadas<Input type="number" min={1} value={form.affectedUnits} onChange={(event) => setForm({ ...form, affectedUnits: Number(event.target.value) })} /></label>
          <label>Minutos para corregir<Input type="number" min={0} value={form.correctionMinutes} onChange={(event) => setForm({ ...form, correctionMinutes: Number(event.target.value) })} /></label>
          <label className="wide">Descripción<textarea value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} placeholder="Qué ocurrió y cómo se detectó…" /></label>
          <label className="check"><input type="checkbox" checked={form.recurrence} onChange={(event) => setForm({ ...form, recurrence: event.target.checked })} /> Es una reincidencia</label>
          <label className="check"><input type="checkbox" checked={form.resolved} onChange={(event) => setForm({ ...form, resolved: event.target.checked })} /> Ya está corregido</label>
          <Button type="submit" disabled={saving}><Save /> {saving ? 'Guardando…' : 'Registrar error'}</Button>
        </form>
        {message && <p className="kpi-form-message">{message}</p>}
      </section>

      <section className="kpi-section">
        <div className="kpi-section-heading"><span>Detalle</span><h2>Registro de errores</h2></div>
        <div className="kpi-quality-list">
          {data.errors.length ? data.errors.map((error) => <article key={error.id}>
            <div className={`quality-severity ${error.severity}`}>{severityName(error.severity)}</div>
            <div className="quality-main"><b>{error.errorType} · {error.responsibleName}</b><span>{error.errorDate} · {activityName(error.process)}{error.reference ? ` · ${error.reference}` : ''}</span><p>{error.description}</p><small>{error.affectedUnits} unidades · {error.correctionMinutes} min de corrección{error.recurrence ? ' · Reincidencia' : ''} · Registrado por {error.reporterName}</small></div>
            <label className="quality-resolved"><input type="checkbox" checked={error.resolved} onChange={(event) => void changeResolved(error.id, event.target.checked)} /><CheckCircle2 /> Corregido</label>
            <Button variant="outline" onClick={() => void remove(error.id)} title="Eliminar registro"><Trash2 /></Button>
          </article>) : <p className="kpi-empty">No hay errores registrados para este periodo y filtro.</p>}
        </div>
      </section>
    </>
  );
}

function QualityTable({ title, rows }: { title: string; rows: Array<{ name: string; errors: number; units: number; errorsPer100: number | null; severe: number; recurrences: number; correctionMinutes: number }> }) {
  return <div><div className="kpi-section-heading"><span>Comparativa</span><h2>{title}</h2></div><table><thead><tr><th>Proceso / persona</th><th>Errores</th><th>Tareas</th><th>Por 100</th><th>Graves</th><th>Reincid.</th><th>Corrección</th></tr></thead><tbody>{rows.map((row) => <tr key={row.name}><td>{row.name}</td><td>{row.errors}</td><td>{row.units || '—'}</td><td><b>{row.errorsPer100 ?? 'Sin base'}</b></td><td>{row.severe}</td><td>{row.recurrences}</td><td>{row.correctionMinutes} min</td></tr>)}</tbody></table></div>;
}
