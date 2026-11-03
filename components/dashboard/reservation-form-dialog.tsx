'use client';

import type { CSSProperties, PointerEventHandler } from 'react';
import { CalendarDays, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ReservationCustomerSection } from '@/components/dashboard/reservation-customer-section';
import { ReservationDetailsSection } from '@/components/dashboard/reservation-details-section';
import type {
  ReservationDraft,
  ReservationOptions,
} from '@/lib/dashboard-types';

type ReservationFormDialogProps = {
  open: boolean;
  editing: boolean;
  loading: boolean;
  saving: boolean;
  offset: { x: number; y: number };
  draft: ReservationDraft;
  options: ReservationOptions | null;
  articles: ReservationOptions['articles'];
  newCustomer: boolean;
  onClose: () => void;
  onDraftChange: (draft: ReservationDraft) => void;
  onNewCustomerChange: (active: boolean) => void;
  onSave: () => void;
  onDragStart: PointerEventHandler<HTMLDivElement>;
  onDragMove: PointerEventHandler<HTMLDivElement>;
  onDragStop: PointerEventHandler<HTMLDivElement>;
};

export function ReservationFormDialog({
  open,
  editing,
  loading,
  saving,
  offset,
  draft,
  options,
  articles,
  newCustomer,
  onClose,
  onDraftChange,
  onNewCustomerChange,
  onSave,
  onDragStart,
  onDragMove,
  onDragStop,
}: ReservationFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent
        className="form-dialog reservation-dialog"
        style={
          {
            '--reservation-drag-x': `${offset.x}px`,
            '--reservation-drag-y': `${offset.y}px`,
          } as CSSProperties
        }
      >
        <DialogHeader
          className="reservation-drag-handle"
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragStop}
          onPointerCancel={onDragStop}
        >
          <div className="modal-icon green">
            <CalendarDays />
          </div>
          <DialogTitle>
            {editing ? 'Completar reserva' : 'Generar reserva'}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? 'Rellena o corrige los campos y guarda los cambios directamente en Monday.'
              : 'Puedes crear una reserva libre o asociarla a un pedido existente.'}
            .
          </DialogDescription>
          <small className="drag-help">
            Arrastra desde aquí para mover la ventana
          </small>
        </DialogHeader>
        {loading ? (
          <div className="reservation-loading">
            <RefreshCw className="spin" />
            Cargando campos de Monday…
          </div>
        ) : (
          <div className="form-grid two reservation-grid">
            <ReservationCustomerSection
              draft={draft}
              options={options}
              newCustomer={newCustomer}
              editing={editing}
              onChange={onDraftChange}
              onNewCustomerChange={onNewCustomerChange}
            />
            <ReservationDetailsSection
              draft={draft}
              options={options}
              articles={articles}
              onChange={onDraftChange}
            />
          </div>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            className="save-reservation"
            disabled={loading || saving}
            onClick={onSave}
          >
            {saving
              ? 'Guardando…'
              : editing
                ? 'Guardar cambios'
                : 'Crear en Monday'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
