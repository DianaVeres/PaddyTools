'use client';

import { FormEvent, useState } from 'react';
import { Clock3, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { MANUAL_KPI_ACTIVITIES } from '@/lib/kpi-work-log';
import { saveKpiWorkLog } from '@/lib/kpi-client';

const today = () => new Date().toLocaleDateString('en-CA');

export function WorkLogForm({ onSaved }: { onSaved: () => void }) {
  const [draft, setDraft] = useState({
    workDate: today(),
    activity: 'preparacion',
    startedAt: '',
    endedAt: '',
    orders: 0,
    products: 0,
    packingLists: 0,
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await saveKpiWorkLog(draft);
      setDraft((current) => ({
        ...current,
        startedAt: '',
        endedAt: '',
        orders: 0,
        products: 0,
        packingLists: 0,
        notes: '',
      }));
      setMessage('Trabajo registrado correctamente.');
      onSaved();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : 'No se pudo guardar.',
      );
    } finally {
      setSaving(false);
    }
  }
  return (
    <section className="kpi-work-form">
      <div className="kpi-section-heading">
        <span>Registro de tiempos</span>
        <h2>¿Quién ha hecho qué?</h2>
        <p>
          La persona se identifica automáticamente con su usuario de PaddyTools.
        </p>
      </div>
      <form onSubmit={submit}>
        <label>
          Fecha
          <Input
            type="date"
            value={draft.workDate}
            onChange={(e) => setDraft({ ...draft, workDate: e.target.value })}
          />
        </label>
        <label>
          Tarea
          <select
            value={draft.activity}
            onChange={(e) => setDraft({ ...draft, activity: e.target.value })}
          >
            {MANUAL_KPI_ACTIVITIES.map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Inicio
          <Input
            type="time"
            value={draft.startedAt}
            onChange={(e) => setDraft({ ...draft, startedAt: e.target.value })}
          />
        </label>
        <label>
          Fin
          <Input
            type="time"
            value={draft.endedAt}
            onChange={(e) => setDraft({ ...draft, endedAt: e.target.value })}
          />
        </label>
        <label>
          N.º pedidos
          <Input
            type="number"
            min={0}
            value={draft.orders}
            onChange={(e) =>
              setDraft({ ...draft, orders: Number(e.target.value) })
            }
          />
        </label>
        <label>
          N.º productos
          <Input
            type="number"
            min={0}
            value={draft.products}
            onChange={(e) =>
              setDraft({ ...draft, products: Number(e.target.value) })
            }
          />
        </label>
        <label>
          N.º PackingLists
          <Input
            type="number"
            min={0}
            value={draft.packingLists}
            onChange={(e) =>
              setDraft({ ...draft, packingLists: Number(e.target.value) })
            }
          />
        </label>
        <label className="wide">
          Observaciones
          <Textarea
            rows={2}
            value={draft.notes}
            onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            placeholder="Detalles opcionales…"
          />
        </label>
        <Button type="submit" disabled={saving}>
          {saving ? <Clock3 className="spin" /> : <Save />}
          {saving ? 'Guardando…' : 'Guardar tiempo'}
        </Button>
      </form>
      {message && <p className="kpi-form-message">{message}</p>}
    </section>
  );
}
