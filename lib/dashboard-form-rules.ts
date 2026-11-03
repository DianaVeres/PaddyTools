import { isValidEmail } from '@/lib/contact-links';
import type {
  IncidentDraft,
  ReservationDraft,
  SchoolProduct,
} from '@/lib/dashboard-types';

export function selectedPickupLines(
  products: SchoolProduct[],
  draft: IncidentDraft,
  showMissingSize = false,
): string[] {
  return products
    .filter((item) => draft.pickupItems[item.id]?.selected)
    .map((item) => {
      const pick = draft.pickupItems[item.id];
      const size = pick.size || (showMissingSize ? 'Sin indicar' : '');
      return `- ${item.name} | Talla: ${size} | Unidades: ${pick.units || 1}`;
    });
}

export function validateIncidentDraft(
  draft: IncidentDraft,
  selectedProducts: number,
): string {
  if (!draft.date) return 'Indica la fecha de recepción.';
  if (!draft.school.trim()) return 'Selecciona el colegio de la incidencia.';
  if (!draft.text.trim()) return 'Describe la incidencia antes de guardar.';
  if (draft.pickup && !draft.pickupSchool.trim())
    return 'Selecciona el colegio de recogida.';
  if (draft.pickup && selectedProducts < 1)
    return 'Selecciona al menos un producto para recoger.';
  return '';
}

export function validateReservationDraft(
  draft: ReservationDraft,
  options: { newCustomer: boolean; linkedCustomer: boolean },
): string {
  if (
    !draft.reference.trim() ||
    !draft.customerName.trim() ||
    !draft.school ||
    !draft.date ||
    !draft.articleId ||
    !draft.size.trim() ||
    draft.units < 1
  )
    return 'Completa referencia, cliente, colegio, fecha, artículo, talla y unidades.';
  if (!draft.customerId && !options.newCustomer && !options.linkedCustomer)
    return 'Selecciona un cliente del desplegable o pulsa Nuevo para crearlo.';
  if (
    options.newCustomer &&
    (!draft.phone.trim() || !draft.customerEmail.trim())
  )
    return 'Para un cliente nuevo, completa teléfono y e-mail.';
  if (options.newCustomer && !isValidEmail(draft.customerEmail))
    return 'El e-mail del cliente nuevo no tiene un formato válido.';
  return '';
}
