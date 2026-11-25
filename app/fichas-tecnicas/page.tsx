'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ClipboardList, FileImage, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import './technical-sheets.css';

type SheetSummary = {
  id: string;
  season: string;
  code: string;
  description: string;
  familyDescription: string;
  collectionDescription: string;
  sizes: string;
};

type SheetColor = {
  id: string;
  position: number;
  colorCode: string;
  colorDescription: string;
  impactType: string;
  applicationType: string;
  rate: string;
};

type TechnicalSheet = SheetSummary & {
  internalDescription: string;
  articleType: string;
  familyCode: string;
  compositionCode: string;
  compositionDescription: string;
  garmentType: string;
  collectionCode: string;
  barcodeBase: string;
  supplier1Code: string;
  supplier1Name: string;
  supplier1Reference: string;
  supplier2Code: string;
  supplier2Name: string;
  supplier2Reference: string;
  notes: string;
  imagesJson: string;
  washSymbols: string;
  rawJson: string;
  sourceFile: string;
  sourceModifiedAt: number;
  importedAt: number;
  colors: SheetColor[];
};

const fieldLabels: Record<string, string> = {
  FECHA_CREACION: 'Fecha de creación',
  GRUPO_TALLAS: 'Grupo de tallas',
  GRUPO_LARGOS: 'Grupo de largos',
  SUBTEMPORADA: 'Subtemporada',
  PIEZAS: 'N.º de piezas',
  PACK: 'Pack',
  STOCK_PACK: 'Stock pack',
  PRESENTACION: 'Presentación',
  CLASIFICACION: 'Clasificación',
  ROYALTIES: 'Royalties',
  PAR_ARANCELARIA: 'Partida arancelaria',
  PESO: 'Peso',
  UBICACION: 'Ubicación',
  STOCK_MINIMO: 'Stock mínimo',
  DESCRIPCION_CORTA: 'Descripción corta',
  DESCRIPCION_LARGA: 'Descripción larga',
  FECHA_PREVISTA: 'Fecha prevista',
  ENVIAR_B2B: 'Enviar B2B',
  ENVIAR_TIENDA: 'Enviar a tienda',
  ENVIAR_REPRESENTANTE: 'Enviar a representante',
  ENVIAR_B2C: 'Enviar B2C',
  C1: 'Coste 1', C2: 'Coste 2', C3: 'Coste 3', C4: 'Coste 4',
  'C1-02': 'Coste 1-02', 'C2-02': 'Coste 2-02', 'C3-02': 'Coste 3-02',
};

const normalizedFields = new Set([
  'TIPO', 'TEMPORADA', 'CODIGO', 'TIPO_ART', 'DESCRIPCION', 'DESC_INTERNA',
  'TALLAS', 'FAMILIA', 'DESC_FAMILIA', 'COMPOSICION', 'DESC_COMPOSICION',
  'TIPO_PRENDA', 'COLECCION', 'DESC_COLECCION', 'BASE_COD_BARRAS', 'NOTAS',
  'Proveedor1', 'Nombre Proveedor1', 'Ref. Proveedor1', 'Proveedor2',
  'Nombre Proveedor2', 'Ref. Proveedor2', 'Simbolos Lavado', '_STM_FILAS_RELACIONADAS',
  ...Array.from({ length: 6 }, (_, index) => `Imagen${index + 1}`),
  ...Array.from({ length: 18 }, (_, index) => String(index + 1).padStart(2, '0')).flatMap((suffix) => [
    `Color${suffix}`, `DesColor${suffix}`, `TipoImpacto${suffix}`, `TipoAplicacion${suffix}`, `Tarifa${suffix}`,
  ]),
]);

async function readJson<T>(response: Response) {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error || 'No se pudo consultar la base de STM.');
  return data;
}

function parseObject(value: string) {
  try { return JSON.parse(value) as Record<string, unknown>; } catch { return {}; }
}

