'use client';

import { useState } from 'react';
import { Mail, Phone, ScanBarcode, Truck } from 'lucide-react';
import { BarcodeCameraScanner } from '@/components/order-preparation/barcode-camera-scanner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { DashboardField as Field } from '@/components/dashboard/common';
import type {
  DeliveryEmailDraft as EmailDraft,
  DeliveryEmailKind,
  DeliveryRecordKind,
} from '@/lib/delivery-message';

type CustomerMessageDialogProps = {
  open: boolean;
  draft: EmailDraft | null;
  onClose: () => void;
  onChange: (draft: EmailDraft) => void;
  onGeneratedChange: (changes: Partial<EmailDraft>) => void;
  onCopy: () => void;
  onWhatsApp: () => void;
  onEmail: () => void;
  onMarkSent?: () => void;
  markingSent?: boolean;
};

export function CustomerMessageDialog({
  open,
  draft,
  onClose,
  onChange,
  onGeneratedChange,
  onCopy,
  onWhatsApp,
  onEmail,
  onMarkSent,
  markingSent = false,
}: CustomerMessageDialogProps) {
  const [trackingCameraOpen, setTrackingCameraOpen] = useState(false);
  const scanning = open && trackingCameraOpen && Boolean(onMarkSent);
  function closeDialog() {
    setTrackingCameraOpen(false);
    onClose();
  }
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && closeDialog()}>
      <DialogContent className={onMarkSent ? 'email-dialog email-dialog-with-shipping' : 'email-dialog'}>
        <DialogHeader>
          <div className="modal-icon blue">
            <Mail />
          </div>
          <DialogTitle>Preparar aviso al cliente</DialogTitle>
          <DialogDescription>
            Revisa los datos y elige si quieres abrir el mensaje en el correo o
            en WhatsApp.
          </DialogDescription>
        </DialogHeader>
        {scanning ? (
          <div className="email-form email-tracking-camera">
            <BarcodeCameraScanner
              target="shipment"
              onScan={(code) => {
                onGeneratedChange({ trackingNumber: code.trim() });
                setTrackingCameraOpen(false);
              }}
              onClose={() => setTrackingCameraOpen(false)}
            />
          </div>
        ) : draft && (
          <div className="email-form">
            <Field label="¿Qué estás enviando?">
              <select
                value={draft.recordKind}
                onChange={(event) =>
                  onGeneratedChange({
                    recordKind: event.target.value as DeliveryRecordKind,
                  })
                }
              >
                <option value="pedido">El pedido</option>
                <option value="reserva">La reserva</option>
                <option value="incidencia">La incidencia</option>
              </select>
            </Field>
            <Field label="Tipo de entrega">
              <select
                value={draft.delivery}
                onChange={(event) =>
                  onGeneratedChange({
                    delivery: event.target.value as DeliveryEmailKind,
                  })
                }
              >
                <option value="colegio">Entrega en colegio</option>
                <option value="domicilio">Envío a domicilio</option>
                <option value="tienda">Recogida en tienda</option>
                <option value="reserva-pendiente">
                  Pedido con reserva pendiente
                </option>
              </select>
            </Field>
            <Field label="Email del cliente">
              <Input
                type="email"
                value={draft.to}
                onChange={(event) =>
                  onChange({ ...draft, to: event.target.value })
                }
                placeholder="cliente@email.com"
              />
            </Field>
            <Field label="Teléfono del cliente">
              <Input
                type="tel"
                value={draft.phone}
                onChange={(event) =>
                  onChange({ ...draft, phone: event.target.value })
                }
                placeholder="Ej. 612345678"
              />
            </Field>
            {draft.delivery === 'colegio' && (
              <Field label="Colegio">
                <Input
                  value={draft.school}
                  onChange={(event) =>
                    onGeneratedChange({ school: event.target.value })
                  }
                  placeholder="Nombre del colegio"
                />
              </Field>
            )}
            {draft.delivery === 'domicilio' && (
              <div className="email-home-fields">
                <Field label="Empresa de transporte">
                  <select
                    value={draft.carrier}
                    onChange={(event) =>
                      onGeneratedChange({
                        carrier: event.target.value as EmailDraft['carrier'],
                      })
                    }
                  >
                    <option value="viaxpress">ViaXpress</option>
                    <option value="dhl">DHL</option>
                  </select>
                </Field>
                <Field label="Número de envío">
                  <Input
                    autoFocus
                    value={draft.trackingNumber}
                    onChange={(event) =>
                      onGeneratedChange({ trackingNumber: event.target.value })
                    }
                    placeholder="Introduce el nº de envío"
                  />
                </Field>
                {onMarkSent && (
                  <Button type="button" variant="outline" className="email-scan-tracking"
                    onClick={() => setTrackingCameraOpen(true)}>
                    <ScanBarcode /> Escanear etiqueta
                  </Button>
                )}
              </div>
            )}
            <Field label="Asunto">
              <Input
                value={draft.subject}
                onChange={(event) =>
                  onChange({ ...draft, subject: event.target.value })
                }
              />
            </Field>
            <Field label="Mensaje">
              <Textarea
                value={draft.body}
                onChange={(event) =>
                  onChange({ ...draft, body: event.target.value })
                }
                rows={7}
              />
            </Field>
          </div>
        )}
        {!scanning && <DialogFooter>
          <Button variant="outline" onClick={closeDialog}>
            Cancelar
          </Button>
          <Button variant="outline" onClick={onCopy}>
            Copiar texto
          </Button>
          <Button className="whatsapp-action" onClick={onWhatsApp}>
            <Phone /> Abrir WhatsApp
          </Button>
          <Button onClick={onEmail}>
            <Mail /> Abrir correo
          </Button>
          {onMarkSent && (
            <Button className="email-mark-sent" onClick={onMarkSent} disabled={markingSent}>
              <Truck /> {markingSent ? 'Cambiando…' : 'Marcar enviado'}
            </Button>
          )}
        </DialogFooter>}
      </DialogContent>
    </Dialog>
  );
}
