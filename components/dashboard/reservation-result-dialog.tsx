'use client';

import { Printer, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ReservationPrintCard } from '@/components/dashboard/print-components';
import type { DashboardMondayRecord as MondayRecord } from '@/lib/dashboard-types';

type ReservationResultDialogProps = {
  open: boolean;
  record: MondayRecord | null;
  onClose: () => void;
  onPrintLabel: (record: MondayRecord) => void;
  onPrint: (record: MondayRecord) => void;
};

export function ReservationResultDialog({
  open,
  record,
  onClose,
  onPrintLabel,
  onPrint,
}: ReservationResultDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="reservation-result-dialog">
        <DialogHeader>
          <DialogTitle>Reserva creada</DialogTitle>
          <DialogDescription>
            La reserva se ha guardado correctamente en Monday.
          </DialogDescription>
        </DialogHeader>
        {record && <ReservationPrintCard record={record} />}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <Button
            variant="outline"
            disabled={!record}
            onClick={() => record && onPrintLabel(record)}
          >
            <Tag /> Generar etiqueta
          </Button>
          <Button disabled={!record} onClick={() => record && onPrint(record)}>
            <Printer /> Imprimir reserva
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
