import {
  AlertTriangle,
  BarChart3,
  CalendarDays,
  LogOut,
  PackageCheck,
  Shirt,
  Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SessionUser } from '@/lib/dashboard-types';

function userInitials(user: SessionUser | null) {
  return (
    user?.displayName
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '··'
  );
}

export function DashboardHeader({
  sessionUser,
  shippingLoading,
  onOpenPackingList,
  onOpenKpis,
  onOpenReservations,
  onOpenPickups,
  onOpenShipping,
  onOpenIncidents,
  onCreateReservation,
  onLogout,
}: {
  sessionUser: SessionUser | null;
  shippingLoading: boolean;
  onOpenPackingList: () => void;
  onOpenKpis: () => void;
  onOpenReservations: () => void;
  onOpenPickups: () => void;
  onOpenShipping: () => void;
  onOpenIncidents: () => void;
  onCreateReservation: () => void;
  onLogout: () => void;
}) {
  return (
    <header className="topbar">
      <a className="brand" href="#">
        <img className="brand-mark" src="/paddy-logo-granate.png" alt="Paddy" />
        <span>
          <strong>PaddyTools</strong>
          <small>Gestión Paddy</small>
        </span>
      </a>
      <div className="top-actions">
        <Button
          className="action-button registry"
          variant="outline"
          onClick={onOpenPackingList}
        >
          <PackageCheck /> PackingList
        </Button>
        <Button
          className="action-button kpis"
          variant="outline"
          onClick={onOpenKpis}
        >
          <BarChart3 /> KPIs
        </Button>
        <Button
          className="action-button reservation"
          variant="outline"
          onClick={onOpenReservations}
        >
          <CalendarDays /> Reservas
        </Button>
        <Button
          className="action-button pickups"
          variant="outline"
          onClick={onOpenPickups}
        >
          <Shirt /> Recogidas
        </Button>
        <Button
          className="action-button shipping"
          disabled={shippingLoading}
          onClick={onOpenShipping}
        >
          <Truck /> ¿Envío?
        </Button>
        <Button className="action-button incident" onClick={onOpenIncidents}>
          <AlertTriangle /> Incidencias
        </Button>
        <Button
          className="action-button reservation"
          onClick={onCreateReservation}
        >
          <CalendarDays /> Generar reserva
        </Button>
        <span className="divider" />
        <button
          className="user-chip"
          onClick={onLogout}
          title="Cerrar sesión"
        >
          <span>{userInitials(sessionUser)}</span>
          <b>{sessionUser?.displayName || 'Usuario'}</b>
          <LogOut size={15} />
        </button>
      </div>
    </header>
  );
}
