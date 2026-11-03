import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

function requireAll(path, fragments, description) {
  const source = read(path);
  const missing = fragments.filter((fragment) => !source.includes(fragment));
  if (missing.length) {
    throw new Error(
      `${description} ha perdido protecciones en ${path}: ${missing.join(', ')}`,
    );
  }
}

function forbid(path, fragments, description) {
  const source = read(path);
  const found = fragments.filter((fragment) => source.includes(fragment));
  if (found.length) {
    throw new Error(
      `${description} ha recuperado código obsoleto en ${path}: ${found.join(', ')}`,
    );
  }
}

// El despliegue debe verificar la versión publicada y recuperar la anterior si
// la nueva falla repetidamente. Así un error detectado no se queda en producción.
requireAll(
  'scripts/deploy-production.ps1',
  [
    '$attempt -le 3',
    'rollback --config $config',
    'Versión anterior restaurada',
    '& $node $productionCheck',
  ],
  'La recuperación automática del despliegue',
);
requireAll(
  'scripts/deploy-production.ps1',
  ['backup-production.ps1', 'La copia de seguridad ha fallado'],
  'La copia previa al despliegue',
);
requireAll(
  'scripts/backup-production.ps1',
  [
    'gestion-unificada-db',
    'paddy-packing-list-db',
    'Get-FileHash',
    '$attempt -le 3',
    'Select-Object -Skip $Keep',
    'Remove-Item -LiteralPath',
  ],
  'Las copias verificadas de las bases de datos',
);
for (const path of ['app/packing-list/page.tsx']) {
  requireAll(
    path,
    ['@/lib/http-response'],
    'La lectura segura de respuestas en las pantallas',
  );
  forbid(
    path,
    ['.json()'],
    'La lectura segura de respuestas en las pantallas',
  );
}
requireAll(
  'lib/dashboard-api.ts',
  ['@/lib/http-response', 'readJsonResponse'],
  'La lectura segura del cliente del panel principal',
);
forbid(
  'app/page.tsx',
  ['.json()', 'fetch('],
  'La centralización de peticiones del panel principal',
);
requireAll(
  'app/page.tsx',
  [
    '@/lib/incident-record',
    'incidentLabelLines',
    'sent: incidentDraft.sent ? 1 : 0',
  ],
  'Los datos e impresión de incidencias',
);
requireAll(
  'components/dashboard/incident-registry-dialog.tsx',
  ['@/lib/incident-record', 'incidentStatusLabel'],
  'Los estados del registro de incidencias',
);
requireAll(
  'components/dashboard/incident-details-section.tsx',
  ["['sent', 'Enviado']", 'event.target.checked'],
  'El estado enviado de las incidencias',
);
for (const path of ['app/page.tsx', 'app/api/order-notes/route.ts']) {
  requireAll(
    path,
    ['@/lib/order-note', 'normalizeOrderNoteReference'],
    'Las notas internas compartidas',
  );
}
for (const path of ['app/page.tsx', 'app/api/tickets/route.ts']) {
  requireAll(
    path,
    ['@/lib/store-ticket'],
    'Los tickets de tienda compartidos',
  );
}
requireAll(
  'app/page.tsx',
  [
    'linkedWooOrderReference',
    'isWooOrderReference',
    'isExactRecordReference',
    'incidentStorageReference',
    'reservationStorageReference',
  ],
  'La interpretación compartida de referencias',
);
requireAll(
  'app/page.tsx',
  ['@/lib/dashboard-types'],
  'Los modelos compartidos del panel principal',
);
requireAll(
  'app/page.tsx',
  ['@/components/dashboard/common'],
  'Los elementos comunes del panel principal',
);
requireAll(
  'components/dashboard/reservation-result-dialog.tsx',
  ['@/components/dashboard/print-components', 'ReservationPrintCard'],
  'Los impresos compartidos del panel principal',
);
requireAll(
  'app/page.tsx',
  ['@/components/dashboard/order-items'],
  'La tarjeta compartida de artículos del pedido',
);
requireAll(
  'components/dashboard/order-linked-records.tsx',
  ['@/components/dashboard/incident-card', '@/components/dashboard/monday-cards'],
  'Las tarjetas conectadas del pedido WooCommerce',
);
requireAll(
  'components/dashboard/connected-results.tsx',
  [
    '@/components/dashboard/incident-card',
    '@/components/dashboard/monday-cards',
    '@/components/dashboard/reservation-notes-card',
  ],
  'Las tarjetas conectadas sin pedido WooCommerce',
);
requireAll(
  'app/page.tsx',
  [
    '@/lib/contact-links',
    'buildEmailLink',
    'buildWhatsAppLink',
  ],
  'Los enlaces aislados de contacto',
);
requireAll(
  'lib/dashboard-form-rules.ts',
  ['@/lib/contact-links', 'isValidEmail'],
  'La validación aislada del correo de reservas',
);
requireAll(
  'app/page.tsx',
  ['@/lib/label-print', 'printStandaloneLabel'],
  'La impresión aislada de etiquetas',
);
requireAll(
  'lib/label-print.ts',
  ['buildStandaloneLabelHtml', '@page { size: 150mm 100mm'],
  'El formato de las etiquetas',
);
requireAll(
  'app/page.tsx',
  [
    '@/lib/delivery-message',
    'createDeliveryEmailDraft',
    'deliveryKindFromText',
    'updateDeliveryEmailDraft',
  ],
  'Los mensajes aislados de entrega',
);
for (const path of ['app/page.tsx', 'app/api/incidents/route.ts']) {
  requireAll(
    path,
    ['@/lib/permissions', 'canDeleteIncidents'],
    'Los permisos compartidos de incidencias',
  );
  forbid(
    path,
    ["new Set(['rociosaez', 'administracion'])"],
    'Los permisos compartidos de incidencias',
  );
}
requireAll(
  'proxy.ts',
  ['getSessionUser', 'isPublicApiRequest', "matcher: ['/api/:path*']"],
  'La barrera de sesión de las API',
);

