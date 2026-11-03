import assert from 'node:assert/strict';
import { calculateKpiSnapshot } from '../lib/kpi-metrics.ts';

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
});
assert.deepEqual(result, {
  from: '2026-11-01', to: '2026-11-30', packingLists: 3, shippedOrders: 2,
  activeSchools: 2, incidents: 2, solvedIncidents: 1, pendingIncidents: 1,
  pickups: 2, receivedPickups: 1, recurrences: 1, resolutionRate: 50, pickupRate: 50,
});
console.log('Cálculo de indicadores KPI verificado.');
