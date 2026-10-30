const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function buildEmailLink(to: string, subject: string, body: string) {
  const recipient = to.trim();
  if (!EMAIL_PATTERN.test(recipient)) return null;
  const params = new URLSearchParams({ subject, body });
  return `mailto:${recipient}?${params.toString()}`;
}

export function normalizeWhatsAppPhone(value: string) {
  let phone = value.replace(/\D/g, '');
  if (phone.startsWith('00')) phone = phone.slice(2);
  if (phone.length === 9) phone = `34${phone}`;
  return phone.length >= 11 ? phone : null;
}

export function buildWhatsAppLink(phone: string, body: string) {
  const normalizedPhone = normalizeWhatsAppPhone(phone);
  if (!normalizedPhone) return null;
  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(body)}`;
}
