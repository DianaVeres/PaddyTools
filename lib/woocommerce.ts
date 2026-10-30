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

export function wooFetch(
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
  return fetch(`${wooRoot(config)}/wp-json/wc/v3/${path}`, {
    ...init,
    cache: 'no-store',
    headers,
  });
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
