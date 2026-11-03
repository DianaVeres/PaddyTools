'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, BarChart3, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { KpiDashboard } from '@/components/kpis/kpi-dashboard';
import { readJsonResponse } from '@/lib/http-response';
import type { KpiSnapshot } from '@/lib/kpi-metrics';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadKpis(nextDates = dates) {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams(nextDates);
      const response = await fetch(`/api/kpis?${params}`, { cache: 'no-store' });
      const result = await readJsonResponse<KpiSnapshot & { error?: string }>(response);
      if (!response.ok) throw new Error(result.error || 'No se pudieron cargar los KPI.');
      setData(result);
    } catch (loadError) {
      setData(null);
      setError(loadError instanceof Error ? loadError.message : 'No se pudieron cargar los KPI.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadKpis(initialDates());
  }, []);

  function submit(event: FormEvent) {
    event.preventDefault();
    void loadKpis();
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
        <Button type="submit" disabled={loading}>{loading ? <RefreshCw className="spin" /> : <BarChart3 />} Actualizar indicadores</Button>
      </form>
      {error && <div className="kpi-error">{error}</div>}
      {loading && !data ? <div className="kpi-loading"><RefreshCw className="spin" /> Calculando indicadores…</div> : data && <KpiDashboard data={data} />}
    </main>
  );
}
