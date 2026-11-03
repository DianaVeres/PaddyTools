'use client';

import { Archive, CalendarDays, Printer, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { DashboardMondayRecord as MondayRecord } from '@/lib/dashboard-types';

type ReservationRegistryDialogProps = {
  open: boolean;
  loading: boolean;
  filter: string;
  rows: MondayRecord[];
  onClose: () => void;
  onFilterChange: (filter: string) => void;
  onCreate: () => void;
  onEdit: (row: MondayRecord) => void;
  onPrintLabel: (row: MondayRecord) => void;
};

const headings = [
  'Nº RESERVA',
  'CLIENTE',
  'TELÉFONO',
  'COLEGIO',
  'FECHA RESERVA',
  'CÓDIGO ART.',
  'DESCRIPCIÓN ARTÍCULO',
  'TALLA',
  'UDS.',
  'U. ENVIADAS',
  'U. PENDIENTES',
  'PAGADA',
  'OBSERVACIONES',
  'ESTADO',
  'FECHA FIN',
  'ENTREGA ESTIMADA PRODUCCIÓN',
  'FÓRMULA',
  'EDITAR',
  'ETIQUETA',
];

export function ReservationRegistryDialog({
  open,
  loading,
  filter,
  rows,
  onClose,
  onFilterChange,
  onCreate,
  onEdit,
  onPrintLabel,
}: ReservationRegistryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="registry-dialog reservation-registry-dialog">
        <DialogHeader>
          <div className="modal-icon green">
            <CalendarDays />
          </div>
          <DialogTitle>Reservas</DialogTitle>
          <DialogDescription>
            Consulta las reservas de Monday y completa desde aquí cualquier
            casilla pendiente.
          </DialogDescription>
        </DialogHeader>
        <div className="registry-tools">
          <Input
            value={filter}
            onChange={(event) => onFilterChange(event.target.value)}
            placeholder="Buscar reserva, cliente, teléfono, colegio o artículo…"
          />
          <Button onClick={onCreate}>
            <CalendarDays /> Generar reserva libre
          </Button>
        </div>
        <div className="registry-list">
          {loading ? (
            <div className="registry-empty">
              <RefreshCw className="spin" /> Cargando reservas…
            </div>
          ) : rows.length ? (
            <div className="reservation-table-wrap">
              <table className="reservation-table">
                <thead>
                  <tr>
                    {headings.map((heading) => (
                      <th key={heading}>{heading}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id}>
                      <td><b>{row.reference || row.id}</b></td>
                      <td>{row.customer || 'Pendiente'}</td>
                      <td>{row.phone || 'Pendiente'}</td>
                      <td>{row.school || 'Pendiente'}</td>
                      <td>{row.date || 'Pendiente'}</td>
                      <td>{row.code || 'Pendiente'}</td>
                      <td>{row.articleDescription || row.article || 'Pendiente'}</td>
                      <td>{row.size || 'Pendiente'}</td>
                      <td>{row.units || 'Pendiente'}</td>
                      <td>{row.sentUnits || 'Pendiente'}</td>
                      <td>{row.pending || 'Pendiente'}</td>
                      <td>{row.paid || 'Pendiente'}</td>
                      <td>{row.observations || 'Pendiente'}</td>
                      <td>{row.status || 'Pendiente'}</td>
                      <td>{row.endDate || 'Pendiente'}</td>
                      <td>{row.estimatedProduction || 'Pendiente'}</td>
                      <td>{row.formula || 'Calculada en Monday'}</td>
                      <td className="reservation-table-edit">
                        <Button onClick={() => onEdit(row)}>Completar / editar</Button>
                      </td>
                      <td className="reservation-table-actions">
                        <Button variant="outline" onClick={() => onPrintLabel(row)}>
                          <Printer /> Imprimir etiqueta
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="registry-empty">
              <Archive />
              <b>No hay reservas para mostrar</b>
              <span>Prueba a cambiar la búsqueda.</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
