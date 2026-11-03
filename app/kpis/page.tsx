'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, BarChart3, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KpiDashboard } from '@/components/kpis/kpi-dashboard';
import { WorkLogForm } from '@/components/kpis/work-log-form';
import { ProductivityDashboard } from '@/components/kpis/productivity-dashboard';
import { deleteKpiWorkLog, loadKpiSnapshot, loadKpiWorkLogs } from '@/lib/kpi-client';
import type { KpiSnapshot } from '@/lib/kpi-metrics';
import type { KpiWorkLog } from '@/lib/kpi-work-log';
import './kpis.css';

const localDate = (date: Date) => date.toLocaleDateString('en-CA');
const initialDates = () => {
  const now = new Date();
  return {
    from: localDate(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: localDate(now),
  };
};

export default function KpisPage() {
  const [dates, setDates] = useState(initialDates);
  const [data, setData] = useState<KpiSnapshot | null>(null);
  const [logs, setLogs] = useState<KpiWorkLog[]>([]);
  const [allLogs, setAllLogs] = useState<KpiWorkLog[]>([]);
  const [selectedWorker, setSelectedWorker] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadKpis(nextDates = dates) {
    setLoading(true);
    setError('');
    try {
      const [snapshot, workLogs] = await Promise.all([
        loadKpiSnapshot(nextDates.from, nextDates.to, selectedWorker),
        loadKpiWorkLogs(nextDates.from, nextDates.to),
      ]);
      setData(snapshot);
      setAllLogs(workLogs);
      setLogs(selectedWorker ? workLogs.filter((log) => log.workerEmail === selectedWorker) : workLogs);
    } catch (loadError) {
      setData(null);
      setLogs([]);
      setAllLogs([]);
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los KPI.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadKpis(initialDates());
  }, []);
  useEffect(() => {
    if (data) void loadKpis();
  }, [selectedWorker]);
  useEffect(() => {
    const refresh = () => void loadKpis();
    window.addEventListener('paddytools:kpi-saved', refresh);
    return () => window.removeEventListener('paddytools:kpi-saved', refresh);
  });

  function submit(event: FormEvent) {
    event.preventDefault();
    void loadKpis();
  }
  async function removeLog(id: string) {
    if (!window.confirm('¿Eliminar este registro de trabajo?')) return;
    try {
      await deleteKpiWorkLog(id);
      await loadKpis();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : 'No se pudo eliminar el registro.');
    }
  }

  return (
    <main className="kpi-page">
      <header className="kpi-topbar">
        <a className="kpi-brand" href="/">
          <img src="/paddy-logo-granate.png" alt="Paddy" />
          <span><strong>PaddyTools · KPIs</strong><small>Productividad y mejora continua</small></span>
        </a>
        <Button variant="outline" onClick={() => window.location.assign('/')}><ArrowLeft /> Gestión unificada</Button>
      </header>
      <section className="kpi-hero">
        <div><span>CUADRO DE MANDO</span><h1>Indicadores de productividad</h1><p>Consulta el trabajo realizado, la calidad y la evolución de las incidencias.</p></div>
        <BarChart3 />
      </section>
      <form className="kpi-filters" onSubmit={submit}>
        <label>Desde<Input type="date" value={dates.from} onChange={(event) => setDates({ ...dates, from: event.target.value })} /></label>
        <label>Hasta<Input type="date" value={dates.to} onChange={(event) => setDates({ ...dates, to: event.target.value })} /></label>
        <label>Persona<select value={selectedWorker} onChange={(event) => setSelectedWorker(event.target.value)}><option value="">Todas las personas</option>{[...new Map(allLogs.map((log) => [log.workerEmail, log.workerName])).entries()].map(([email,name]) => <option key={email} value={email}>{name}</option>)}</select></label>
        <Button type="submit" disabled={loading}>{loading ? <RefreshCw className="spin" /> : <BarChart3 />} Actualizar indicadores</Button>
      </form>
      {error && <div className="kpi-error">{error}</div>}
      {loading && !data ? <div className="kpi-loading"><RefreshCw className="spin" /> Calculando indicadores…</div> : data && <><KpiDashboard data={data} /><ProductivityDashboard data={data} logs={logs} onDelete={(id) => void removeLog(id)} /><WorkLogForm onSaved={() => void loadKpis()} /></>}
    </main>
  );
}
