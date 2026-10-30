const baseUrl = (
  process.env.PADDYTOOLS_PRODUCTION_URL ||
  'https://gestion-unificada.paddygestion.workers.dev'
).replace(/\/$/, '');

const timeoutMs = 20_000;

async function request(path, expectedStatuses = [200]) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: { 'user-agent': 'PaddyTools production smoke test' },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!expectedStatuses.includes(response.status)) {
    const body = (await response.text()).slice(0, 300);
    throw new Error(
      `${path} respondió ${response.status}; se esperaba ${expectedStatuses.join(' o ')}. ${body}`,
    );
  }
  return response;
}

async function json(path, expectedStatuses = [200]) {
  const response = await request(path, expectedStatuses);
  const type = response.headers.get('content-type') || '';
  if (!type.toLowerCase().includes('application/json')) {
    throw new Error(`${path} no devolvió JSON (${type || 'sin content-type'}).`);
  }
  return { response, data: await response.json() };
}

// La portada debe cargar el documento HTML real, no una pantalla de error.
const home = await request('/');
const homeHtml = await home.text();
if (!homeHtml.includes('PaddyTools') && !homeHtml.includes('Gestión unificada')) {
  throw new Error('La portada no contiene la identidad de PaddyTools.');
}

// Comprobaciones de lectura sobre las bases integradas. El intervalo antiguo
// evita cargar todos los PackingLists y no crea, modifica ni elimina nada.
const packing = await json(
  '/api/packing-lists?from=2000-01-01&to=2000-01-02',
);
if (!Array.isArray(packing.data)) {
  throw new Error('La API de PackingList no devolvió una lista.');
}

const incidents = await json('/api/incidents?scope=all');
if (!Array.isArray(incidents.data?.rows)) {
  throw new Error('La API de incidencias no devolvió sus registros.');
}
const incidentIds = incidents.data.rows.map((row) => row?.id).filter(Boolean);
if (incidentIds.length !== new Set(incidentIds).size) {
  throw new Error('La API de incidencias devolvió identificadores duplicados.');
}

const shipping = await json(
  '/api/shipping?order=SMOKE999999999',
);
if (!Array.isArray(shipping.data?.matches)) {
  throw new Error('La consulta histórica de envíos no devolvió una lista.');
}

// Una referencia no-PA debe rechazarse antes de llamar a WooCommerce. Con esto
// comprobamos la validación y el formato JSON sin consumir servicios externos.
const invalidSearch = await json('/api/search?number=SMOKE-INVALID', [422]);
if (typeof invalidSearch.data?.error !== 'string') {
  throw new Error('La búsqueda global no devolvió el error JSON esperado.');
}

console.log(
  `Producción verificada: portada, PackingList, ${incidents.data.rows.length} incidencias únicas, envíos y búsqueda global.`,
);
