import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { IncidentDocument } from '@/components/dashboard/print-components';
import type { IncidentRecord as Incident } from '@/lib/incident-record';

export function IncidentDocumentDialog({
  open,
  incident,
  onClose,
  onPrint,
}: {
  open: boolean;
  incident: Incident | null;
  onClose: () => void;
  onPrint: (incident: Incident) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="incident-document-dialog">
        <DialogHeader>
          <DialogTitle>Incidencia #{incident?.orderNumber}</DialogTitle>
          <DialogDescription>
            Documento guardado en el registro compartido.
          </DialogDescription>
        </DialogHeader>
        {incident && <IncidentDocument incident={incident} />}
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          <Button onClick={() => incident && onPrint(incident)}>
            <Printer /> Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
