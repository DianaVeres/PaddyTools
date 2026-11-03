import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  PackageCheck,
  Percent,
  RefreshCcw,
  Shirt,
  Truck,
} from 'lucide-react';
import type { KpiSnapshot } from '@/lib/kpi-metrics';
import { KpiCard } from '@/components/kpis/kpi-card';

export function KpiDashboard({ data }: { data: KpiSnapshot }) {
  return (
    <>
      <section className="kpi-section">
        <div className="kpi-section-heading">
          <span>Productividad</span>
          <h2>Trabajo realizado</h2>
        </div>
        <div className="kpi-grid">
          <KpiCard label="PackingLists" value={data.packingLists} detail="Envíos preparados" icon={<PackageCheck />} />
          <KpiCard label="Pedidos enviados" value={data.shippedOrders} detail="Pedidos incluidos en PackingList" icon={<Truck />} tone="green" />
          <KpiCard label="Colegios atendidos" value={data.activeSchools} detail="Colegios distintos con envío" icon={<Building2 />} tone="burgundy" />
          <KpiCard label="Recogidas" value={data.pickups} detail={`${data.receivedPickups} recibidas`} icon={<Shirt />} tone="orange" />
        </div>
      </section>
      <section className="kpi-section">
        <div className="kpi-section-heading">
          <span>Calidad y mejora</span>
          <h2>Incidencias y resolución</h2>
        </div>
        <div className="kpi-grid">
          <KpiCard label="Incidencias" value={data.incidents} detail={`${data.pendingIncidents} pendientes`} icon={<AlertTriangle />} tone="orange" />
          <KpiCard label="Resueltas" value={data.solvedIncidents} detail={`${data.resolutionRate}% de resolución`} icon={<CheckCircle2 />} tone="green" />
          <KpiCard label="Recogidas recibidas" value={`${data.pickupRate}%`} detail={`${data.receivedPickups} de ${data.pickups}`} icon={<Percent />} />
          <KpiCard label="Reincidencias" value={data.recurrences} detail="Casos que se han repetido" icon={<RefreshCcw />} tone="burgundy" />
        </div>
      </section>
    </>
  );
}
