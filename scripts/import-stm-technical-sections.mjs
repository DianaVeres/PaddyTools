import fs from 'node:fs';
import { createHash } from 'node:crypto';
import XLSX from 'xlsx';

const sourceJson = process.argv[2] || 'data/stm-technical-sections.json';
const articlesXlsx = process.argv[3] || 'data/Articulos.xlsx';
const output = process.argv[4] || 'data/stm-technical-sections.sql';
const rows = JSON.parse(fs.readFileSync(sourceJson, 'utf8'));
const workbook = XLSX.readFile(articlesXlsx, { raw: false });
const articleRows = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]], { defval: '', raw: false });
const clean = (value) => String(value ?? '').trim();
const quote = (value) => `'${clean(value).replaceAll("'", "''")}'`;
const idFor = (...parts) => createHash('sha256').update(parts.join('|')).digest('hex').slice(0, 32);
const allowed = new Set(articleRows.filter((row) => clean(row.TIPO) === '1').map((row) => `${clean(row.TEMPORADA)}|${clean(row.CODIGO)}`));
const importedAt = Date.now();
const counters = new Map();
const values = [];

for (const row of rows) {
  const key = `${clean(row.season)}|${clean(row.article)}`;
  if (!allowed.has(key)) continue;
  const counterKey = `${key}|${clean(row.section)}|${clean(row.sourceTable)}`;
  const rowIndex = (counters.get(counterKey) || 0) + 1;
  counters.set(counterKey, rowIndex);
  const technicalSheetId = idFor(clean(row.season), clean(row.article));
  values.push({
    id: idFor(technicalSheetId, clean(row.section), clean(row.sourceTable), String(rowIndex)),
    technicalSheetId,
    section: clean(row.section),
    sourceTable: clean(row.sourceTable),
    rowIndex,
    dataJson: JSON.stringify(row.data || {}),
  });
}

const statements = ['DELETE FROM stm_technical_sheet_sections;'];
for (const row of values) {
  statements.push(`INSERT INTO stm_technical_sheet_sections (id,technical_sheet_id,section,source_table,row_index,data_json,imported_at) VALUES (${quote(row.id)},${quote(row.technicalSheetId)},${quote(row.section)},${quote(row.sourceTable)},${row.rowIndex},${quote(row.dataJson)},${importedAt});`);
}
fs.writeFileSync(output, `${statements.join('\n')}\n`, 'utf8');
const bySection = values.reduce((acc, row) => ({ ...acc, [row.section]: (acc[row.section] || 0) + 1 }), {});
console.log(`Secciones STM preparadas: ${values.length}. ${JSON.stringify(bySection)}`);
