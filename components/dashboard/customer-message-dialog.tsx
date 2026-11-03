'use client';

import { Mail, Phone } from 'lucide-react';
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
}: CustomerMessageDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="email-dialog">
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
        {draft && (
          <div className="email-form">
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
                    value={draft.trackingNumber}
                    onChange={(event) =>
                      onGeneratedChange({ trackingNumber: event.target.value })
                    }
                    placeholder="Introduce el nº de envío"
                  />
                </Field>
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
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
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
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
