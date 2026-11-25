const technicalOnlyUsers = new Set([
  'martatortajada@paddy.es',
  'lucilebalanzat@paddy.es',
  'ricardo@paddy.es',
]);

export function hasTechnicalOnlyAccess(email?: string) {
  return technicalOnlyUsers.has(email?.trim().toLowerCase() ?? '');
}

export function canReadTechnicalSheets(email?: string) {
  const normalizedEmail = email?.trim().toLowerCase();
  return normalizedEmail === 'administracion@paddy.es'
    || normalizedEmail === 'rociosaez@paddy.es'
    || hasTechnicalOnlyAccess(email);
}
