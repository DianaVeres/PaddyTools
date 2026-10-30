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
    'Select-Object -Skip $Keep',
    'Remove-Item -LiteralPath',
  ],
  'Las copias verificadas de las bases de datos',
);

// La búsqueda global debe seguir consultando WooCommerce por nombre/teléfono,
// sin distinguir tildes, además de conservar la búsqueda exacta de pedidos PA.
requireAll(
  'app/api/search/route.ts',
  [
    "normalize('NFD')",
    'customers?search=',
    'orders?customer=',
    'schoolCandidates:',
    '@/lib/woocommerce',
  ],
  'La búsqueda global',
);

// Las reservas e incidencias relacionadas deben admitir las variantes que usa
// Monday (R, PA, IPA y RPA) y cargar sus comentarios.
requireAll(
  'app/api/monday/route.ts',
  [
    'updatesFor',
    'updates(limit:100)',
    '`IPA${plain}`',
    '`RPA${plain}`',
    "normalize('NFD')",
  ],
  'La integración de Monday',
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
    'incidentRecords',
    'record_id',
    'incidentRecords.id',
    '.insert(incidentRecords)',
    '.delete(incidentRecords)',
  ],
  'Las incidencias individuales',
);
forbid(
  'app/api/incidents/route.ts',
  ['incidentCache'],
  'Las incidencias individuales',
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
