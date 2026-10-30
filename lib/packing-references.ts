export type ParsedPackingReference = {
  box: string;
  orderNumber: string;
};

export const packingListType = (number: string) => {
  const reference = number.trim().toUpperCase();
  if (reference.startsWith('PA')) return 'on-line';
  if (reference.startsWith('I')) return 'Incidencia';
  if (reference.startsWith('R')) return 'Reserva';
  return 'on-line';
};

export const normalizePackingReference = (value: string) =>
  value.replace(/\s/g, '').toUpperCase();

export function parsePackingBoxes(text: string) {
  const parsed: ParsedPackingReference[] = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const split = line.indexOf(':');
    const box = (split >= 0 ? line.slice(0, split) : 'SIN CAJA')
      .trim()
      .toUpperCase();
    const numbers =
      (split >= 0 ? line.slice(split + 1) : line).match(
        /\b(?:RPA\s*\d+|PA\s*\d+|R\s*\d+|I[A-Z]*\s*\d[A-Z0-9-]*)\b/gi,
      ) ?? [];
    for (const number of numbers)
      parsed.push({
        box,
        orderNumber: normalizePackingReference(number),
      });
  }
  return parsed;
}

const spokenDigits: Record<string, string> = {
  cero: '0',
  uno: '1',
  una: '1',
  dos: '2',
  tres: '3',
  cuatro: '4',
  cinco: '5',
  seis: '6',
  siete: '7',
  ocho: '8',
  nueve: '9',
};

export function dictatedPackingReferences(value: string) {
  const normalized = value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\b(?:i|y)\s*p(?:e)?\s*a\b|\bipa\b/g, ' IPA ')
    .replace(/\b(?:i|y)\s*(?:ene|n)\b|\bin\b/g, ' IN ')
    .replace(/\b(?:pe|p)\s+a\b/g, ' PA ')
    .replace(/\bpa\b/g, ' PA ')
    .replace(/\breservas?\b|\berre\b/g, ' R ')
    .replace(/\bincidencias?\b/g, ' I ')
    .replace(/\bI\s+PA\b/g, ' IPA ')
    .replace(/\bR\s+PA\b/g, ' RPA ')
    .replace(
      /\b(cero|uno|una|dos|tres|cuatro|cinco|seis|siete|ocho|nueve)\b/g,
      (word) => spokenDigits[word] || word,
    )
    .replace(/\bnumero\b|\bcodigo\b|\bpedido\b|\bcoma\b/g, ' ')
    .toUpperCase();
  const references = (segment: string) =>
    [...segment.matchAll(/\b(RPA|IPA|IN|PA|R|I)\s*((?:\d[\s-]*)+)/g)].map(
      (match) =>
        normalizePackingReference(
          `${match[1]}${match[2].replace(/\D/g, '')}`,
        ),
    );
  const lines: string[] = [];
  for (const match of normalized.matchAll(
    /CAJA\s*(\d+)([\s\S]*?)(?=CAJA\s*\d+|$)/g,
  )) {
    const codes = references(match[2]);
    if (codes.length) lines.push(`CAJA ${match[1]}: ${codes.join(', ')}`);
  }
  return { lines, references: references(normalized) };
}

export function mergePackingDictation(current: string, transcript: string) {
  const dictated = dictatedPackingReferences(transcript);
  const lines = current
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (dictated.lines.length) {
    for (const dictatedLine of dictated.lines) {
      const label = dictatedLine.slice(0, dictatedLine.indexOf(':')).trim();
      const newCodes = dictatedLine
        .slice(dictatedLine.indexOf(':') + 1)
        .trim();
      const existingIndex = lines.findIndex(
        (line) =>
          line.slice(0, line.indexOf(':')).trim().toUpperCase() === label,
      );
      if (existingIndex >= 0) {
        const existingCodes = lines[existingIndex]
          .slice(lines[existingIndex].indexOf(':') + 1)
          .trim();
        lines[existingIndex] = `${label}: ${[existingCodes, newCodes]
          .filter(Boolean)
          .join(', ')}`;
      } else {
        lines.push(dictatedLine);
      }
    }
  } else if (dictated.references.length) {
    if (!lines.length) lines.push('CAJA 1:');
    const last = lines.length - 1;
    const separator = lines[last].endsWith(':') ? ' ' : ', ';
    lines[last] += `${separator}${dictated.references.join(', ')}`;
  }
  return { text: lines.join('\n'), count: dictated.references.length };
}
