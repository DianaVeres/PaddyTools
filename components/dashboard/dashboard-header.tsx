import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  LogOut,
  Mail,
  Store,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
  onOpenWooCommerce,
  onOpenHotline,
  onOpenReservations,
  onCreateReservation,
  onLogout,
}: {
  sessionUser: SessionUser | null;
  onOpenKpis: () => void;
  onOpenWooCommerce: () => void;
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
          className="action-button woocommerce"
          variant="outline"
          onClick={onOpenWooCommerce}
        >
          <Store /> WooCommerce
        </Button>
        <Button
          className="action-button hotline"
          variant="outline"
          onClick={onOpenHotline}
        >
          <Mail /> Hotline
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button className="action-button reservation" variant="outline" />
            }
          >
            <CalendarDays /> Reservas <ChevronDown />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="reservation-menu">
            <DropdownMenuItem onClick={onOpenReservations}>
              <CalendarDays /> Ver reservas
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCreateReservation}>
              <CalendarDays /> Generar reserva
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
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
