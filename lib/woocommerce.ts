export type WooConfig = Record<string, string>;

export function wooIsConfigured(config: WooConfig) {
  return Boolean(
    config.WOOCOMMERCE_URL &&
    config.WOOCOMMERCE_CONSUMER_KEY &&
    config.WOOCOMMERCE_CONSUMER_SECRET,
  );
}

export function wooRoot(config: WooConfig) {
  return config.WOOCOMMERCE_URL.replace(/\/$/, '');
}

const transientWooStatuses = new Set([429, 502, 503, 504]);

function retryDelay(response: Response, attempt: number) {
  const retryAfter = Number(response.headers.get('retry-after'));
  if (Number.isFinite(retryAfter) && retryAfter > 0)
    return Math.min(retryAfter * 1000, 5000);
  return 350 * 2 ** attempt;
}

export async function wooFetch(
  path: string,
  config: WooConfig,
  init: RequestInit = {},
) {
  const headers = new Headers(init.headers);
  headers.set(
    'authorization',
    `Basic ${btoa(`${config.WOOCOMMERCE_CONSUMER_KEY}:${config.WOOCOMMERCE_CONSUMER_SECRET}`)}`,
  );
  if (!headers.has('accept')) headers.set('accept', 'application/json');
  const request = {
    ...init,
    cache: 'no-store' as const,
    headers,
  };
  const method = (init.method || 'GET').toUpperCase();
  const attempts = method === 'GET' || method === 'HEAD' ? 3 : 1;
  let response: Response | undefined;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    response = await fetch(
      `${wooRoot(config)}/wp-json/wc/v3/${path}`,
      request,
    );
    if (
      !transientWooStatuses.has(response.status) ||
      attempt === attempts - 1
    )
      return response;
    await new Promise((resolve) =>
      setTimeout(resolve, retryDelay(response as Response, attempt)),
    );
  }
  return response as Response;
}

export async function wooResponseJson<T>(response: Response) {
  const text = await response.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error(
      `WooCommerce respondió ${response.status} con un formato no válido.`,
    );
  }
}
