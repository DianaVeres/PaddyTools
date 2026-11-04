import { eq } from 'drizzle-orm';
import { env } from 'cloudflare:workers';
import { getDb } from '@/db';
import { incidentRecords } from '@/db/schema';
import type { IncidentImage } from '@/lib/incident-record';
import { findStoredIncident } from '@/lib/incident-actions';
import {
  incidentFieldsFor,
  incidentTextValue,
  mapStoredIncident,
  readAllIncidentRows,
} from '@/lib/incident-store';

export const MAX_INCIDENT_IMAGES = 4;
export const MAX_INCIDENT_IMAGE_BYTES = 5 * 1024 * 1024;
export const INCIDENT_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);
const CHUNK_BYTES = 48 * 1024;

const storedImages = (value: unknown): IncidentImage[] => {
  try {
    const parsed = JSON.parse(incidentTextValue(value) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

async function saveFileChunks(imageId: string, bytes: Uint8Array) {
  for (
    let offset = 0, index = 0;
    offset < bytes.length;
    offset += CHUNK_BYTES, index += 1
  ) {
    const chunk = bytes.slice(offset, offset + CHUNK_BYTES);
    await env.DB.prepare(
      'INSERT INTO incident_image_chunks(image_id, chunk_index, data) VALUES(?, ?, ?)',
    )
      .bind(imageId, index, chunk.buffer)
      .run();
  }
}

async function deleteImage(imageId: string) {
  await env.DB.prepare('DELETE FROM incident_image_chunks WHERE image_id = ?')
    .bind(imageId)
    .run();
  await env.DB.prepare('DELETE FROM incident_images WHERE id = ?')
    .bind(imageId)
    .run();
}

export async function addIncidentImages(incidentId: string, files: File[]) {
  const stored = findStoredIncident(await readAllIncidentRows(), {
    id: incidentId,
  });
  if (!stored) throw new Error('No se encontró la incidencia.');
  const current = storedImages(stored.data.images_json);
  if (current.length + files.length > MAX_INCIDENT_IMAGES)
    throw new Error(
      `Puedes guardar un máximo de ${MAX_INCIDENT_IMAGES} imágenes.`,
    );

  const uploaded: IncidentImage[] = [];
  try {
    for (const file of files) {
      if (!INCIDENT_IMAGE_TYPES.has(file.type))
        throw new Error('Solo se admiten imágenes JPG, PNG o WebP.');
      if (!file.size || file.size > MAX_INCIDENT_IMAGE_BYTES)
        throw new Error('Cada imagen debe ocupar como máximo 5 MB.');
      const id = crypto.randomUUID();
      const uploadedAt = new Date().toISOString();
      await env.DB.prepare(
        'INSERT INTO incident_images(id, incident_id, name, mime_type, size, uploaded_at) VALUES(?, ?, ?, ?, ?, ?)',
      )
        .bind(
          id,
          incidentId,
          file.name.slice(0, 180),
          file.type,
          file.size,
          uploadedAt,
        )
        .run();
      uploaded.push({
        key: id,
        name: file.name,
        type: file.type,
        size: file.size,
        uploadedAt,
      });
      await saveFileChunks(id, new Uint8Array(await file.arrayBuffer()));
    }
  } catch (error) {
    await Promise.all(uploaded.map((image) => deleteImage(image.key)));
    throw error;
  }

  const data = {
    ...stored.data,
    images_json: JSON.stringify([...current, ...uploaded]),
    updated_at: new Date().toISOString(),
  };
  await getDb()
    .update(incidentRecords)
    .set(incidentFieldsFor(stored.id, data))
    .where(eq(incidentRecords.id, stored.id));
  return mapStoredIncident({ id: stored.id, data });
}

export async function getIncidentImage(incidentId: string, imageId: string) {
  const stored = findStoredIncident(await readAllIncidentRows(), {
    id: incidentId,
  });
  if (
    !stored ||
    !storedImages(stored.data.images_json).some(
      (image) => image.key === imageId,
    )
  )
    return null;
  const metadata = await env.DB.prepare(
    'SELECT mime_type, size FROM incident_images WHERE id = ? AND incident_id = ?',
  )
    .bind(imageId, incidentId)
    .first<{ mime_type: string; size: number }>();
  if (!metadata) return null;
  const result = await env.DB.prepare(
    'SELECT data FROM incident_image_chunks WHERE image_id = ? ORDER BY chunk_index',
  )
    .bind(imageId)
    .all<{ data: ArrayBuffer | number[] }>();
  const body = new Uint8Array(metadata.size);
  let offset = 0;
  for (const row of result.results) {
    const chunk = new Uint8Array(row.data);
    body.set(chunk, offset);
    offset += chunk.length;
  }
  if (offset !== metadata.size) return null;
  return { body, contentType: metadata.mime_type };
}
