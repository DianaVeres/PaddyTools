import fs from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx';

const source = process.argv[2] || 'data/stm-articulos.xlsx';
const output = process.argv[3] || 'data/stm-catalog.sql';
const workbook = XLSX.readFile(source);
const rows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '', raw: false });
const clean = (value) => String(value || '').trim();
const normalize = (value) => clean(value).replace(/\s+/g, '').toUpperCase();
const quote = (value) => `'${clean(value).replaceAll("'", "''")}'`;
const entries = new Map();

for (const row of rows) {
  const product = { article: clean(row.Articulo), description: clean(row['Descripción']), color: clean(row.Color), colorDescription: clean(row['Desc. Color']), size: clean(row.Talla) };
  const sourceCodes = [row.Aecoc, row['Cod. Barras'], ...Array.from({ length: 8 }, (_, index) => row[`Cod${index + 1}`])];
  for (const sourceCode of sourceCodes) {
    const exact = normalize(sourceCode);
    if (!exact) continue;
    const aliases = new Set([exact]);
    if (/^\d+$/.test(exact)) {
      const compact = exact.replace(/^0+/, '') || '0';
      aliases.add(compact);
      if (sourceCode === row.Aecoc && compact.length > 6) aliases.add(compact.slice(0, -1));
    }
    for (const code of aliases) if (!entries.has(code)) entries.set(code, { code, sourceCode: exact, ...product });
  }
}

const now = Date.now();
const statements = ['DELETE FROM inventory_catalog;'];
const values = [...entries.values()];
for (let start = 0; start < values.length; start += 250) {
  const batch = values.slice(start, start + 250).map((row) => `(${quote(row.code)},${quote(row.article)},${quote(row.description)},${quote(row.color)},${quote(row.colorDescription)},${quote(row.size)},${quote(row.sourceCode)},${now})`);
  statements.push(`INSERT INTO inventory_catalog (code,article,description,color,color_description,size,source_code,updated_at) VALUES\n${batch.join(',\n')};`);
}
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${statements.join('\n')}\n`, 'utf8');
console.log(`Catálogo preparado: ${rows.length} variantes, ${values.length} códigos.`);