// La búsqueda global debe seguir consultando WooCommerce por nombre/teléfono,
// sin distinguir tildes, además de conservar la búsqueda exacta de pedidos PA.
requireAll(
  'app/api/search/route.ts',
  [
    'wooIsConfigured',
    '@/lib/woo-customer-search',
    'searchWooOrdersByCustomer',
    '@/lib/woo-order-detail',
    'loadWooOrderDetail',
  ],
  'La búsqueda global',
);
requireAll(
  'lib/woo-customer-search.ts',
  [
    'wooSearchVariants',
    'searchDigits',
    'customers?search=',
    'orders?customer=',
    'Array.from({ length: 10 }',
  ],
  'La búsqueda de clientes en WooCommerce',
);
requireAll(
  'lib/woo-order-detail.ts',
  [
    '@/lib/woocommerce',
    'context=edit',
    '/notes?per_page=100',
    'schoolCandidates:',
    'returnAttended:',
    'wooOrderSchoolCandidates',
  ],
  'El detalle de pedidos WooCommerce',
);

// Las reservas e incidencias relacionadas deben admitir las variantes que usa
// Monday (R, PA, IPA y RPA) y cargar sus comentarios.
requireAll(
  'app/api/monday/route.ts',
  [
    '@/lib/monday-updates',
    '@/lib/monday-write',
    '@/lib/monday-options',
    '@/lib/monday-reservations',
    '@/lib/monday-search',
    '@/lib/monday-lookup',
    '@/lib/monday-maintenance',
    'updatesFor',
    'normalizeReferenceInput',
  ],
  'La integración de Monday',
);
requireAll(
  'lib/monday-maintenance.ts',
  [
    'MONDAY_MAINTENANCE_KEY',
    'isMondayMaintenanceKey',
    'removeMondayLabelColumn',
    'delete_column',
  ],
  'El mantenimiento protegido de Monday',
);
requireAll(
  'lib/monday-lookup.ts',
  [
    'lookupMondayRecords',
    'mondayReferenceCandidates',
    'items_page_by_column_values',
    'mondayReservationBaseReference',
    'enrichMondayReservations',
  ],
  'La búsqueda exacta de referencias en Monday',
);
requireAll(
  'lib/monday-search.ts',
  [
    'searchMondayRecords',
    'MONDAY_BOARDS.map',
    'loadMondayCustomerContacts',
    'searchKey(record.customer)',
    'searchDigits(record.phone)',
  ],
  'La búsqueda por clientes y teléfonos en Monday',
);
requireAll(
  'lib/monday-reservations.ts',
  [
    'loadAllMondayReservations',
    'loadMondayArticleDetails',
    'enrichMondayReservations',
    'loadMondayCustomerContacts',
    'start += 100',
  ],
  'La lectura completa de reservas Monday',
);
requireAll(
  'lib/monday-options.ts',
  [
    'loadMondayReservationOptions',
    'MONDAY_RESERVATION_OPTIONS',
    'mondayColumnPhone',
    'mondayColumnEmail',
  ],
  'Las opciones del formulario de reservas',
);
requireAll(
  'lib/monday-updates.ts',
  ['updates(limit:100)', 'normalizeMondayUpdates'],
  'Los comentarios de Monday',
);

