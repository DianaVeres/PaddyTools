import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  LogOut,
  Mail,
  PackageCheck,
  ScanBarcode,
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
  onOpenOrderPreparation,
  onOpenWooCommerce,
  onOpenHotline,
  onOpenInventories,
  onOpenTechnicalSheets,
  onOpenReservations,
  onCreateReservation,
  onLogout,
}: {
  sessionUser: SessionUser | null;
  onOpenKpis: () => void;
  onOpenOrderPreparation: () => void;
  onOpenWooCommerce: () => void;
  onOpenHotline: () => void;
  onOpenInventories: () => void;
  onOpenTechnicalSheets: () => void;
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
          className="action-button order-preparation"
          variant="outline"
          onClick={onOpenOrderPreparation}
        >
          <PackageCheck /> Preparar pedidos
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
        <Button
          className="action-button inventories"
          variant="outline"
          onClick={onOpenInventories}
        >
          <ScanBarcode /> Inventarios
        </Button>
        <Button
          className="action-button technical-sheets"
          variant="outline"
          onClick={onOpenTechnicalSheets}
        >
          <ClipboardList /> Fichas técnicas
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
