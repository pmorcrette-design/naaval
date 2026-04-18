import type { ProofOfDelivery, RoutePlan, RouteStop } from "@lmd/domain";
import type { CarrierHeartbeatRequest, SubmitProofRequest } from "@lmd/contracts";

export type CarrierRouteView = {
  route: RoutePlan;
  nextStop?: RouteStop;
  pendingStops: number;
};

export function buildCarrierRouteView(route: RoutePlan): CarrierRouteView {
  const nextStop = route.stops.find((stop) => stop.status === "pending");

  return {
    route,
    nextStop,
    pendingStops: route.stops.filter((stop) => stop.status === "pending").length
  };
}

export function mapProofRequest(stopId: string, request: SubmitProofRequest): ProofOfDelivery {
  return {
    stopId,
    deliveredAt: request.deliveredAt,
    recipientName: request.recipientName,
    signatureImageUrl: request.signatureImageUrl,
    photoUrls: request.photoUrls,
    otpCode: request.otpCode,
    failureReasonCode: request.failureReasonCode,
    note: request.note
  };
}

export function normalizeHeartbeat(input: CarrierHeartbeatRequest) {
  return {
    driverId: input.driverId,
    routeId: input.routeId,
    coordinates: {
      lat: input.latitude,
      lon: input.longitude
    },
    occurredAt: input.occurredAt
  };
}
