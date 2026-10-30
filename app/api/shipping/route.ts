import { NextRequest, NextResponse } from 'next/server';
import { forwardToPackingList } from '@/lib/packinglist-service';

const normalize = (value: string) => value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('order') ?? '';
  if (!normalize(query)) return NextResponse.json({ error: 'Introduce un número de pedido.' }, { status: 400 });
  try {
    const url = new URL('/api/packing-lists', request.url);
    url.searchParams.set('order', normalize(query));
    const response = await forwardToPackingList(
      new Request(url, { headers: { accept: 'application/json' } }),
    );
    if (!response.ok) throw new Error(`PackingList respondió ${response.status}`);
    const data = await response.json() as { matches?: unknown[] };
    return NextResponse.json({ order: query, matches: data.matches || [], source: 'Paddy Packing List' });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? `No se pudo consultar Paddy Packing List: ${error.message}` : 'No se pudo consultar Paddy Packing List.',
    }, { status: 502 });
  }
}