export default function TechnicalSheetsPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SheetSummary[]>([]);
  const [sheet, setSheet] = useState<TechnicalSheet | null>(null);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState('');

  async function search(value = query) {
    setLoading(true); setNotice(''); setSheet(null);
    try {
      const data = await readJson<{ sheets: SheetSummary[]; truncated: boolean }>(
        await fetch(`/api/technical-sheets?q=${encodeURIComponent(value.trim())}`, { cache: 'no-store' }),
      );
      setResults(data.sheets);
      if (!data.sheets.length) setNotice('No se ha encontrado ninguna ficha con ese código o descripción.');
      else if (data.truncated) setNotice('Se muestran los primeros 100 resultados. Escribe más datos para concretar.');
    } catch (error) { setNotice(error instanceof Error ? error.message : 'No se pudo realizar la búsqueda.'); }
    finally { setLoading(false); }
  }

  async function openSheet(code: string) {
    setLoading(true); setNotice('');
    try {
      const data = await readJson<{ sheet: TechnicalSheet }>(
        await fetch(`/api/technical-sheets?code=${encodeURIComponent(code)}`, { cache: 'no-store' }),
      );
      setSheet(data.sheet);
    } catch (error) { setNotice(error instanceof Error ? error.message : 'No se pudo abrir la ficha.'); }
    finally { setLoading(false); }
  }

  useEffect(() => { void search(''); }, []);
  const images = useMemo(() => {
    if (!sheet) return [];
    try { return JSON.parse(sheet.imagesJson) as string[]; } catch { return []; }
  }, [sheet]);
  const extraFields = useMemo(() => {
    if (!sheet) return [];
    const raw = parseObject(sheet.rawJson);
    return Object.entries(raw).filter(([key, value]) => !normalizedFields.has(key) && value !== '' && value !== null && value !== undefined);
  }, [sheet]);

  function submit(event: FormEvent) { event.preventDefault(); void search(); }

  return <main className="technical-page">
    <header className="technical-header">
      <a href="/"><ArrowLeft /> PaddyTools</a>
      <div><ClipboardList /><span><b>Fichas técnicas</b><small>Base de datos STM</small></span></div>
    </header>
    <section className="technical-shell">
      <div className="technical-title"><p>ARTÍCULOS STM</p><h1>Fichas técnicas</h1><span>Busca por código o por descripción del artículo.</span></div>
      <form className="technical-search" onSubmit={submit}><Search /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ej. 1009 o vestido invierno" autoFocus /><Button disabled={loading}>Buscar</Button></form>
      {notice && <p className="technical-notice">{notice}</p>}
      {sheet ? <section className="technical-detail">
        <div className="technical-detail-heading"><div><p>FICHA STM · TEMPORADA {sheet.season || '—'}</p><h2>{sheet.code} · {sheet.description}</h2></div><button onClick={() => setSheet(null)} aria-label="Cerrar ficha"><X /></button></div>
        <div className="technical-grid">
          <article><h3>Artículo</h3><dl><div><dt>Descripción interna</dt><dd>{sheet.internalDescription || '—'}</dd></div><div><dt>Tipo</dt><dd>{sheet.articleType || '—'}</dd></div><div><dt>Tallas</dt><dd>{sheet.sizes || '—'}</dd></div><div><dt>Tipo de prenda</dt><dd>{sheet.garmentType || '—'}</dd></div><div><dt>Base código de barras</dt><dd>{sheet.barcodeBase || '—'}</dd></div></dl></article>
          <article><h3>Clasificación</h3><dl><div><dt>Familia</dt><dd>{[sheet.familyCode, sheet.familyDescription].filter(Boolean).join(' · ') || '—'}</dd></div><div><dt>Colección</dt><dd>{[sheet.collectionCode, sheet.collectionDescription].filter(Boolean).join(' · ') || '—'}</dd></div><div><dt>Composición</dt><dd>{[sheet.compositionCode, sheet.compositionDescription].filter(Boolean).join(' · ') || '—'}</dd></div><div><dt>Símbolos de lavado</dt><dd>{sheet.washSymbols || '—'}</dd></div></dl></article>
          <article><h3>Proveedores</h3><dl><div><dt>Proveedor 1</dt><dd>{[sheet.supplier1Code, sheet.supplier1Name, sheet.supplier1Reference].filter(Boolean).join(' · ') || '—'}</dd></div><div><dt>Proveedor 2</dt><dd>{[sheet.supplier2Code, sheet.supplier2Name, sheet.supplier2Reference].filter(Boolean).join(' · ') || '—'}</dd></div></dl></article>
          <article><h3>Notas</h3><p className="technical-notes">{sheet.notes || 'Sin observaciones.'}</p></article>
        </div>
        {!!sheet.colors.length && <article className="technical-table-card"><h3>Colores y tarifas</h3><div className="technical-table-wrap"><table><thead><tr><th>Código</th><th>Color</th><th>Impacto</th><th>Aplicación</th><th>Tarifa</th></tr></thead><tbody>{sheet.colors.map((color) => <tr key={color.id}><td>{color.colorCode || '—'}</td><td>{color.colorDescription || '—'}</td><td>{color.impactType || '—'}</td><td>{color.applicationType || '—'}</td><td>{color.rate || '—'}</td></tr>)}</tbody></table></div></article>}
        {!!images.length && <article className="technical-files"><h3>Imágenes registradas en STM</h3>{images.map((name) => <span key={name}><FileImage /> {name}</span>)}</article>}
        {!!extraFields.length && <article className="technical-extra"><h3>Resto de la información STM</h3><dl>{extraFields.map(([key, value]) => <div key={key}><dt>{fieldLabels[key] || key.replaceAll('_', ' ')}</dt><dd>{String(value)}</dd></div>)}</dl></article>}
        <footer>Origen: {sheet.sourceFile} · Actualizado en la base el {new Date(sheet.importedAt).toLocaleString('es-ES')}</footer>
      </section> : <section className="technical-results"><h2>{loading ? 'Consultando STM…' : `${results.length} fichas`}</h2>{results.map((item) => <button key={item.id} onClick={() => void openSheet(item.code)}><span><b>{item.code} · {item.description}</b><small>{[item.familyDescription, item.collectionDescription].filter(Boolean).join(' · ') || 'Sin clasificación'}{item.sizes ? ` · Tallas ${item.sizes}` : ''}</small></span><em>Ver ficha</em></button>)}</section>}
    </section>
  </main>;
}
