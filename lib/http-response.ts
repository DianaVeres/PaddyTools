export type JsonResponseOptions<T> = {
  source?: string;
  empty?: T;
};

// Lee primero como texto para reconocer respuestas vacías o páginas HTML y
// convertirlas en un mensaje comprensible, sin exponer errores internos de JSON.
export async function readJsonResponse<T>(
  response: Response,
  options: JsonResponseOptions<T> = {},
): Promise<T> {
  const text = await response.text();
  if (!text.trim()) {
    if ('empty' in options) return options.empty as T;
    throw new Error(
      `${options.source || 'PaddyTools'} respondió ${response.status} sin datos.`,
    );
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `${options.source || 'PaddyTools'} respondió ${response.status} con un formato no válido.`,
    );
  }
}
