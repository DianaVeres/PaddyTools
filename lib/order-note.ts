import { normalizeReferenceInput } from './global-search.ts';

export type OrderNoteKind = 'nota' | 'llamada' | 'email';

export type OrderNoteRecord = {
  id: string;
  orderNumber: string;
  kind: OrderNoteKind;
  content: string;
  authorEmail?: string | null;
  authorName?: string | null;
  createdAt: string;
};

export function normalizeOrderNoteKind(value: unknown): OrderNoteKind {
  return value === 'llamada' || value === 'email' ? value : 'nota';
}

export function normalizeOrderNoteReference(value: unknown) {
  return normalizeReferenceInput(String(value ?? ''));
}

export function normalizeOrderNoteContent(value: unknown) {
  return String(value ?? '').trim();
}
