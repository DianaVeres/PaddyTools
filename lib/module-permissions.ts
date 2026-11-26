import { canReadTechnicalSheets, hasTechnicalOnlyAccess } from './technical-sheet-access';

export const PERMISSIONS = [
  ['detalle', 'Consulta global', 'Buscar pedidos y clientes'],
  ['packing', 'PackingList', 'Generar y consultar packing lists'],
  ['reservas', 'Reservas', 'Consultar y crear reservas'],
  ['recogidas', 'Recogidas', 'Gestionar recogidas'],
  ['envios', 'Envíos', 'Consultar expediciones'],
  ['incidencias', 'Incidencias', 'Gestionar incidencias'],
  ['kpis', 'KPIs y contador', 'Consultar indicadores y registrar tiempos'],
  ['pedidos', 'Preparar pedidos', 'Preparar, finalizar y reabrir pedidos'],
  ['fichas', 'Fichas técnicas', 'Consultar e imprimir fichas STM'],
  ['inventarios', 'Inventarios', 'Realizar recuentos de almacén'],
  ['hotline', 'Hotline', 'Gestionar contactos y respuestas'],
  ['woocommerce', 'WooCommerce', 'Abrir el panel de WooCommerce'],
] as const;

export type AppPermission = typeof PERMISSIONS[number][0];
export const APP_PERMISSIONS = PERMISSIONS.map(([key]) => key);
const addedDefaults: AppPermission[] = ['kpis', 'pedidos', 'inventarios', 'hotline', 'woocommerce'];

export const isPermissionsAdmin = (email?: string) => email?.toLowerCase() === 'administracion@paddy.es';

export function parsePermissions(value: string | null, email: string): AppPermission[] {
  if (isPermissionsAdmin(email)) return [...APP_PERMISSIONS];
  let stored: unknown;
  try { stored = JSON.parse(value ?? 'null'); } catch { return []; }
  if (!Array.isArray(stored)) return [];
  const explicit = stored.includes('paddytools-v2');
  if (hasTechnicalOnlyAccess(email))
    return !explicit || stored.includes('fichas') ? ['fichas'] : [];
  return APP_PERMISSIONS.filter((key) => stored.includes(key) ||
    (!explicit && (addedDefaults.includes(key) || (key === 'fichas' && canReadTechnicalSheets(email)))));
}

export function serializePermissions(permissions: AppPermission[]) {
  return JSON.stringify(['paddytools-v2', ...permissions]);
}

export function moduleForPath(pathname: string): AppPermission | undefined {
  const path = pathname.replace(/\/$/, '');
  const groups: Record<AppPermission, string[]> = {
    detalle: ['/api/search', '/api/order-documents', '/api/order-notes', '/api/return-attended', '/api/tickets'],
    packing: ['/packing-list', '/api/packing-lists', '/api/packing-drafts', '/api/activity'],
    reservas: ['/api/monday', '/preparar-reservas', '/api/reservation-preparation'],
    recogidas: ['/api/recogidas'],
    envios: ['/api/shipping'],
    incidencias: ['/incidencias', '/incidencias-app.html', '/api/incidents', '/api/records'],
    kpis: ['/kpis', '/api/kpis', '/api/kpi-order-count', '/api/kpi-work-logs', '/api/quality-errors'],
    pedidos: ['/preparar-pedidos', '/api/order-preparation', '/gestionar-devoluciones', '/api/order-returns'],
    fichas: ['/fichas-tecnicas', '/api/technical-sheets'],
    inventarios: ['/inventarios', '/api/inventories'],
    hotline: ['/hotline', '/api/hotline'],
    woocommerce: ['/api/woocommerce-admin'],
  };
  return APP_PERMISSIONS.find((key) => groups[key].some((prefix) => path === prefix || path.startsWith(prefix + '/')));
}
