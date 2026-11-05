export type IncidentResolutionInput = {
  pickupRequired: boolean;
  pickupReceived: boolean;
  shippingRequired: boolean;
  sent: boolean;
};

export const incidentHasAutomaticResolution = (
  state: IncidentResolutionInput,
) => state.pickupRequired || state.shippingRequired;

export function automaticIncidentSolved(state: IncidentResolutionInput) {
  if (!incidentHasAutomaticResolution(state)) return false;
  return (
    (!state.pickupRequired || state.pickupReceived) &&
    (!state.shippingRequired || state.sent)
  );
}

export function resolvedIncidentState(
  state: IncidentResolutionInput,
  requestedSolved: boolean,
) {
  return incidentHasAutomaticResolution(state)
    ? automaticIncidentSolved(state)
    : requestedSolved;
}

export function incidentResolutionFromRecord(
  record: Record<string, unknown>,
): IncidentResolutionInput {
  return {
    pickupRequired: Boolean(Number(record.pickup_school)),
    pickupReceived: Boolean(Number(record.pickup_received)),
    shippingRequired: Boolean(Number(record.shipping_required)),
    sent: Boolean(Number(record.sent)),
  };
}
