import assert from 'node:assert/strict';
import {
  formatIncidentDate,
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
assert.deepEqual(incidentLabelLines(incident), [
  'INCIDENCIA IPA49547',
  'NOMBRE: Ana María',
  'FECHA: 30/10/2026',
  'RECOGIDA TEATINAS PINTO',
]);
assert.equal(incidentStatusLabel(incident), 'Pendiente · Enviada');
assert.equal(
  incidentStatusLabel({ ...incident, solved: true, sent: false }),
  'Resuelta · No enviada',
);

console.log('Datos imprimibles de incidencias verificados.');