// Factura, hoja de devolución y devolución atendida deben usar una única
// conexión WooCommerce y tratar las respuestas como datos, no como HTML.
for (const path of [
  'app/api/order-documents/route.ts',
  'app/api/return-attended/route.ts',
]) {
  requireAll(path, ['@/lib/woocommerce'], 'Los documentos de WooCommerce');
  forbid(path, ['/wp-json/wc/v3/'], 'Los documentos de WooCommerce');
}
requireAll(
  'app/api/order-documents/route.ts',
  ['invoice', 'packing-slip', 'application/pdf'],
  'La descarga de documentos',
);
requireAll(
  'app/api/return-attended/route.ts',
  ['wooResponseJson', 'devolucion', 'atendida'],
  'La devolución atendida',
);

// Cada incidencia debe conservar un identificador propio. Esto permite varias
// incidencias del mismo pedido y evita modificar o borrar la equivocada.
requireAll(
  'app/api/incidents/route.ts',
  [
    'normalizeReferenceInput',
    '@/lib/incident-write',
    '@/lib/incident-query',
    'saveIncident(incoming)',
  ],
  'Las incidencias individuales',
);
requireAll(
  'lib/incident-query.ts',
  [
    'listIncidents',
    'findIncidents',
    'readAllIncidentRows',
    'incidentReferenceCandidates',
    'pickup_school',
  ],
  'La lectura compartida de incidencias',
);
requireAll(
  'lib/incident-write.ts',
  [
    'record_id',
    'auto_generate_id',
    'nextAutomaticIncidentId',
    'recurrence_count:',
    '.insert(incidentRecords)',
    '.update(incidentRecords)',
  ],
  'El guardado individual de incidencias',
);
requireAll(
  'app/api/incidents/route.ts',
  [
    '@/lib/incident-query',
    'findIncidents',
    'listIncidents',
  ],
  'El almacenamiento compartido de incidencias',
);
requireAll(
  'app/api/incidents/route.ts',
  [
    '@/lib/incident-actions',
    'updateIncidentStatus(body)',
    'deleteStoredIncident(body)',
  ],
  'Las acciones compartidas de incidencias',
);
requireAll(
  'lib/incident-actions.ts',
  [
    'findStoredIncident',
    'incidentReferenceCandidates',
    'pickup_received_at:',
    'solved_at:',
    '.delete(incidentRecords)',
  ],
  'La actualización y eliminación de incidencias',
);
forbid(
  'app/api/incidents/route.ts',
  ['incidentCache'],
  'Las incidencias individuales',
);

