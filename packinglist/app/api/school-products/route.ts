import { NextRequest, NextResponse } from 'next/server';
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
export async function GET(request: NextRequest) {
  const school = request.nextUrl.searchParams.get('school')?.trim();
  if (!school)
    return NextResponse.json(
      { error: 'Selecciona un colegio.' },
      { status: 400 },
    );
  const config = env as unknown as Record<string, string>;
  try {
    const response = await woo(
      `products/categories?search=${encodeURIComponent(school)}&per_page=100`,
      config,
    );
    if (!response.ok)
      throw new Error(`WooCommerce respondió ${response.status}`);
    const categories = (await response.json()) as Array<{
      id: number;
      name: string;
    }>;
    const wanted = school.toLocaleLowerCase('es');
    const category =
      categories.find(
        (item) => item.name.trim().toLocaleLowerCase('es') === wanted,
      ) ||
      categories.find((item) =>
        item.name.trim().toLocaleLowerCase('es').startsWith(wanted),
      );
    if (!category) throw new Error(`No se encontró el colegio ${school}`);
    const products: Array<{ id: number; name: string; sku: string }> = [];
    for (let page = 1; ; page++) {
      const productResponse = await woo(
        `products?category=${category.id}&status=publish&per_page=100&page=${page}`,
        config,
      );
      if (!productResponse.ok)
        throw new Error(`WooCommerce respondió ${productResponse.status}`);
      const batch = (await productResponse.json()) as Array<{
        id: number;
        name: string;
        sku: string;
      }>;
      products.push(
        ...batch
          .map((item) => ({
            id: item.id,
            name: item.name.trim(),
            sku: item.sku || '',
          }))
          .filter((item) => item.name),
      );
      if (batch.length < 100) break;
    }
    products.sort((a, b) => a.name.localeCompare(b.name, 'es'));
    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'No se pudieron cargar los productos.',
      },
      { status: 502 },
    );
  }
}
