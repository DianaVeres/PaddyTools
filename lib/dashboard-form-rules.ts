import { isValidEmail } from '@/lib/contact-links';
import type { ReservationDraft } from '@/lib/dashboard-types';

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
