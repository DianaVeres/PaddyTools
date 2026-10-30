// Reglas comunes para comparar colegios sin que el canal de venta, las tildes
// o abreviaturas creen falsos avisos rojos en PackingList.
export const foldSchoolText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/gi, '')
    .toLowerCase();

const ignoredWords = new Set([
  'colegio',
  'college',
  'school',
  'centro',
  'ceip',
  'cp',
  'web',
  'online',
  'tienda',
  'boarding',
  'de',
  'del',
  'el',
  'la',
  'los',
  'las',
]);

const words = (value: string, minimumLength = 1) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(
      (word) =>
        word.length >= minimumLength && word && !ignoredWords.has(word),
    );

const schoolFolderWords = (value: string) => words(value);
const schoolWords = (value: string) => words(value, 3);

export const sameSchoolFolder = (left: string, right: string) => {
  const leftWords = schoolFolderWords(left);
  const rightWords = schoolFolderWords(right);
  if (!leftWords.length || !rightWords.length)
    return foldSchoolText(left) === foldSchoolText(right);
  if (leftWords.join(' ') === rightWords.join(' ')) return true;
  const [shorter, longer] =
    leftWords.length <= rightWords.length
      ? [leftWords, rightWords]
      : [rightWords, leftWords];
  return (
    shorter.length >= 2 &&
    shorter.every((word, index) => longer[index] === word)
  );
};

export const schoolFolderName = (names: string[]) =>
  [...names].sort((left, right) => {
    const wordDifference =
      schoolFolderWords(left).length - schoolFolderWords(right).length;
    return (
      wordDifference ||
      left.length - right.length ||
      left.localeCompare(right, 'es')
    );
  })[0].trim();

const schoolAcronym = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .split(/[^A-Z0-9]+/)
    .filter((word) => word && !ignoredWords.has(word.toLowerCase()))
    .map((word) => word[0])
    .join('');

export const sameSchool = (expected: string, actual: string) => {
  if (!actual.trim()) return false;
  const expectedFolded = foldSchoolText(expected);
  const actualFolded = foldSchoolText(actual);
  if (
    !expectedFolded ||
    actualFolded.includes(expectedFolded) ||
    expectedFolded.includes(actualFolded)
  )
    return true;
  const expectedWords = schoolWords(expected);
  const actualWords = new Set(schoolWords(actual));
  if (
    expectedWords.length &&
    expectedWords.every((word) => actualWords.has(word))
  )
    return true;
  const compactExpected = expected.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const compactActual = actual.replace(/[^A-Z0-9]/gi, '').toUpperCase();
  const expectedAcronym = schoolAcronym(expected);
  const actualAcronym = schoolAcronym(actual);
  return (
    (expectedAcronym.length >= 2 &&
      actualAcronym.length >= 2 &&
      expectedAcronym === actualAcronym) ||
    (compactExpected.length >= 2 &&
      compactExpected.length <= 6 &&
      actualAcronym.includes(compactExpected)) ||
    (compactActual.length >= 2 &&
      compactActual.length <= 6 &&
      expectedAcronym.includes(compactActual))
  );
};

const rawMatchesSchoolCandidates = (
  expected: string,
  candidates: string[],
) => {
  if (candidates.some((candidate) => sameSchool(expected, candidate)))
    return true;
  const expectedWords = schoolWords(expected);
  const candidateWords = new Set(candidates.flatMap(schoolWords));
  return (
    expectedWords.length > 0 &&
    expectedWords.every((word) => candidateWords.has(word))
  );
};

export const matchesSchoolCandidates = (
  expected: string,
  candidates: string[],
  knownSchools: string[] = [],
) => {
  const detectedSchools = knownSchools.filter((known) =>
    rawMatchesSchoolCandidates(known, candidates),
  );
  if (detectedSchools.length)
    return detectedSchools.some((known) => sameSchoolFolder(expected, known));
  return rawMatchesSchoolCandidates(expected, candidates);
};
