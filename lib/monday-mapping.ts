import { searchKey } from './global-search.ts';
import {
  MONDAY_RESERVATION_COLUMNS,
  type MondayBoard,
} from './monday-config.ts';
import type { MondayColumnValue, MondayItem } from './monday-client.ts';

export function mondayReservationBaseReference(value: string) {
  return value
    .trim()
    .replace(/(?:\s*\(copy\))+\s*$/gi, '')
    .trim()
    .toUpperCase();
}

export function mondayColumnPhone(value?: MondayColumnValue) {
  const visible = String(value?.text || value?.display_value || '').trim();
  if (visible) return visible;
  if (!value?.value) return '';
  try {
    const raw = JSON.parse(value.value) as { phone?: unknown; number?: unknown };
    return String(raw.phone ?? raw.number ?? '').trim();
  } catch {
    return '';
  }
}

export function mondayColumnEmail(value?: MondayColumnValue) {
  const visible = String(value?.text || value?.display_value || '').trim();
  if (visible) return visible;
  if (!value?.value) return '';
  try {
    const raw = JSON.parse(value.value) as { email?: unknown; text?: unknown };
    return String(raw.email ?? raw.text ?? '').trim();
  } catch {
    return '';
  }
}

export function normalizeMondayItem(item: MondayItem, board: MondayBoard) {
  const values: Record<string, string> = {};
  for (const value of item.column_values || []) {
    values[searchKey(value.column?.title || value.id)] = String(
      value.text || value.display_value || '',
    ).trim();
  }
  const first = (...labels: string[]) =>
    labels.map((label) => values[searchKey(label)]).find(Boolean) || '';
  const articleRelation = (item.column_values || []).find(
    (value) =>
      value.id === MONDAY_RESERVATION_COLUMNS.article ||
      searchKey(value.column?.title || '') === 'ARTICULO',
  );
  const customerRelation = (item.column_values || []).find(
    (value) => value.id === MONDAY_RESERVATION_COLUMNS.customer,
  );
  return {
    id: item.id,
    kind: board.kind,
    board: board.name,
    reference: item.name,
    customer: first('CLIENTE'),
    phone: first('TELEFONO'),
    school: first('COLEGIO'),
    date: first('FECHA RESERVA', 'FECHA'),
    article: first('DESCRIPCION ARTICULO', 'ARTICULO'),
    articleIds: (articleRelation?.linked_item_ids || []).map(String),
    customerIds: (customerRelation?.linked_item_ids || []).map(String),
    code: first('CODIGO ART.'),
    size: first('TALLA'),
    units: first('UDS.'),
    sentUnits: first('U.ENVIADAS', 'U ENVIADAS'),
    pending: first('U. PENDIENTES'),
    paid: first('PAGADA'),
    status: first('ESTADO'),
    observations: first('OBSERVACIONES'),
    endDate: first('FECHA FIN'),
    productionDate: first('FECHA PRODUCCION', 'FECHA PRODUCCIÓN'),
    estimatedProduction: first(
      'ENTREGA ESTIMADA PRODUCCION',
      'ENTREGA ESTIMADA PRODUCCIÓN',
    ),
    formula: first('FORMULA', 'FÓRMULA'),
    specialDetails: first('DATOS PRENDA ESPECIAL'),
    updatedAt: item.updated_at || '',
  };
}
