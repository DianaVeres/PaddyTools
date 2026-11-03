import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';

const HOTLINE_RESOURCES = new Set(['analyze', 'cases', 'templates']);

/**
 * Une el módulo Hotline de PaddyTools con el servicio que conserva sus datos,
 * plantillas y configuración de IA. La interfaz nunca conoce la dirección del
 * servicio y todas las peticiones pasan antes por el login de PaddyTools.
 */
export async function forwardHotlineRequest(
  request: NextRequest,
  resource: string,
) {
  if (!HOTLINE_RESOURCES.has(resource)) {
    return NextResponse.json({ error: 'Recurso Hotline no válido.' }, { status: 404 });
  }

  const service = (env as unknown as { HOTLINE_SERVICE?: Fetcher })
    .HOTLINE_SERVICE;
  if (!service) {
    return NextResponse.json(
      { error: 'Hotline no está conectado en este entorno.' },
      { status: 503 },
    );
  }

  const upstreamUrl = new URL(`/api/${resource}`, 'https://paddy-hotline.internal');
  upstreamUrl.search = request.nextUrl.search;
  const headers = new Headers();
  const contentType = request.headers.get('content-type');
  if (contentType) headers.set('content-type', contentType);

  try {
    const response = await service.fetch(upstreamUrl, {
      method: request.method,
      headers,
      body:
        request.method === 'GET' || request.method === 'HEAD'
          ? undefined
          : await request.arrayBuffer(),
    });
    const responseHeaders = new Headers();
    responseHeaders.set(
      'content-type',
      response.headers.get('content-type') || 'application/json; charset=utf-8',
    );
    return new NextResponse(response.body, {
      status: response.status,
      headers: responseHeaders,
    });
  } catch (error) {
    console.error(`No se pudo consultar Hotline (${resource}).`, error);
    return NextResponse.json(
      { error: 'No se pudo conectar con Hotline. Inténtalo de nuevo.' },
      { status: 502 },
    );
  }
}
