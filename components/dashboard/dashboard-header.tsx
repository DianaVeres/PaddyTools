import {
  BarChart3,
  CalendarDays,
  ChevronDown,
  ClipboardList,
  LogOut,
  Mail,
  PackageCheck,
  ScanBarcode,
  Undo2,
  ShieldCheck,
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
import { isPermissionsAdmin } from '@/lib/module-permissions';

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
        {sessionUser?.permissions.includes('kpis') && <Button
          className="action-button kpis"
          variant="outline"
          onClick={onOpenKpis}
        >
          <BarChart3 /> KPIs
        </Button>}
        {sessionUser?.permissions.includes('pedidos') && <Button
          className="action-button order-preparation"
          variant="outline"
          onClick={onOpenOrderPreparation}
        >
          <PackageCheck /> Preparar pedidos
        </Button>}
        {sessionUser?.permissions.includes('pedidos') && sessionUser.permissions.includes('detalle') && (
          <Button className="action-button" variant="outline" render={<a href="/gestionar-devoluciones" />} nativeButton={false}>
            <Undo2 /> Gestionar devoluciones
          </Button>
        )}
        {sessionUser?.permissions.includes('woocommerce') && <Button
          className="action-button woocommerce"
          variant="outline"
          onClick={onOpenWooCommerce}
        >
          <Store /> WooCommerce
        </Button>}
        {sessionUser?.permissions.includes('hotline') && <Button
          className="action-button hotline"
          variant="outline"
          onClick={onOpenHotline}
        >
          <Mail /> Hotline
        </Button>}
        {sessionUser?.permissions.includes('inventarios') && <Button
          className="action-button inventories"
          variant="outline"
          onClick={onOpenInventories}
        >
          <ScanBarcode /> Inventarios
        </Button>}
        {sessionUser?.permissions.includes('fichas') && <Button
          className="action-button technical-sheets"
          variant="outline"
          onClick={onOpenTechnicalSheets}
        >
          <ClipboardList /> Fichas técnicas
        </Button>}
        {sessionUser?.permissions.includes('reservas') && <DropdownMenu>
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
            <DropdownMenuItem onClick={() => window.location.assign('/preparar-reservas')}>
              <ScanBarcode /> Preparar reservas
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onCreateReservation}>
              <CalendarDays /> Generar reserva
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>}
        {isPermissionsAdmin(sessionUser?.email) && (
          <Button variant="outline" className="action-button" onClick={() => window.location.assign('/tic')}>
            <ShieldCheck /> Permisos
          </Button>
        )}
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
