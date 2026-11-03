'use client';

import { Input } from '@/components/ui/input';
import { DashboardField as Field } from '@/components/dashboard/common';
import type {
  ReservationDraft,
  ReservationOptions,
} from '@/lib/dashboard-types';

type ReservationDetailsSectionProps = {
  draft: ReservationDraft;
  options: ReservationOptions | null;
  articles: ReservationOptions['articles'];
  onChange: (draft: ReservationDraft) => void;
};

export function ReservationDetailsSection({
  draft,
  options,
  articles,
  onChange,
}: ReservationDetailsSectionProps) {
  const update = (changes: Partial<ReservationDraft>) =>
    onChange({ ...draft, ...changes });

  return (
    <>
      <Field label="Fecha reserva">
        <Input
          type="date"
          value={draft.date}
          onChange={(event) => update({ date: event.target.value })}
        />
      </Field>
      <Field label="Código / artículo">
        <select
          value={draft.articleId}
          disabled={!draft.school}
          onChange={(event) => update({ articleId: event.target.value })}
        >
          <option value="">
            {draft.school
              ? 'Selecciona un artículo'
              : 'Selecciona primero un colegio'}
          </option>
          {articles.map((item) => (
            <option key={item.id} value={item.id}>
              {item.code}
              {item.description ? ` · ${item.description}` : ''}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Talla">
        <Input
          value={draft.size}
          onChange={(event) => update({ size: event.target.value })}
        />
      </Field>
      <Field label="Unidades">
        <Input
          type="number"
          min={1}
          value={draft.units}
          onChange={(event) => update({ units: Number(event.target.value) })}
        />
      </Field>
      <Field label="U. enviadas">
        <Input
          type="number"
          min={0}
          value={draft.sentUnits}
          onChange={(event) =>
            update({ sentUnits: Number(event.target.value) })
          }
        />
      </Field>
      <Field label="U. pendientes">
        <Input
          type="number"
          min={0}
          value={draft.pending}
          onChange={(event) => update({ pending: Number(event.target.value) })}
        />
      </Field>
      <Field label="Pagada">
        <select
          value={draft.paid}
          onChange={(event) => update({ paid: event.target.value })}
        >
          {options?.paid.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </Field>
      <Field label="Observaciones">
        <select
          value={draft.observations}
          onChange={(event) => update({ observations: event.target.value })}
        >
          <option value="">Sin indicar</option>
          {options?.observations.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </Field>
      <Field label="Estado">
        <select
          value={draft.status}
          onChange={(event) => update({ status: event.target.value })}
        >
          <option value="">Sin estado</option>
          {options?.status.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </Field>
      <Field label="Fecha fin">
        <Input
          type="date"
          value={draft.endDate}
          onChange={(event) => update({ endDate: event.target.value })}
        />
      </Field>
      <Field label="Entrega estimada producción">
        <Input
          type="date"
          value={draft.estimatedProduction}
          onChange={(event) =>
            update({ estimatedProduction: event.target.value })
          }
        />
      </Field>
      <Field label="Fórmula (calculada por Monday)">
        <Input value={draft.formula} disabled />
      </Field>
    </>
  );
}
