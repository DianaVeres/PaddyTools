import { NextRequest, NextResponse } from 'next/server';
import shipments from '@/data/shipments.json';

const normalize = (value: string) => value.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
const digits = (value: string) => normalize(value).replace(/^[A-Z]+/, '');

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get('order') ?? '';
  if (!normalize(query)) return NextResponse.json({ error: 'Introduce un número de pedido.' }, { status: 400 });
  const exact = normalize(query);
  const numeric = digits(query);
  const matches = shipments.filter((item) => normalize(item.order) === exact || (numeric.length >= 4 && digits(item.order) === numeric));
  return NextResponse.json({ order: query, matches, indexedFiles: 63 });
}
