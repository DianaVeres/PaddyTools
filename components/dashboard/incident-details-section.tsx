'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DashboardField as Field } from '@/components/dashboard/common';
import type { IncidentDraft } from '@/lib/dashboard-types';

type IncidentDetailsSectionProps = {
  draft: IncidentDraft;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  schools: string[];
  onChange: (draft: IncidentDraft) => void;
};

export function IncidentDetailsSection({
  draft,
  customerName,
  customerEmail,
  customerPhone,
  schools,
  onChange,
}: IncidentDetailsSectionProps) {
  return (
    <>
      <div className="incident-customer">
        <b>{customerName || 'Cliente sin nombre'}</b>
        <span>
          {customerEmail}
          {customerPhone ? ` · ${customerPhone}` : ''}
        </span>
      </div>
      <div className="form-grid two">
        <Field label="Email del cliente">
          <Input
            type="email"
            value={draft.customerEmail}
            onChange={(event) =>
              onChange({ ...draft, customerEmail: event.target.value })
            }
            placeholder="cliente@email.com"
          />
        </Field>
        <Field label="Fecha de recepción de la incidencia">
          <Input
            type="date"
            value={draft.date}
            onChange={(event) =>
              onChange({ ...draft, date: event.target.value })
            }
          />
        </Field>
        <Field label="Colegio de la incidencia">
          <Input
            list="incident-schools"
            value={draft.school}
            onChange={(event) =>
              onChange({ ...draft, school: event.target.value })
            }
            placeholder="Selecciona o escribe el colegio"
          />
          <datalist id="incident-schools">
            {schools.map((school) => (
              <option key={school} value={school} />
            ))}
          </datalist>
        </Field>
        <Field label="Descripción de la incidencia">
          <Textarea
            rows={6}
            value={draft.text}
            onChange={(event) =>
              onChange({ ...draft, text: event.target.value })
            }
            placeholder="Describe aquí qué ha ocurrido…"
          />
        </Field>
        <Field label="Observaciones">
          <Textarea
            rows={3}
            value={draft.observations}
            onChange={(event) =>
              onChange({ ...draft, observations: event.target.value })
            }
            placeholder="Añade cualquier observación adicional…"
          />
        </Field>
      </div>
      <div className="incident-checks">
        {[
          ['recurrence', 'Es una reincidencia'],
          ['pickup', 'Recoger en el cole'],
          ['solved', 'Incidencia solucionada'],
          ['sent', 'Enviado'],
        ].map(([field, label]) => (
          <label key={field}>
            <input
              type="checkbox"
              checked={draft[field as keyof Pick<
                IncidentDraft,
                'recurrence' | 'pickup' | 'solved' | 'sent'
              >]}
              onChange={(event) =>
                onChange({ ...draft, [field]: event.target.checked })
              }
            />{' '}
            {label}
          </label>
        ))}
      </div>
    </>
  );
}
