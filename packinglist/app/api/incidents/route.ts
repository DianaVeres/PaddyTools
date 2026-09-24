import { NextRequest, NextResponse } from 'next/server';
import { env } from 'cloudflare:workers';

const DEFAULT_INCIDENTS_APP_URL =
  'https://incidencias-production-00a0.up.railway.app';

const textValue = (value: unknown) =>
  typeof value === 'string' || typeof value === 'number' ? String(value) : '';

const incidentReferences = (number: string) => {
  const reference = number.trim().toUpperCase();
  const linkedOrder = reference.match(/^(?:I|R)?PA(.+)$/);
  return linkedOrder
    ? [`IPA${linkedOrder[1]}`, `PA${linkedOrder[1]}`]
    : [reference];
};

function mappedIncident(row: Record<string, unknown>, fallback: string) {
  let products: unknown[] = [];
  try { products = JSON.parse(textValue(row.products_json) || '[]'); } catch { products = []; }
  return {
    orderNumber: textValue(row.order_number) || fallback,
    customerName: textValue(row.customer_name),
    customerEmail: textValue(row.customer_email),
    customerPhone: textValue(row.customer_phone),
    incidentText: textValue(row.incident_text),
    incidentDate: textValue(row.incident_date) || textValue(row.created_at),
    solved: Boolean(Number(row.solved)),
    solvedAt: textValue(row.solved_at),
    updatedAt: textValue(row.updated_at),
    pickupSchool: Boolean(Number(row.pickup_school)),
    pickupSchoolName: textValue(row.pickup_school_name),
    pickupDetails: textValue(row.pickup_details),
    pickupReceived: Boolean(Number(row.pickup_received)),
    school: textValue(row.incident_school_name),
    recurrenceCount: Number(row.recurrence_count || 0),
    products,
  };
}

export async function GET(request: NextRequest) {
  const number = request.nextUrl.searchParams.get('number')?.trim().replace(/^#/, '');
  if (!number) return NextResponse.json({ error: 'Introduce un número de pedido.' }, { status: 400 });
  const config = env as unknown as Record<string, string>;
  if (config.GESTION_UNIFICADA_URL && config.GESTION_UNIFICADA_TOKEN) {
    try {
      const url = new URL('/api/incidents', config.GESTION_UNIFICADA_URL);
      url.searchParams.set('number', number);
      let lastStatus = 502;
      for (let attempt = 0; attempt < 3; attempt += 1) {
        url.searchParams.set('_attempt', String(attempt + 1));
        const response = await fetch(url, {
          headers: {
            accept: 'application/json',
            'OAI-Sites-Authorization': `Bearer ${config.GESTION_UNIFICADA_TOKEN}`,
          },
          redirect: 'follow',
        });
        lastStatus = response.status;
        if (response.ok) return NextResponse.json(await response.json());
      }
      throw new Error(`Gestión Unificada respondió ${lastStatus} después de 3 intentos`);
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? `No se pudo consultar Gestión Unificada: ${error.message}` : 'No se pudo consultar Gestión Unificada.' }, { status: 502 });
    }
  }
  if (!config.INCIDENTS_SYNC_URL || !config.INCIDENTS_SYNC_TOKEN) {
    try {
      const references = incidentReferences(number);
      for (const reference of references) {
        const url = new URL('/api/incidents', config.INCIDENTS_APP_URL || DEFAULT_INCIDENTS_APP_URL);
        url.searchParams.set('q', reference);
        const response = await fetch(url, {
          headers: { accept: 'application/json' },
          redirect: 'follow',
          signal: AbortSignal.timeout(55_000),
        });
        if (!response.ok) throw new Error(`el registro respondió ${response.status}`);
        const rows = await response.json() as Record<string, unknown>[];
        const expected = references.map((value) => value.toUpperCase());
        const exact = rows.find((row) =>
          expected.includes(textValue(row.order_number).trim().toUpperCase()),
        );
        if (exact)
          return NextResponse.json({ found: true, incident: mappedIncident(exact, number) });
      }
      return NextResponse.json({ found: false, incident: null });
    } catch (error) {
      return NextResponse.json({
        error: error instanceof Error
          ? `No se pudo consultar incidencias: ${error.message}`
          : 'No se pudo consultar incidencias.',
      }, { status: 502 });
    }
  }
  try {
    const url = new URL(config.INCIDENTS_SYNC_URL);
    url.searchParams.set('action', 'get');
    url.searchParams.set('token', config.INCIDENTS_SYNC_TOKEN);
    url.searchParams.set('order_number', number);
    const response = await fetch(url, { headers: { accept: 'application/json' }, redirect: 'follow' });
    if (!response.ok) throw new Error(`el registro respondió ${response.status}`);
    const data = await response.json() as { ok?: boolean; row?: Record<string, unknown>; error?: string };
    if (!data.ok) throw new Error(data.error || 'respuesta no válida');
    if (!data.row) return NextResponse.json({ found: false, incident: null });
    const row = data.row;
    let products: unknown[] = [];
    try { products = JSON.parse(String(row.products_json || '[]')); } catch { products = []; }
    return NextResponse.json({ found: true, incident: {
      orderNumber: String(row.order_number || number), customerName: String(row.customer_name || ''), customerEmail: String(row.customer_email || ''), customerPhone: String(row.customer_phone || ''),
      incidentText: String(row.incident_text || ''), incidentDate: String(row.incident_date || row.created_at || ''), solved: Boolean(Number(row.solved)), solvedAt: String(row.solved_at || ''), updatedAt: String(row.updated_at || ''),
      pickupSchool: Boolean(Number(row.pickup_school)), pickupSchoolName: String(row.pickup_school_name || ''), pickupDetails: String(row.pickup_details || ''), pickupReceived: Boolean(Number(row.pickup_received)),
      school: String(row.incident_school_name || ''), recurrenceCount: Number(row.recurrence_count || 0), products,
    }});
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? `No se pudo consultar incidencias: ${error.message}` : 'No se pudo consultar incidencias.' }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const config = env as unknown as Record<string, string>;
  if (!config.INCIDENTS_SYNC_URL || !config.INCIDENTS_SYNC_TOKEN) return NextResponse.json({ error: 'El registro de incidencias todavía no está configurado.' }, { status: 503 });
  try {
    const record = await request.json() as Record<string, unknown>;
    if (!String(record.order_number || '').trim()) return NextResponse.json({ error: 'Falta el número de pedido.' }, { status: 400 });
    if (!String(record.incident_school_name || '').trim()) return NextResponse.json({ error: 'Selecciona el colegio de la incidencia.' }, { status: 400 });
    if (!String(record.incident_text || '').trim()) return NextResponse.json({ error: 'Describe la incidencia antes de guardar.' }, { status: 400 });
    const response = await fetch(config.INCIDENTS_SYNC_URL, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({action:'save',token:config.INCIDENTS_SYNC_TOKEN,record}), redirect:'follow' });
    if (!response.ok) throw new Error(`el registro respondió ${response.status}`);
    const data = await response.json() as {ok?:boolean;row?:Record<string,unknown>;error?:string};
    if (!data.ok) throw new Error(data.error || 'respuesta no válida');
    return NextResponse.json({ok:true,row:data.row || record});
  } catch(error) { return NextResponse.json({error:error instanceof Error?`No se pudo guardar la incidencia: ${error.message}`:'No se pudo guardar la incidencia.'},{status:502}); }
}
