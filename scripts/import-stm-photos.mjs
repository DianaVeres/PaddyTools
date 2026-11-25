import fs from 'node:fs';
import path from 'node:path';

const [source, root, output] = process.argv.slice(2);
const rows = JSON.parse(fs.readFileSync(source, 'utf8'));
const names = new Set(rows.filter((row) => row.section === 'imagenes')
  .map((row) => String(row.data.IMAGEN ?? '').trim())
  .filter((name) => /^[^/\\'\u0000]+\.(jpe?g|png|webp)$/i.test(name)));
let imported = 0;
const out = fs.openSync(output, 'w');
try {
  for (const name of names) {
    const file = ['SMALL/WEB', 'SMALL/M', ''].map((dir) => path.join(root, dir, name))
      .find((candidate) => fs.existsSync(candidate) && fs.statSync(candidate).size <= 2_000_000);
    if (!file) continue;
    const key = `3/${name}`;
    const encoded = fs.readFileSync(file).toString('base64');
    fs.writeSync(out, `DELETE FROM stm_photos WHERE photo_key='${key}';\n`);
    for (let offset = 0; offset < encoded.length; offset += 60000) {
      fs.writeSync(out, `INSERT INTO stm_photos VALUES ('${key}',${offset / 60000},'${encoded.slice(offset, offset + 60000)}');\n`);
    }
    imported++;
  }
} finally {
  fs.closeSync(out);
}
console.log({ referenced: names.size, imported });
