const incidentsHref = (params: Record<string, string>) =>
  `/incidencias?${new URLSearchParams(params)}`;

export const createIncidentHref = (reference: string) =>
  incidentsHref({ createIncident: reference.trim() });

export const openIncidentHref = (reference: string, source = 'order') =>
  incidentsHref({ openIncident: reference.trim(), source });
