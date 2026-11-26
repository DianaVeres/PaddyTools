import { NextRequest, NextResponse } from 'next/server';
import { asc, eq, like, or } from 'drizzle-orm';
import { getDb } from '@/db';
import {
  stmTechnicalSheetColors,
  stmTechnicalSheetSections,
  stmTechnicalSheets,
} from '@/db/schema';
import { getSessionUser } from '@/lib/auth';
import { env } from 'cloudflare:workers';

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user)
    return NextResponse.json({ error: 'Debes iniciar sesión.' }, { status: 401 });
  if (!user.permissions.includes('fichas'))
    return NextResponse.json({ error: 'No tienes acceso a Fichas técnicas.' }, { status: 403 });

  const photo = request.nextUrl.searchParams.get('photo');
  if (photo !== null) {
    const season = request.nextUrl.searchParams.get('season') ?? '';
    const extension = photo.match(/^[^/\\]+\.(jpe?g|png|webp)$/i)?.[1].toLowerCase();
    if (!extension || !/^\d+$/.test(season)) return new Response(null, { status: 404 });
    const { results } = await env.DB.prepare(
      'SELECT data FROM stm_photos WHERE photo_key = ? ORDER BY part',
    ).bind(`${season}/${photo}`).all<{ data: string }>();
    if (!results.length) return new Response(null, { status: 404 });
    const bytes = Uint8Array.from(atob(results.map(({ data }) => data).join('')), (char) => char.charCodeAt(0));
    return new Response(bytes, { headers: {
      'Content-Type': `image/${extension.startsWith('jp') ? 'jpeg' : extension}`,
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    } });
  }

  const db = getDb();
  const code = request.nextUrl.searchParams.get('code')?.trim();
  if (code) {
    const [sheet] = await db
      .select()
      .from(stmTechnicalSheets)
      .where(eq(stmTechnicalSheets.code, code))
      .limit(1);
    if (!sheet)
      return NextResponse.json({ error: 'Ficha técnica no encontrada.' }, { status: 404 });
    const colors = await db
      .select()
      .from(stmTechnicalSheetColors)
      .where(eq(stmTechnicalSheetColors.technicalSheetId, sheet.id))
      .orderBy(asc(stmTechnicalSheetColors.position));
    const sections = await db
      .select()
      .from(stmTechnicalSheetSections)
      .where(eq(stmTechnicalSheetSections.technicalSheetId, sheet.id))
      .orderBy(
        asc(stmTechnicalSheetSections.section),
        asc(stmTechnicalSheetSections.sourceTable),
        asc(stmTechnicalSheetSections.rowIndex),
      );
    return NextResponse.json({ sheet: { ...sheet, colors, sections } });
  }

  const query = request.nextUrl.searchParams.get('q')?.trim() || '';
  const match = `%${query.replaceAll('%', '').replaceAll('_', '')}%`;
  const sheets = await db
    .select({
      id: stmTechnicalSheets.id,
      season: stmTechnicalSheets.season,
      code: stmTechnicalSheets.code,
      description: stmTechnicalSheets.description,
      familyDescription: stmTechnicalSheets.familyDescription,
      collectionDescription: stmTechnicalSheets.collectionDescription,
      sizes: stmTechnicalSheets.sizes,
      importedAt: stmTechnicalSheets.importedAt,
    })
    .from(stmTechnicalSheets)
    .where(
      query
        ? or(
            like(stmTechnicalSheets.code, match),
            like(stmTechnicalSheets.description, match),
            like(stmTechnicalSheets.internalDescription, match),
          )
        : undefined,
    )
    .orderBy(asc(stmTechnicalSheets.code))
    .limit(100);
  return NextResponse.json({ sheets, truncated: sheets.length === 100 });
}
