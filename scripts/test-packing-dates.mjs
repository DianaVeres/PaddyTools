import assert from 'node:assert/strict';
import {
  archiveStartDate,
  localIsoDate,
  packingRecordsByWeek,
  packingWeekStart,
} from '../lib/packing-dates.ts';

assert.equal(localIsoDate(new Date(2026, 9, 30, 12)), '2026-10-30');
assert.equal(archiveStartDate(new Date(2026, 9, 30, 12)), '2026-09-04');
assert.equal(packingWeekStart('2026-10-28'), '2026-10-26');
assert.equal(packingWeekStart('2026-10-25'), '2026-10-19');

const record = (id, shippingDate, createdAt) => ({
  id,
  school: 'PRUEBA',
  shippingDate,
  orderYear: 2026,
  orderMonth: 10,
  createdAt,
});
const weeks = packingRecordsByWeek([
  record('old', '2026-10-20', '2026-10-20T09:00:00Z'),
  record('newer', '2026-10-28', '2026-10-28T10:00:00Z'),
  record('newest', '2026-10-28', '2026-10-28T11:00:00Z'),
]);
assert.deepEqual(
  weeks.map((week) => [week.start, week.rows.map((row) => row.id)]),
  [
    ['2026-10-26', ['newest', 'newer']],
    ['2026-10-19', ['old']],
  ],
);

console.log('Fechas y semanas de PackingList verificadas.');
