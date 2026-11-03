'use client';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DashboardField as Field } from '@/components/dashboard/common';
import type { IncidentDraft, SchoolProduct } from '@/lib/dashboard-types';

type IncidentPickupSectionProps = {
  draft: IncidentDraft;
  schools: string[];
  products: SchoolProduct[];
  loading: boolean;
  error: string;
  onChange: (draft: IncidentDraft) => void;
  onSchoolChange: (school: string) => void;
};

export function IncidentPickupSection({
  draft,
  schools,
  products,
  loading,
  error,
  onChange,
  onSchoolChange,
}: IncidentPickupSectionProps) {
  if (!draft.pickup) return null;

  return (
    <section className="pickup-box">
      <Field label="Colegio de recogida">
        <select
          value={draft.pickupSchool}
          onChange={(event) => onSchoolChange(event.target.value)}
        >
          <option value="">Selecciona un colegio</option>
          {schools.map((school) => (
            <option key={school} value={school}>
              {school}
            </option>
          ))}
        </select>
      </Field>
      <span className="pickup-label">Productos para recoger</span>
      <div className="pickup-products">
        {loading ? (
          <p>Cargando productos de WooCommerce…</p>
        ) : error ? (
          <p className="pickup-error">{error}</p>
        ) : products.length ? (
          <>
            <div className="pickup-product-header">
              <span />
              <span>Artículo</span>
              <span>Talla</span>
              <span>Unidades</span>
            </div>
            {products.map((item) => {
              const pick = draft.pickupItems[item.id] || {
                selected: false,
                size: '',
                units: 1,
              };
              const updatePick = (
                changes: Partial<(typeof draft.pickupItems)[number]>,
              ) =>
                onChange({
                  ...draft,
                  pickupItems: {
                    ...draft.pickupItems,
                    [item.id]: { ...pick, ...changes },
                  },
                });

              return (
                <div
                  className={`pickup-product ${pick.selected ? '' : 'disabled'}`}
                  key={item.id}
                >
                  <input
                    type="checkbox"
                    checked={pick.selected}
                    onChange={(event) =>
                      updatePick({ selected: event.target.checked })
                    }
                  />
                  <div>
                    <b>{item.name}</b>
                    <small>{item.sku}</small>
                  </div>
                  <Input
                    placeholder="Talla"
                    value={pick.size}
                    disabled={!pick.selected}
                    onChange={(event) => updatePick({ size: event.target.value })}
                  />
                  <Input
                    type="number"
                    min={1}
                    value={pick.units}
                    disabled={!pick.selected}
                    onChange={(event) =>
                      updatePick({ units: Number(event.target.value) })
                    }
                  />
                </div>
              );
            })}
          </>
        ) : (
          <p>
            {draft.pickupSchool
              ? 'No hay productos publicados para este colegio.'
              : 'Selecciona primero un colegio.'}
          </p>
        )}
      </div>
      <Field label="Observaciones">
        <Textarea
          rows={3}
          value={draft.pickupNotes}
          onChange={(event) =>
            onChange({ ...draft, pickupNotes: event.target.value })
          }
          placeholder="Alumno u otros detalles opcionales…"
        />
      </Field>
    </section>
  );
}
