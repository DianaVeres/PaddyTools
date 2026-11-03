import assert from 'node:assert/strict';
import { calculateKpiSnapshot, requiredPeopleForOrders } from '../lib/kpi-metrics.ts';

const result = calculateKpiSnapshot({
  from: '2026-11-01',
  to: '2026-11-30',
  incidents: [
    { incidentDate: '2026-11-02', updatedAt: '', solved: true, pickupSchool: true, pickupReceived: true, recurrenceCount: 1 },
    { incidentDate: '2026-11-03', updatedAt: '', solved: false, pickupSchool: true, pickupReceived: false, recurrenceCount: 0 },
    { incidentDate: '2026-10-20', updatedAt: '', solved: false, pickupSchool: false, pickupReceived: false, recurrenceCount: 4 },
  ],
  packingLists: [
    { shippingDate: '2026-11-02', school: 'TEATINAS' },
    { shippingDate: '2026-11-09', school: 'TEATINAS' },
    { shippingDate: '2026-11-10', school: 'PURISIMA' },
    { shippingDate: '2026-10-10', school: 'FUERA' },
  ],
  packingOrders: [
    { shippingDate: '2026-11-02' },
    { shippingDate: '2026-11-02' },
    { shippingDate: '2026-10-10' },
  ],
  workLogs: [
    { workDate: '2026-11-02', workerEmail: 'ana@paddy.es', workerName: 'Ana', activity: 'preparacion', minutes: 120, orders: 10, products: 30, packingLists: 0 },
    { workDate: '2026-11-02', workerEmail: 'ana@paddy.es', workerName: 'Ana', activity: 'comprobacion', minutes: 30, orders: 10, products: 30, packingLists: 0 },
    { workDate: '2026-11-03', workerEmail: 'rocio@paddy.es', workerName: 'Rocío', activity: 'packing', minutes: 60, orders: 0, products: 0, packingLists: 3 },
    { workDate: '2026-11-03', workerEmail: 'ana@paddy.es', workerName: 'Ana', activity: 'correos', minutes: 5, orders: 0, products: 0, packingLists: 0 },
    { workDate: '2026-10-20', workerEmail: 'fuera@paddy.es', workerName: 'Fuera', activity: 'preparacion', minutes: 999, orders: 1, products: 1, packingLists: 0 },
  ],
});
assert.deepEqual(result, {
  from: '2026-11-01', to: '2026-11-30', packingLists: 3, shippedOrders: 2,
  activeSchools: 2, incidents: 2, solvedIncidents: 1, pendingIncidents: 1,
  pickups: 2, receivedPickups: 1, recurrences: 1, resolutionRate: 50, pickupRate: 50,
  workers: 2, totalTrackedMinutes: 215, preparationMinutesPerOrder: 12,
  preparationMinutesPerProduct: 4, orderWorkMinutesPerOrder: 7.5,
  packingMinutesPerList: 20, replyMinutesPerMessage: 5,
  activityBreakdown: [
    { activity: 'preparacion', minutes: 120, entries: 1 },
    { activity: 'packing', minutes: 60, entries: 1 },
    { activity: 'comprobacion', minutes: 30, entries: 1 },
    { activity: 'correos', minutes: 5, entries: 1 },
  ],
  workerBreakdown: [
    { workerName: 'Ana', minutes: 155, entries: 3, orders: 20, products: 60, packingLists: 0 },
    { workerName: 'Rocío', minutes: 60, entries: 1, orders: 0, products: 0, packingLists: 3 },
  ],
});
assert.equal(requiredPeopleForOrders(100, 8, 7.5), 2);
console.log('Cálculo de indicadores KPI verificado.');
