export type UserIdentity = {
  email: string;
  displayName: string;
};

const INCIDENT_DELETE_USERS = new Set(['rociosaez', 'administracion']);

export const normalizedUserName = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

export function canDeleteIncidents(user: UserIdentity | null | undefined) {
  if (!user) return false;
  return [user.email.split('@')[0] || '', user.displayName]
    .map(normalizedUserName)
    .some((value) => INCIDENT_DELETE_USERS.has(value));
}
