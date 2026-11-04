'use client';

import { useEffect, useMemo, useState } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { IncidentDraft } from '@/lib/dashboard-types';
import { incidentImageUrl } from '@/lib/incident-record';

const MAX_IMAGES = 4;
const MAX_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function IncidentImagesField({
  incidentId,
  draft,
  onChange,
}: {
  incidentId: string;
  draft: IncidentDraft;
  onChange: (draft: IncidentDraft) => void;
}) {
  const [error, setError] = useState('');
  const previews = useMemo(
    () =>
      draft.newImages.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [draft.newImages],
  );
  useEffect(
    () => () => previews.forEach((preview) => URL.revokeObjectURL(preview.url)),
    [previews],
  );

  function choose(files: FileList | null) {
    const selected = Array.from(files || []);
    setError('');
    if (
      draft.images.length + draft.newImages.length + selected.length >
      MAX_IMAGES
    ) {
      setError(`Puedes adjuntar un máximo de ${MAX_IMAGES} imágenes.`);
      return;
    }
    const invalid = selected.find(
      (file) =>
        !ALLOWED_TYPES.has(file.type) || !file.size || file.size > MAX_BYTES,
    );
    if (invalid) {
      setError('Usa imágenes JPG, PNG o WebP de 5 MB como máximo.');
      return;
    }
    onChange({ ...draft, newImages: [...draft.newImages, ...selected] });
  }

  return (
    <section className="incident-images-field">
      <div className="incident-images-heading">
        <div>
          <b>Imágenes de la incidencia</b>
          <small>Hasta 4 imágenes JPG, PNG o WebP · máximo 5 MB cada una</small>
        </div>
        <label className="incident-image-picker">
          <ImagePlus /> Añadir imágenes
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={(event) => {
              choose(event.target.files);
              event.target.value = '';
            }}
          />
        </label>
      </div>
      {(draft.images.length > 0 || previews.length > 0) && (
        <div className="incident-image-grid">
          {draft.images.map((image) => (
            <a
              key={image.key}
              href={incidentImageUrl(incidentId, image.key)}
              target="_blank"
              rel="noreferrer"
              title={image.name}
            >
              <img
                src={incidentImageUrl(incidentId, image.key)}
                alt={image.name}
              />
              <span>{image.name}</span>
            </a>
          ))}
          {previews.map(({ file, url }, index) => (
            <div
              key={`${file.name}-${file.lastModified}`}
              className="incident-image-preview"
            >
              <img src={url} alt={`Vista previa de ${file.name}`} />
              <span>{file.name}</span>
              <Button
                type="button"
                variant="outline"
                size="icon-sm"
                aria-label={`Quitar ${file.name}`}
                onClick={() =>
                  onChange({
                    ...draft,
                    newImages: draft.newImages.filter(
                      (_, itemIndex) => itemIndex !== index,
                    ),
                  })
                }
              >
                <X />
              </Button>
            </div>
          ))}
        </div>
      )}
      {error && <p className="field-error">{error}</p>}
    </section>
  );
}
