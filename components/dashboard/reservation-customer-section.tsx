'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DashboardField as Field } from '@/components/dashboard/common';
import { foldSearchText } from '@/lib/global-search';
import type {
  ReservationDraft,
  ReservationOptions,
} from '@/lib/dashboard-types';

type ReservationCustomerSectionProps = {
  draft: ReservationDraft;
  options: ReservationOptions | null;
  newCustomer: boolean;
  editing: boolean;
  onChange: (draft: ReservationDraft) => void;
  onNewCustomerChange: (active: boolean) => void;
};

export function ReservationCustomerSection({
  draft,
  options,
  newCustomer,
  editing,
  onChange,
  onNewCustomerChange,
}: ReservationCustomerSectionProps) {
  return (
    <>
      <Field label="Nº reserva o pedido">
        <Input
          value={draft.reference}
          onChange={(event) =>
            onChange({ ...draft, reference: event.target.value.toUpperCase() })
          }
          placeholder="Ej. PA12345 o RPA12345"
          disabled={editing}
        />
      </Field>
      <Field label="Cliente">
        <div className="customer-picker">
          <Input
            list="monday-customers"
            value={draft.customerName}
            disabled={newCustomer}
            onChange={(event) => {
              const name = event.target.value;
              const match = options?.customers.find(
                (item) => foldSearchText(item.name) === foldSearchText(name),
              );
              onChange({
                ...draft,
                customerName: name,
                customerId: match?.id || '',
                phone: match?.phone || '',
                customerEmail: match?.email || '',
                school: match?.school || '',
                articleId: match?.school ? '' : draft.articleId,
              });
            }}
            placeholder="Selecciona un cliente de Monday"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              const active = !newCustomer;
              onNewCustomerChange(active);
              onChange({
                ...draft,
                customerId: '',
                customerName: active ? '' : draft.customerName,
                phone: active ? '' : draft.phone,
                customerEmail: active ? '' : draft.customerEmail,
              });
            }}
          >
            {newCustomer ? 'Usar existente' : 'Nuevo'}
          </Button>
        </div>
        <datalist id="monday-customers">
          {options?.customers.map((item) => (
            <option key={item.id} value={item.name} />
          ))}
        </datalist>
      </Field>
      {newCustomer && (
        <Field label="Nombre del nuevo cliente">
          <Input
            value={draft.customerName}
            onChange={(event) =>
              onChange({ ...draft, customerName: event.target.value })
            }
            placeholder="Nombre y apellidos"
          />
        </Field>
      )}
      <Field label="Teléfono">
        <Input
          value={draft.phone}
          onChange={(event) => onChange({ ...draft, phone: event.target.value })}
        />
      </Field>
      <Field label="E-mail">
        <Input
          type="email"
          value={draft.customerEmail}
          onChange={(event) =>
            onChange({ ...draft, customerEmail: event.target.value })
          }
          placeholder="cliente@email.com"
        />
      </Field>
      <Field label="Colegio">
        <select
          value={draft.school}
          onChange={(event) =>
            onChange({ ...draft, school: event.target.value, articleId: '' })
          }
        >
          <option value="">Selecciona un colegio</option>
          {options?.schools.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </Field>
    </>
  );
}
