import type { AuthUser } from '@/lib/auth';

export type IncidentAuditEntry = {
  action: string;
  at: string;
  userEmail: string;
  userName: string;
};

export function readIncidentAudit(value: unknown): IncidentAuditEntry[] {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (entry): entry is IncidentAuditEntry =>
        Boolean(entry) &&
        typeof entry.action === 'string' &&
        typeof entry.at === 'string' &&
        typeof entry.userEmail === 'string' &&
        typeof entry.userName === 'string',
    );
  } catch {
    return [];
  }
}

export function appendIncidentAudit(
  current: unknown,
  action: string,
  actor: AuthUser | null,
  at = new Date().toISOString(),
) {
  const entries = readIncidentAudit(current);
  entries.push({
    action,
    at,
    userEmail: actor?.email || '',
    userName: actor?.displayName || actor?.email || 'Usuario no identificado',
  });
  return JSON.stringify(entries);
}

export function latestIncidentAudit(
  entries: IncidentAuditEntry[],
  action: string,
) {
  return [...entries].reverse().find((entry) => entry.action === action);
}
