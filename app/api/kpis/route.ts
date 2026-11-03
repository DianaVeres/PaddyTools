import { NextRequest, NextResponse } from 'next/server';
import { buildKpiSnapshot } from '@/lib/kpi-service';

const validDate = (value: string | null) =>
  value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';

export async function GET(request: NextRequest) {
  const from = validDate(request.nextUrl.searchParams.get('from'));
  const to = validDate(request.nextUrl.searchParams.get('to'));
  const worker = request.nextUrl.searchParams.get('worker')?.trim().toLowerCase() || '';
  if (from && to && from > to)
    return NextResponse.json(
      { error: 'La fecha inicial no puede ser posterior a la final.' },
      { status: 400 },
    );
  try {
    return NextResponse.json(await buildKpiSnapshot(from, to, worker), {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `No se pudieron calcular los KPI: ${error.message}`
            : 'No se pudieron calcular los KPI.',
      },
      { status: 502 },
    );
  }
}
