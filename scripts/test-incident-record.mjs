import assert from 'node:assert/strict';
import {
  formatIncidentDate,
  formatIncidentDateTime,
  incidentLabelLines,
  incidentStatusLabel,
} from '../lib/incident-record.ts';

const incident = {
  id: 'incident-1',
  orderNumber: 'IPA49547',
  customerName: 'Ana María',
  customerEmail: 'ana@example.com',
  customerPhone: '600000000',
  incidentText: 'Prenda equivocada',
  observations: '',
  incidentDate: '2026-10-30T12:00:00.000Z',
  solved: false,
  shippingRequired: true,
  sent: true,
  solvedAt: '',
  updatedAt: '',
  pickupSchool: true,
  pickupSchoolName: 'TEATINAS PINTO WEB',
  pickupDetails: 'BABERO · Talla 8 · 1 unidad',
  pickupReceived: false,
  pickupReceivedAt: '',
  school: 'TEATINAS PINTO',
  recurrenceCount: 0,
  products: [],
};

assert.equal(formatIncidentDate(incident.incidentDate), '30/10/2026');
assert.equal(formatIncidentDate('', 'Sin fecha'), 'Sin fecha');
assert.match(
  formatIncidentDateTime('2026-11-13T09:15:00.000Z'),
  /13\/11\/2026.*10:15/,
);
assert.equal(formatIncidentDateTime('', 'Sin registro'), 'Sin registro');
assert.deepEqual(incidentLabelLines(incident), [
  'INCIDENCIA IPA49547',
  'NOMBRE: Ana María',
  'FECHA: 30/10/2026',
  'RECOGIDA TEATINAS PINTO',
]);
assert.equal(incidentStatusLabel(incident), 'Pendiente · Enviada');
assert.equal(
  incidentStatusLabel({ ...incident, solved: true, sent: false }),
  'Resuelta · Envío pendiente',
);
assert.equal(
  incidentStatusLabel({ ...incident, shippingRequired: false, sent: false }),
  'Pendiente · Sin envío requerido',
);

console.log('Datos imprimibles de incidencias verificados.');
