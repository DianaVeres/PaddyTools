'use client';

import { AlertTriangle, Printer, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { IncidentDetailsSection } from '@/components/dashboard/incident-details-section';
import { IncidentPickupSection } from '@/components/dashboard/incident-pickup-section';
import { IncidentImagesField } from '@/components/dashboard/incident-images-field';
import type { IncidentDraft, SchoolProduct } from '@/lib/dashboard-types';

type IncidentFormDialogProps = {
  open: boolean;
  incidentId: string;
  reference: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  draft: IncidentDraft;
  schools: string[];
  products: SchoolProduct[];
  productsLoading: boolean;
  productsError: string;
  onClose: () => void;
  onDraftChange: (draft: IncidentDraft) => void;
  onPickupSchoolChange: (school: string) => void;
  onPrint: (mode: 'label' | 'document') => void;
  onSave: (solved?: boolean) => void;
};

export function IncidentFormDialog({
  open,
  incidentId,
  reference,
  customerName,
  customerEmail,
  customerPhone,
  draft,
  schools,
  products,
  productsLoading,
  productsError,
  onClose,
  onDraftChange,
  onPickupSchoolChange,
  onPrint,
  onSave,
}: IncidentFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="form-dialog incident-dialog">
        <DialogHeader>
          <div className="modal-icon orange">
            <AlertTriangle />
          </div>
          <DialogTitle>Incidencia del pedido #{reference}</DialogTitle>
          <DialogDescription>
            Los datos se guardarán en el registro compartido de incidencias.
          </DialogDescription>
        </DialogHeader>
        <div className="incident-form">
          <IncidentDetailsSection
            draft={draft}
            customerName={customerName}
            customerEmail={customerEmail}
            customerPhone={customerPhone}
            schools={schools}
            onChange={onDraftChange}
          />
          <IncidentImagesField
            incidentId={incidentId}
            draft={draft}
            onChange={onDraftChange}
          />
          <IncidentPickupSection
            draft={draft}
            schools={schools}
            products={products}
            loading={productsLoading}
            error={productsError}
            onChange={onDraftChange}
            onSchoolChange={onPickupSchoolChange}
          />
          <div className="form-tools">
            <Button variant="outline" onClick={() => onPrint('label')}>
              <Tag /> Emitir etiqueta
            </Button>
            <Button variant="outline" onClick={() => onPrint('document')}>
              <Printer /> Imprimir
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            variant="outline"
            disabled={draft.pickup || draft.shippingRequired}
            onClick={() => onSave(true)}
          >
            Guardar como solucionada
          </Button>
          <Button className="save-incident" onClick={() => onSave()}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
