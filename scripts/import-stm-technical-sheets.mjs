import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import XLSX from 'xlsx';

const source = process.argv[2] || 'data/Articulos.xlsx';
const output = process.argv[3] || 'data/stm-technical-sheets.sql';
const workbook = XLSX.readFile(source, { cellDates: false, raw: false });
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
const sourceStats = fs.statSync(source);
const importedAt = Date.now();
const sourceModifiedAt = sourceStats.mtimeMs;
const sourceFile = path.basename(source);

const clean = (value) => String(value ?? '').trim();
const quote = (value) => `'${clean(value).replaceAll("'", "''")}'`;
const json = (value) => quote(JSON.stringify(value));
const idFor = (...parts) => createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 32);

const groupedRows = new Map();
for (const row of rows) {
  const season = clean(row.TEMPORADA);
  const code = clean(row.CODIGO);
  if (!code) continue;
  const key = `${season}|${code}`;
  const group = groupedRows.get(key) || [];
  group.push(row);
  groupedRows.set(key, group);
}

const sheets = [];
const colors = [];
for (const relatedRows of groupedRows.values()) {
  const row = relatedRows.find((candidate) => clean(candidate.TIPO) === '1') || relatedRows[0];
  const season = clean(row.TEMPORADA);
  const code = clean(row.CODIGO);
  const id = idFor(season, code);
  const images = Array.from({ length: 6 }, (_, index) => clean(row[`Imagen${index + 1}`])).filter(Boolean);
  sheets.push({
    id,
    season,
    code,
    description: clean(row.DESCRIPCION),
    internalDescription: clean(row.DESC_INTERNA),
    articleType: clean(row.TIPO_ART),
    sizes: clean(row.TALLAS),
    familyCode: clean(row.FAMILIA),
    familyDescription: clean(row.DESC_FAMILIA),
    compositionCode: clean(row.COMPOSICION),
    compositionDescription: clean(row.DESC_COMPOSICION),
    garmentType: clean(row.TIPO_PRENDA),
    collectionCode: clean(row.COLECCION),
    collectionDescription: clean(row.DESC_COLECCION),
    barcodeBase: clean(row.BASE_COD_BARRAS),
    supplier1Code: clean(row.Proveedor1),
    supplier1Name: clean(row['Nombre Proveedor1']),
    supplier1Reference: clean(row['Ref. Proveedor1']),
    supplier2Code: clean(row.Proveedor2),
    supplier2Name: clean(row['Nombre Proveedor2']),
    supplier2Reference: clean(row['Ref. Proveedor2']),
    notes: clean(row.NOTAS),
    images,
    washSymbols: clean(row['Simbolos Lavado']),
    raw: relatedRows.length === 1 ? row : { ...row, _STM_FILAS_RELACIONADAS: relatedRows.slice(1) },
  });
  for (let position = 1; position <= 18; position += 1) {
    const suffix = String(position).padStart(2, '0');
    const colorCode = clean(row[`Color${suffix}`]);
    const colorDescription = clean(row[`DesColor${suffix}`]);
    const impactType = clean(row[`TipoImpacto${suffix}`]);
    const applicationType = clean(row[`TipoAplicacion${suffix}`]);
    const rate = clean(row[`Tarifa${suffix}`]);
    if (!colorCode && !colorDescription && !impactType && !applicationType && !rate) continue;
    colors.push({ id: idFor(id, String(position)), technicalSheetId: id, position, colorCode, colorDescription, impactType, applicationType, rate });
  }
}

const statements = [
  'DELETE FROM stm_technical_sheet_colors;',
  'DELETE FROM stm_technical_sheets;',
];
// raw_json puede contener descripciones e imágenes extensas. Una ficha por
// sentencia evita superar el límite de tamaño de sentencia de Cloudflare D1.
for (let start = 0; start < sheets.length; start += 1) {
  const batch = sheets.slice(start, start + 1).map((row) => `(${[
    quote(row.id), quote(row.season), quote(row.code), quote(row.description), quote(row.internalDescription), quote(row.articleType), quote(row.sizes), quote(row.familyCode), quote(row.familyDescription), quote(row.compositionCode), quote(row.compositionDescription), quote(row.garmentType), quote(row.collectionCode), quote(row.collectionDescription), quote(row.barcodeBase), quote(row.supplier1Code), quote(row.supplier1Name), quote(row.supplier1Reference), quote(row.supplier2Code), quote(row.supplier2Name), quote(row.supplier2Reference), quote(row.notes), json(row.images), quote(row.washSymbols), json(row.raw), quote(sourceFile), Math.round(sourceModifiedAt), importedAt,
  ].join(',')})`);
  statements.push(`INSERT INTO stm_technical_sheets (id,season,code,description,internal_description,article_type,sizes,family_code,family_description,composition_code,composition_description,garment_type,collection_code,collection_description,barcode_base,supplier1_code,supplier1_name,supplier1_reference,supplier2_code,supplier2_name,supplier2_reference,notes,images_json,wash_symbols,raw_json,source_file,source_modified_at,imported_at) VALUES\n${batch.join(',\n')};`);
}
for (let start = 0; start < colors.length; start += 100) {
  const batch = colors.slice(start, start + 100).map((row) => `(${quote(row.id)},${quote(row.technicalSheetId)},${row.position},${quote(row.colorCode)},${quote(row.colorDescription)},${quote(row.impactType)},${quote(row.applicationType)},${quote(row.rate)})`);
  statements.push(`INSERT INTO stm_technical_sheet_colors (id,technical_sheet_id,position,color_code,color_description,impact_type,application_type,rate) VALUES\n${batch.join(',\n')};`);
}
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${statements.join('\n')}\n`, 'utf8');
console.log(`Fichas STM preparadas: ${sheets.length}; colores: ${colors.length}; columnas conservadas: ${Object.keys(rows[0] || {}).length}.`);
