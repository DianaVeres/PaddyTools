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

// La ruta pública de salud comprueba ambas bases sin exponer datos personales.
const health = await json('/api/health');
if (
  !health.data?.ok ||
  !health.data?.database ||
  !health.data?.packingDatabase ||
  !Number.isInteger(health.data?.incidents) ||
  !Number.isInteger(health.data?.packingLists)
) {
  throw new Error('La comprobación de salud no confirmó las dos bases de datos.');
}

// Las API con información comercial deben rechazar cualquier petición sin
// sesión. Esto verifica la barrera real ya desplegada, no solo el código local.
for (const path of [
  '/api/incidents?scope=all',
  '/api/packing-lists?from=2000-01-01&to=2000-01-02',
  '/api/shipping?order=SMOKE999999999',
  '/api/search?number=SMOKE-INVALID',
]) {
  const protectedResponse = await json(path, [401]);
  if (typeof protectedResponse.data?.error !== 'string')
    throw new Error(`${path} no devolvió el rechazo JSON esperado.`);
}

console.log(
  `Producción verificada: portada, ${health.data.incidents} incidencias, ${health.data.packingLists} PackingLists y API protegida.`,
);
