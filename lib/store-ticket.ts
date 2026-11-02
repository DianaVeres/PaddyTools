import { normalizeReferenceInput } from './global-search.ts';

export type StoreTicketItem = {
  name?: string;
  article?: string;
  size?: string;
  color?: string;
  units?: number;
  price?: string;
  total?: string;
};

export type StoreTicketRecord = {
  number: string;
  date: string;
  customer: string;
  store: string;
  operator: string;
  total: string;
  payment: string;
  items: StoreTicketItem[];
  syncedAt: number;
};

export function normalizeTicketNumber(value: unknown) {
  return normalizeReferenceInput(String(value ?? ''));
}

export function parseTicketItems(value: unknown): StoreTicketItem[] {
  try {
    const parsed = JSON.parse(String(value || '[]'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
