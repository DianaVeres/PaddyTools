'use client';

import { Archive, Check, RefreshCw, Search, Truck } from 'lucide-react';
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
import type { DashboardShipment as Shipment } from '@/lib/dashboard-types';

type ShippingHistoryDialogProps = {
  open: boolean;
  loading: boolean;
  reference: string;
  shipments: Shipment[] | null;
  onOpenChange: (open: boolean) => void;
  onReferenceChange: (reference: string) => void;
  onSearch: () => void;
};

export function ShippingHistoryDialog({
  open,
  loading,
  reference,
  shipments,
  onOpenChange,
  onReferenceChange,
  onSearch,
}: ShippingHistoryDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => !loading && onOpenChange(nextOpen)}
    >
      <DialogContent className="shipping-dialog">
        <DialogHeader>
          <div className="modal-icon blue">
            <Truck />
          </div>
          <DialogTitle>¿Cuándo se hizo el envío?</DialogTitle>
          <DialogDescription>
            Elige la referencia exacta que quieres localizar en Paddy Packing
            List.
          </DialogDescription>
        </DialogHeader>
        <div className="shipping-reference-picker">
          <label>
            <span>Referencia a buscar</span>
            <Input
              value={reference}
              disabled={loading}
              placeholder="Ej. PA12345, R12345 o IPA12345"
              onChange={(event) => onReferenceChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && reference.trim()) onSearch();
              }}
            />
          </label>
          <Button
            disabled={loading || !reference.trim()}
            onClick={onSearch}
          >
            <Search /> Buscar esta referencia
          </Button>
        </div>
        {loading ? (
          <div className="shipping-loading">
            <RefreshCw className="spin" />
            Buscando en Paddy Packing List…
          </div>
        ) : shipments === null ? (
          <div className="shipping-empty shipping-prompt">
            <Archive />
            <b>Introduce una referencia</b>
            <span>Buscaremos exactamente el PA, R, IPA o RPA indicado.</span>
          </div>
        ) : shipments.length ? (
          <div className="shipment-list">
            {shipments.map((item, index) => (
              <article
                className="shipment-result"
                key={`${item.file}-${index}`}
              >
                <span className="shipment-ok">
                  <Check />
                </span>
                <div>
                  <small>Fecha de envío</small>
                  <strong>
                    {item.date
                      ? new Intl.DateTimeFormat('es-ES', {
                          dateStyle: 'long',
                        }).format(new Date(`${item.date}T12:00:00`))
                      : 'No indicada'}
                  </strong>
                  <dl>
                    <div>
                      <dt>Colegio</dt>
                      <dd>{item.school}</dd>
                    </div>
                    <div>
                      <dt>Caja</dt>
                      <dd>{item.box || 'No indicada'}</dd>
                    </div>
                    <div>
                      <dt>Pedido registrado</dt>
                      <dd>{item.order}</dd>
                    </div>
                    <div>
                      <dt>Archivo</dt>
                      <dd>{item.file}</dd>
                    </div>
                  </dl>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="shipping-empty">
            <Archive />
            <b>No aparece en los PackingList</b>
            <span>
              No se ha encontrado la referencia {reference} en los PackingList
              guardados.
            </span>
          </div>
        )}
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
