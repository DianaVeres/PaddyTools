'use client';
import {
  Archive,
  Check,
  ClipboardList,
  Printer,
  RefreshCw,
  Shirt,
  Trash2,
} from 'lucide-react';
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
import {
  formatIncidentDateTime,
  incidentStatusLabel,
  type IncidentRecord as Incident,
} from '@/lib/incident-record';
import { latestIncidentAudit } from '@/lib/incident-audit';

type RegistryMode = 'registro' | 'recogidas';
type Props = {
  mode: RegistryMode | null;
  loading: boolean;
  filter: string;
  rows: Incident[];
  showReceived: boolean;
  canDelete: boolean;
  deletingReference: string;
  onClose: () => void;
  onFilterChange: (value: string) => void;
  onShowReceivedChange: (value: boolean) => void;
  onView: (row: Incident) => void;
  onPrint: (row: Incident) => void;
  onSolve: (row: Incident) => void;
  onDelete: (row: Incident) => void;
  onPickupReceivedChange: (row: Incident, received: boolean) => void;
};

export function IncidentRegistryDialog(props: Props) {
  const {
    mode,
    loading,
    filter,
    rows,
    showReceived,
    canDelete,
    deletingReference,
    onClose,
    onFilterChange,
    onShowReceivedChange,
    onView,
    onPrint,
    onSolve,
    onDelete,
    onPickupReceivedChange,
  } = props;
  const pickups = mode === 'recogidas';
  return (
    <Dialog open={mode !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="registry-dialog">
        <DialogHeader>
          <div className={`modal-icon ${pickups ? 'green' : 'orange'}`}>
            {pickups ? <Shirt /> : <ClipboardList />}
          </div>
          <DialogTitle>
            {pickups
              ? 'Prendas para recoger en colegios'
              : 'Registro de incidencias'}
          </DialogTitle>
          <DialogDescription>
            {pickups
              ? 'Marca las prendas cuando hayan llegado.'
              : 'Consulta y reimprime cualquier incidencia generada.'}
          </DialogDescription>
        </DialogHeader>
        <div className="registry-tools">
          <Input
            value={filter}
            onChange={(event) => onFilterChange(event.target.value)}
            placeholder="Buscar pedido, cliente, colegio o artículo…"
          />
          {pickups && (
            <label className="show-received">
              <input
                type="checkbox"
                checked={showReceived}
                onChange={(event) => onShowReceivedChange(event.target.checked)}
              />{' '}
              Mostrar también las recibidas
            </label>
          )}
        </div>
        <div className="registry-list">
          {loading ? (
            <div className="registry-empty">
              <RefreshCw className="spin" /> Cargando el registro…
            </div>
          ) : rows.length ? (
            rows.map((row) => (
              <article
                className="registry-row"
                key={`${mode}-${row.orderNumber}`}
              >
                <div className="registry-reference">
                  <b>#{row.orderNumber}</b>
                  <small>{row.incidentDate || 'Sin fecha'}</small>
                </div>
                <div className="registry-summary">
                  <b>{row.customerName || 'Cliente sin nombre'}</b>
                  <span>
                    {pickups
                      ? row.pickupDetails || 'Sin detalle de prendas'
                      : row.incidentText || 'Sin descripción'}
                  </span>
                  {!pickups && (
                    <>
                      <small>Email: {row.customerEmail || 'No indicado'}</small>
                      <small>
                        Observaciones: {row.observations || 'Sin observaciones'}
                      </small>
                    </>
                  )}
                  <small>
                    {row.school ||
                      row.pickupSchoolName ||
                      'Colegio sin indicar'}
                  </small>
                  {pickups && row.pickupReceived && (
                    <small>
                      Recibida el {formatIncidentDateTime(row.pickupReceivedAt)}
                      {latestIncidentAudit(
                        row.auditLog,
                        'Recogida marcada como recibida',
                      )?.userName
                        ? ` · por ${latestIncidentAudit(
                            row.auditLog,
                            'Recogida marcada como recibida',
                          )?.userName}`
                        : ''}
                    </small>
                  )}
                </div>
                <span
                  className={`status ${pickups ? (row.pickupReceived ? 'status-green' : 'status-amber') : row.solved ? 'status-green' : 'status-amber'}`}
                >
                  {pickups
                    ? row.pickupReceived
                      ? 'Recibida'
                      : 'Pendiente'
                    : incidentStatusLabel(row)}
                </span>
                <div className="registry-actions">
                  {!pickups ? (
                    <>
                      <Button variant="outline" onClick={() => onView(row)}>
                        Ver
                      </Button>
                      <Button variant="outline" onClick={() => onPrint(row)}>
                        <Printer /> Reimprimir
                      </Button>
                      {!row.solved &&
                        !row.pickupSchool &&
                        !row.shippingRequired && (
                          <Button onClick={() => onSolve(row)}>
                            <Check /> Cerrar incidencia
                          </Button>
                        )}
                      {canDelete && (
                        <Button
                          variant="outline"
                          className="incident-delete"
                          disabled={deletingReference === row.orderNumber}
                          onClick={() => onDelete(row)}
                        >
                          <Trash2 />
                          {deletingReference === row.orderNumber
                            ? 'Eliminando…'
                            : 'Eliminar'}
                        </Button>
                      )}
                    </>
                  ) : (
                    <Button
                      variant={row.pickupReceived ? 'outline' : 'default'}
                      onClick={() =>
                        onPickupReceivedChange(row, !row.pickupReceived)
                      }
                    >
                      {row.pickupReceived
                        ? 'Volver a pendiente'
                        : 'Marcar recibida'}
                    </Button>
                  )}
                </div>
              </article>
            ))
          ) : (
            <div className="registry-empty">
              <Archive />
              <b>No hay registros para mostrar</b>
              <span>Prueba a cambiar la búsqueda o los filtros.</span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
