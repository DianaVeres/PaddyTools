import { forwardToPackingList } from '@/lib/packinglist-service';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const response = await forwardToPackingList(request);
  const from = url.searchParams.get('from')?.slice(0, 10) || '';
  const to = url.searchParams.get('to')?.slice(0, 10) || '';
  // El detalle se devuelve intacto. En el listado, reducimos la respuesta en
  // el servidor para que el navegador no tenga que recibir ni renderizar todo
  // el histórico de Packing Lists.
  if (!response.ok || url.searchParams.has('id') || (!from && !to)) return response;
  try {
    const data = await response.json() as Array<{ shippingDate?: string }>;
    if (!Array.isArray(data)) return Response.json(data, { status: response.status });
    const filtered = data.filter((row) => {
      const date = String(row.shippingDate || '').slice(0, 10);
      return date && (!from || date >= from) && (!to || date <= to);
    });
    return Response.json(filtered, {
      headers: { 'cache-control': 'no-store, no-cache, must-revalidate' },
    });
  } catch {
    return response;
  }
}
export const POST = (request: Request) => forwardToPackingList(request);
export const PUT = (request: Request) => forwardToPackingList(request);
export const DELETE = (request: Request) => forwardToPackingList(request);
