import { env } from 'cloudflare:workers';

type ServiceBinding = {
  fetch(input: Request | string, init?: RequestInit): Promise<Response>;
};

export async function forwardToPackingList(request: Request) {
  const service = (env as unknown as { PACKINGLIST?: ServiceBinding }).PACKINGLIST;
  if (!service)
    return Response.json(
      { error: 'El servicio interno de PackingList no está configurado.' },
      { status: 503 },
    );

  const incoming = new URL(request.url);
  const target = new URL(incoming.pathname + incoming.search, 'https://paddy-packing-list.internal');
  const response = await service.fetch(new Request(target, request));
  // Las respuestas de un Service Binding tienen cabeceras inmutables. Vinext
  // añade sus cabeceras de caché al salir, por lo que devolvemos una copia
  // normal para que pueda hacerlo sin provocar un error 1101.
  const headers = new Headers(response.headers);
  // El archivo compartido cambia continuamente. Evitamos que el navegador o
  // la capa de assets muestre una lista anterior justo después de crearla.
  headers.set('cache-control', 'no-store, no-cache, must-revalidate');
  headers.set('pragma', 'no-cache');
  headers.set('expires', '0');
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
