import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import {
  addIncidentImages,
  getIncidentImage,
  MAX_INCIDENT_IMAGES,
} from '@/lib/incident-images';

export async function GET(request: NextRequest) {
  if (!(await getSessionUser(request)))
    return NextResponse.json(
      { error: 'Debes iniciar sesión.' },
      { status: 401 },
    );
  const incidentId =
    request.nextUrl.searchParams.get('incidentId')?.trim() || '';
  const key = request.nextUrl.searchParams.get('key')?.trim() || '';
  if (!incidentId || !key)
    return NextResponse.json({ error: 'Falta la imagen.' }, { status: 400 });
  const object = await getIncidentImage(incidentId, key);
  if (!object)
    return NextResponse.json(
      { error: 'Imagen no encontrada.' },
      { status: 404 },
    );
  return new NextResponse(object.body, {
    headers: {
      'Content-Type': object.contentType || 'application/octet-stream',
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

export async function POST(request: NextRequest) {
  if (!(await getSessionUser(request)))
    return NextResponse.json(
      { error: 'Debes iniciar sesión.' },
      { status: 401 },
    );
  try {
    const form = await request.formData();
    const incidentId = String(form.get('incidentId') || '').trim();
    const files = form
      .getAll('images')
      .filter((value): value is File => value instanceof File);
    if (!incidentId || !files.length)
      return NextResponse.json(
        { error: 'Selecciona al menos una imagen.' },
        { status: 400 },
      );
    if (files.length > MAX_INCIDENT_IMAGES)
      return NextResponse.json(
        { error: `Puedes subir un máximo de ${MAX_INCIDENT_IMAGES} imágenes.` },
        { status: 400 },
      );
    return NextResponse.json({
      ok: true,
      incident: await addIncidentImages(incidentId, files),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'No se pudieron guardar las imágenes.',
      },
      { status: 400 },
    );
  }
}
