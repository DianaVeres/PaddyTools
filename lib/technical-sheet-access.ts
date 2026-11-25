const technicalOnlyUsers = new Set([
  'martatortajada@paddy.es',
  'lucilebalanzat@paddy.es',
  'ricardo@paddy.es',
]);

export function hasTechnicalOnlyAccess(email?: string) {
  return technicalOnlyUsers.has(email?.trim().toLowerCase() ?? '');
}

export function canReadTechnicalSheets(email?: string) {
  return email?.trim().toLowerCase() === 'administracion@paddy.es'
    || hasTechnicalOnlyAccess(email);
}
