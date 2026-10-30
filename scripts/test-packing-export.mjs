import assert from 'node:assert/strict';
import {
  buildPackingWorkbook,
  packingWorkbookFileName,
} from '../lib/packing-export.ts';

const order = (orderNumber, customerName = 'Cliente') => ({
  orderNumber,
  customerName,
  orderDate: '2026-10-29',
  phone: '600000000',
  box: 'CAJA 1',
});
const list = {
  school: 'TEATINAS PINTO WEB',
  shippingDate: '2026-10-30',
  orders: [
    order('PA49547', 'Ana & María'),
    order('R10692'),
    order('IPA48944'),
  ],
};
const workbook = buildPackingWorkbook(list);
assert.match(workbook, /ALBARAN PEDIDO ON-LINE/);
assert.match(workbook, /TEATINAS PINTO WEB/);
assert.match(workbook, /30\/10\/2026/);
assert.match(workbook, /PA49547/);
assert.match(workbook, /R10692/);
assert.match(workbook, /IPA48944/);
assert.match(workbook, /Ana &amp; María/);
assert.match(workbook, /on-line/);
assert.match(workbook, /Reserva/);
assert.match(workbook, /Incidencia/);
assert.match(workbook, /\$A\$1:\$H\$18/);
assert.equal(
  packingWorkbookFileName(list),
  'PackingList-TEATINAS-PINTO-WEB-2026-10-30.xls',
);

const longWorkbook = buildPackingWorkbook({
  ...list,
  orders: Array.from({ length: 20 }, (_, index) => order(`PA${index + 1}`)),
});
assert.match(longWorkbook, /\$A\$1:\$H\$24/);
for (let index = 1; index <= 20; index++)
  assert.match(longWorkbook, new RegExp(`PA${index}(?:<|\\D)`));

assert.throws(
  () => buildPackingWorkbook({ ...list, orders: [] }),
  /al menos un pedido/,
);

console.log('Documento Excel de PackingList verificado.');
