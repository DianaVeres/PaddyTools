import assert from 'node:assert/strict';
import {
  foldSchoolText,
  matchesSchoolCandidates,
  sameSchoolFolder,
  schoolFolderName,
} from '../lib/school-matching.ts';

assert.equal(foldSchoolText('Purísima Quart'), 'purisimaquart');
assert.equal(sameSchoolFolder('SHACKLETON', 'Shackleton Web'), true);
assert.equal(sameSchoolFolder('TEATINAS PINTO', 'Teatinas Pinto Web'), true);
assert.equal(sameSchoolFolder('TEATINAS PINTO', 'Teatinas Málaga'), false);
assert.equal(
  schoolFolderName(['Shackleton Web', 'SHACKLETON']),
  'SHACKLETON',
);

const schools = [
  'SHACKLETON',
  'TEATINAS PINTO WEB',
  'TEATINAS MALAGA WEB',
  'SAGRADO CORAZON',
];
assert.equal(
  matchesSchoolCandidates('SHACKLETON', ['Uniforme Shackleton'], schools),
  true,
);
assert.equal(
  matchesSchoolCandidates(
    'TEATINAS PINTO',
    ['BABERO TEATINAS', 'Recogida Pinto'],
    schools,
  ),
  true,
);
assert.equal(
  matchesSchoolCandidates(
    'TEATINAS PINTO',
    ['BABERO TEATINAS', 'Recogida Málaga'],
    schools,
  ),
  false,
);
assert.equal(
  matchesSchoolCandidates('SAGRADO CORAZON', ['Colegio S.C.'], schools),
  true,
);

console.log('Comparación de colegios verificada.');
