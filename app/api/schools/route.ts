import { NextResponse } from 'next/server';
import { env } from 'cloudflare:workers';

async function woo(path: string, config: Record<string, string>) {
  return fetch(
    `${config.WOOCOMMERCE_URL.replace(/\/$/, '')}/wp-json/wc/v3/${path}`,
    {
      headers: {
        authorization: `Basic ${btoa(`${config.WOOCOMMERCE_CONSUMER_KEY}:${config.WOOCOMMERCE_CONSUMER_SECRET}`)}`,
        accept: 'application/json',
      },
    },
  );
}
export async function GET() {
  const config = env as unknown as Record<string, string>;
  try {
    const roots = await woo(
      'products/categories?search=TODAS&per_page=100',
      config,
    );
    if (!roots.ok) throw new Error(`WooCommerce respondió ${roots.status}`);
    const root = (
      (await roots.json()) as Array<{ id: number; name: string }>
    ).find((item) => item.name.trim().toUpperCase() === 'TODAS');
    if (!root) throw new Error('No se encontró la categoría TODAS');
    const response = await woo(
      `products/categories?parent=${root.id}&per_page=100&hide_empty=true`,
      config,
    );
    if (!response.ok)
      throw new Error(`WooCommerce respondió ${response.status}`);
    const excluded = [
      'BASICOS',
      'BÁSICOS',
      'VARIOS',
      'ACC. PELO',
      'ACCESORIOS',
    ];
    const schools = ((await response.json()) as Array<{ name: string }>)
      .map((item) => item.name.trim())
      .filter(
        (name) =>
          name &&
          !excluded.some((prefix) => name.toUpperCase().startsWith(prefix)),
      )
      .sort((a, b) => a.localeCompare(b, 'es'));
    return NextResponse.json(schools);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'No se pudieron cargar los colegios.',
      },
      { status: 502 },
    );
  }
}
