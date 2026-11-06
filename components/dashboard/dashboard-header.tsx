import {
  BarChart3,
  CalendarDays,
  LogOut,
  Mail,
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
  onOpenKpis,
  onOpenHotline,
  onOpenReservations,
  onCreateReservation,
  onLogout,
}: {
  sessionUser: SessionUser | null;
  onOpenKpis: () => void;
  onOpenHotline: () => void;
  onOpenReservations: () => void;
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
      <div id="kpi-timer-slot" className="kpi-timer-slot" />
      <div className="top-actions">
        <Button
          className="action-button kpis"
          variant="outline"
          onClick={onOpenKpis}
        >
          <BarChart3 /> KPIs
        </Button>
        <Button
          className="action-button hotline"
          variant="outline"
          onClick={onOpenHotline}
        >
          <Mail /> Hotline
        </Button>
        <Button
          className="action-button reservation"
          variant="outline"
          onClick={onOpenReservations}
        >
          <CalendarDays /> Reservas
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
