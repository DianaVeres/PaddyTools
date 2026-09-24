import { NextRequest, NextResponse } from 'next/server';
import { env } from 'cloudflare:workers';

const normalize = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

const DEFAULT_PACKINGLIST_URL =
  'https://paddy-packing-list.paddygestion.workers.dev';

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('order') ?? '';
  if (!normalize(query))
    return NextResponse.json(
      { error: 'Introduce un número de pedido.' },
      { status: 400 },
    );
  try {
    const url = new URL('/api/packing-lists', DEFAULT_PACKINGLIST_URL);
    url.searchParams.set('order', normalize(query));
    const config = env as unknown as {
      PACKINGLIST?: { fetch: typeof fetch };
    };
    const requestPackingList = config.PACKINGLIST?.fetch.bind(config.PACKINGLIST) ?? fetch;
    const response = await requestPackingList(url, {
      headers: {
        accept: 'application/json',
      },
      redirect: 'follow',
    });
    if (!response.ok)
      throw new Error(`PackingList respondió ${response.status}`);
    const data = (await response.json()) as { matches?: unknown[] };
    return NextResponse.json({
      order: query,
      matches: data.matches || [],
      source: 'Paddy Packing List',
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `No se pudo consultar Paddy Packing List: ${error.message}`
            : 'No se pudo consultar Paddy Packing List.',
      },
      { status: 502 },
    );
  }
}
