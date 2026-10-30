import { NextRequest, NextResponse } from 'next/server';
import { findPackingListMatches } from '@/lib/packing-list-store';

const normalize = (value: string) =>
  value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('order') ?? '';
  if (!normalize(query))
    return NextResponse.json(
      { error: 'Introduce un número de pedido.' },
      { status: 400 },
    );
  try {
    const matches = await findPackingListMatches(normalize(query));
    return NextResponse.json({
      order: query,
      matches,
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
