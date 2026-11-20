import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const header = read('components/dashboard/dashboard-header.tsx');
const home = read('app/page.tsx');
const page = read('app/preparar-pedidos/page.tsx');
const route = read('app/api/order-preparation/route.ts');
const woo = read('lib/woo-order-preparation.ts');
const catalog = read('lib/order-preparation-catalog.ts');
const prefill = read('lib/reservation-prefill.ts');
const camera = read('components/order-preparation/barcode-camera-scanner.tsx');
const schema = read('db/schema.ts');
const completionMigration = read(
  'drizzle/0014_order_preparation_completions.sql',
);
const routingMigration = read('drizzle/0015_order_preparation_routing.sql');

assert.ok(
  header.includes('Preparar pedidos'),
  'falta el acceso a Preparar pedidos',
);
assert.ok(
  header.indexOf('Preparar pedidos') > header.indexOf('KPIs'),
  'Preparar pedidos debe estar junto a KPIs',
);
assert.ok(
  home.includes("window.location.assign('/preparar-pedidos')"),
  'la portada no abre el módulo',
);
assert.ok(
  page.includes('Filtra o escanea el número del pedido'),
  'falta la pantalla de preparación',
);
assert.ok(
  page.indexOf('order-preparation-search') <
    page.indexOf('order-preparation-shell'),
  'el buscador debe ocupar la cabecera compacta',
);
assert.ok(
  page.includes('fetchSessionUser'),
  'la pantalla debe exigir una sesión de PaddyTools',
);
assert.ok(
  page.includes('kpi-timer-slot'),
  'el contador debe mantenerse visible',
);
assert.ok(
  page.includes("fetch('/api/order-preparation'"),
  'la pantalla debe cargar los pedidos automáticamente',
);
assert.ok(
  page.includes('Abrir pedido'),
  'cada pedido debe abrir su ficha individual',
);
assert.ok(
  page.includes('Volver al listado'),
  'la ficha individual debe volver al listado',
);
assert.ok(
  page.includes('preparation-order-detail'),
  'los productos deben mostrarse en una vista individual',
);
assert.ok(
  page.includes('PRODUCTO ERRONEO'),
  'debe avisar si el producto no pertenece al pedido',
);
assert.ok(
  page.includes("event.key !== 'Enter' && event.key !== 'Tab'"),
  'la PDA debe admitir Enter y Tab',
);
assert.ok(
  page.includes("remaining === 0 ? 'complete' : 'incomplete'"),
  'debe distinguir productos completos e incompletos',
);
assert.ok(
  page.includes('localStorage.setItem'),
  'el conteo debe sobrevivir a una recarga en la PDA',
);
assert.ok(
  page.includes('Generar reserva'),
  'debe poder reservar las unidades que falten',
);
assert.ok(
  page.includes('reservationPrefillStorageKey'),
  'debe transferir los datos al formulario oficial',
);
assert.ok(
  page.includes("'preparacion'"),
  'debe iniciar la medición automática de preparación',
);
assert.ok(
  page.includes('completeAutomaticWork(PREPARATION_TIMER_KEY'),
  'debe cerrar la medición al finalizar el pedido',
);
assert.ok(
  page.includes('Finalizar pedido'),
  'falta el botón para finalizar el pedido',
);
assert.ok(
  page.includes('updatePreparedUnits(item, completed + 1)') &&
    page.includes('updatePreparedUnits(item, completed - 1)'),
  'debe permitir sumar y restar manualmente unidades preparadas',
);
assert.ok(
  page.includes('Sumar una unidad de') && page.includes('Restar una unidad de'),
  'los controles manuales deben ser accesibles',
);
assert.ok(
  page.includes('<small>preparadas</small>'),
  'el conteo debe representar unidades preparadas, escaneadas o manuales',
);
assert.ok(
  page.includes("method: 'POST'") && page.includes('preparedToday.map'),
  'los pedidos finalizados deben guardarse y aparecer en Preparados',
);
assert.ok(page.includes('Escanear con cámara'), 'falta el lector para móviles');
assert.ok(
  camera.includes('BrowserMultiFormatReader'),
  'la cámara debe leer códigos de barras, no solo QR',
);
assert.ok(
  camera.includes("facingMode: { ideal: 'environment' }"),
  'debe abrir la cámara trasera del móvil',
);
assert.ok(
  home.includes("initialParams.get('createReservation')"),
  'la portada debe abrir la reserva prerrellenada',
);
assert.ok(
  prefill.includes('reservationArticleIdForCode'),
  'el artículo debe asociarse por su código',
);
assert.ok(
  route.includes('getSessionUser(request)'),
  'la API debe exigir sesión',
);
assert.ok(
  route.includes('inventoryCatalog'),
  'la API debe asociar los códigos del catálogo STM',
);
assert.ok(
  route.includes('orderPreparationCompletions') &&
    route.includes('!completedIds.has(order.id)'),
  'los pedidos finalizados deben quedar fuera de pendientes',
);
assert.ok(
  route.includes('lookupMondayRecords') &&
    route.includes("method: 'PUT'") &&
    route.includes('preparationRoute'),
  'al finalizar debe comprobar reservas y enrutar el estado en WooCommerce',
);
assert.ok(
  schema.includes('orderPreparationCompletions') &&
    completionMigration.includes('order_preparation_completions') &&
    routingMigration.includes('shipping_method') &&
    routingMigration.includes('treatment'),
  'falta el almacenamiento persistente de pedidos preparados',
);
assert.ok(
  catalog.includes('barcodesForPreparationItem'),
  'la asociación de códigos debe estar en un módulo propio',
);
assert.ok(
  catalog.includes('barcodeMatchesPreparationItem'),
  'la lectura debe comparar equivalencias de códigos de barras',
);
assert.ok(
  catalog.includes('exactColorRows'),
  'debe priorizar el color exacto antes de aceptar equivalencias',
);
assert.ok(
  page.includes('barcodeMatchesPreparationItem'),
  'la pantalla debe aplicar las equivalencias del catálogo',
);
assert.ok(
  woo.includes('acceptedPaymentStatusSlug'),
  'debe localizar el estado Pago aceptado',
);
assert.ok(
  woo.includes('x-wp-totalpages'),
  'debe cargar todas las páginas de pedidos',
);
assert.ok(woo.includes('line_items'), 'la consulta debe incluir los productos');

console.log('Módulo Preparar pedidos verificado.');