requireAll(
  'components/dashboard/connected-results.tsx',
  ['@/components/dashboard/reservation-notes-card', 'ReservationNotesCard'],
  'La tarjeta de notas de reservas',
);
requireAll(
  'app/page.tsx',
  ['@/components/dashboard/store-ticket-card', 'StoreTicketCard'],
  'La tarjeta de tickets de tienda',
);
requireAll(
  'app/page.tsx',
  ['@/components/dashboard/order-activity', 'OrderActivity'],
  'La actividad del pedido',
);
requireAll(
  'app/page.tsx',
  ['@/components/dashboard/order-movements', 'OrderMovements'],
  'Los movimientos del pedido',
);
requireAll(
  'app/page.tsx',
  ['@/components/dashboard/order-documents', 'OrderDocuments'],
  'Los documentos del pedido',
);
requireAll(
  'app/page.tsx',
  ['@/components/dashboard/order-notes-card', 'OrderNotesCard'],
  'Las notas del pedido',
);
requireAll(
  'app/page.tsx',
  ['@/components/dashboard/order-follow-up', 'OrderFollowUp'],
  'El seguimiento del pedido',
);
requireAll(
  'app/page.tsx',
  ['@/components/dashboard/order-summary', 'OrderSummary'],
  'El resumen del pedido',
);
requireAll(
  'app/page.tsx',
  ['@/components/dashboard/order-heading', 'OrderHeading'],
  'La cabecera del pedido',
);
requireAll(
  'app/page.tsx',
  ['@/components/dashboard/order-linked-records', 'OrderLinkedRecords'],
  'Los registros conectados del pedido',
);
requireAll(
  'app/page.tsx',
  ['@/components/dashboard/dashboard-header', 'DashboardHeader'],
  'La cabecera principal',
);
requireAll(
  'app/page.tsx',
  ['@/components/dashboard/global-search-panel', 'GlobalSearchPanel'],
  'La consulta global',
);
requireAll(
  'app/page.tsx',
  ['@/components/dashboard/dashboard-feedback', 'DashboardFeedback'],
  'Los estados de consulta',
);
requireAll(
  'app/page.tsx',
  ['@/components/dashboard/connected-results', 'ConnectedResults'],
  'Los resultados conectados',
);
requireAll(
  'app/page.tsx',
  ['@/components/dashboard/print-sheets', 'PrintSheets'],
  'Las hojas de impresión',
);
requireAll(
  'app/page.tsx',
  [
    '@/components/dashboard/incident-document-dialog',
    'IncidentDocumentDialog',
  ],
  'El diálogo de documento de incidencia',
);
requireAll(
  'components/dashboard/incident-form-dialog.tsx',
  [
    '@/components/dashboard/incident-pickup-section',
    'IncidentPickupSection',
  ],
  'La recogida del formulario de incidencias',
);
requireAll(
  'components/dashboard/incident-form-dialog.tsx',
  [
    '@/components/dashboard/incident-details-section',
    'IncidentDetailsSection',
  ],
  'Los datos del formulario de incidencias',
);
requireAll(
  'app/page.tsx',
  ['@/components/dashboard/incident-form-dialog', 'IncidentFormDialog'],
  'El formulario completo de incidencias',
);
requireAll(
  'components/dashboard/reservation-form-dialog.tsx',
  [
    '@/components/dashboard/reservation-customer-section',
    'ReservationCustomerSection',
  ],
  'Los datos de cliente del formulario de reservas',
);
requireAll(
  'components/dashboard/reservation-form-dialog.tsx',
  [
    '@/components/dashboard/reservation-details-section',
    'ReservationDetailsSection',
  ],
  'Los detalles del formulario de reservas',
);
requireAll(
  'app/page.tsx',
  ['@/components/dashboard/reservation-form-dialog', 'ReservationFormDialog'],
  'El formulario completo de reservas',
);
requireAll(
  'app/page.tsx',
  [
    '@/components/dashboard/customer-message-dialog',
    'CustomerMessageDialog',
  ],
  'El diálogo de email y WhatsApp',
);
requireAll(
  'app/page.tsx',
  [
    '@/components/dashboard/shipping-history-dialog',
    'ShippingHistoryDialog',
  ],
  'El diálogo de histórico de envíos',
);
requireAll(
  'app/page.tsx',
  [
    '@/components/dashboard/reservation-registry-dialog',
    'ReservationRegistryDialog',
  ],
  'El registro de reservas',
);
requireAll(
  'app/page.tsx',
  ['@/components/dashboard/incident-registry-dialog', 'IncidentRegistryDialog'],
  'El registro de incidencias y recogidas',
);
requireAll(
  'app/page.tsx',
  ['@/components/dashboard/reservation-result-dialog', 'ReservationResultDialog'],
  'La confirmación de reserva creada',
);
requireAll(
  'app/page.tsx',
  ['@/lib/dashboard-registry-filter', 'filterIncidentRegistry', 'filterReservationRegistry'],
  'Los filtros compartidos de registros',
);
requireAll(
  'app/page.tsx',
  ['@/lib/dashboard-reservation-options', 'mondayReservationUpdateItemIds', 'reservationArticlesForSchool'],
  'Las opciones compartidas de reservas',
);
requireAll(
  'app/page.tsx',
  ['@/lib/dashboard-search-results', 'hasConnectedSearchResults', 'emptyConnectedSearchMessage'],
  'Los resultados compartidos de consulta global',
);
requireAll(
  'lib/dashboard-api.ts',
  ['incidentsMatchingCustomerQuery'],
  'La búsqueda de incidencias conectadas',
);
requireAll(
  'app/page.tsx',
  ['@/lib/dashboard-api', 'searchConnectedRecords', 'searchExactConnected', 'fetchIncidentRegistry'],
  'El cliente único del panel principal',
);
requireAll(
  'app/page.tsx',
  ['@/lib/dashboard-form-rules', 'selectedPickupLines', 'validateIncidentDraft', 'validateReservationDraft'],
  'Las reglas compartidas de formularios',
);
requireAll(
  'app/page.tsx',
  ['@/lib/use-draggable-dialog', 'useDraggableDialog'],
  'El movimiento compartido de ventanas',
);
requireAll(
  'components/dashboard/dashboard-header.tsx',
  ['onOpenKpis', '<BarChart3 /> KPIs'],
  'El acceso al módulo KPI',
);
requireAll(
  'app/kpis/page.tsx',
  ['@/components/kpis/kpi-dashboard', '@/lib/kpi-client'],
  'La pantalla independiente de KPI',
);
requireAll(
  'lib/kpi-client.ts',
  ['/api/kpis', '/api/kpi-work-logs'],
  'El cliente independiente de KPI',
);
requireAll(
  'lib/kpi-service.ts',
  ['@/lib/kpi-metrics', 'calculateKpiSnapshot'],
  'El servicio independiente de KPI',
);
requireAll(
  'app/api/kpi-work-logs/route.ts',
  ['getSessionUser', 'validateKpiWorkLog', 'kpiWorkLogs'],
  'El registro protegido de tiempos KPI',
);
requireAll(
  'drizzle/0006_kpi_work_logs.sql',
  ['CREATE TABLE `kpi_work_logs`', 'idx_kpi_work_date'],
  'La migración aislada de tiempos KPI',
);

// PackingList debe conservar la comprobación de colegio, el aviso antes de
// imprimir y la búsqueda histórica completa, aunque la lista visible se filtre.
requireAll(
  'app/packing-list/page.tsx',
  [
    'schoolMismatch',
    'Las filas rojas pueden corresponder a otro colegio',
    'matchesSchoolCandidates',
    'sameSchoolFolder',
    'archiveFrom',
    'archiveTo',
  ],
  'La pantalla de PackingList',
);
requireAll(
  'lib/packing-list-store.ts',
  ['findPackingListMatches', 'historicalPackingLists', 'normalizeReference'],
  'El histórico de envíos',
);
requireAll(
  'app/api/shipping/route.ts',
  ['findPackingListMatches'],
  'La consulta de fecha de envío',
);

// Los mensajes automáticos excluyen únicamente los pedidos PA; las reservas e
// incidencias (R, IPA, etc.) deben seguir generándose.
requireAll(
  'app/packing-list/page.tsx',
  ['/^PA\\d+/i.test(order.orderNumber.trim())'],
  'La exclusión de mensajes PA',
);

console.log('Flujos críticos de PaddyTools verificados.');
