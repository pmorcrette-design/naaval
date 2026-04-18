import type { DeliveryOrder, DriverShift, PlanningContext, RoutePlan, RouteStop, VehicleType } from "@lmd/domain";
import type { OptimizePlanRequest } from "@lmd/contracts";
import type { GraphHopperSolution } from "./graphhopper.types";
import { buildVrpPayload } from "./build-vrp-payload";

type PlanningDependencies = {
  fetchOrders(orderIds: string[]): Promise<DeliveryOrder[]>;
  fetchShifts(shiftIds: string[]): Promise<DriverShift[]>;
  fetchVehicleTypes(): Promise<VehicleType[]>;
  submitOptimization(problem: unknown): Promise<{ externalJobId?: string }>;
  persistDraftPlan(routePlans: RoutePlan[]): Promise<void>;
};

export class PlanningService {
  constructor(private readonly deps: PlanningDependencies) {}

  async launchOptimization(request: OptimizePlanRequest) {
    const [orders, shifts, vehicleTypes] = await Promise.all([
      this.deps.fetchOrders(request.orderIds),
      this.deps.fetchShifts(request.driverShiftIds),
      this.deps.fetchVehicleTypes()
    ]);

    const context: PlanningContext = {
      hubId: request.hubId,
      planDate: request.planDate,
      orders,
      shifts,
      vehicleTypes
    };

    const problem = buildVrpPayload(context, request.objectivePreset);
    const result = await this.deps.submitOptimization(problem);

    return {
      planningJobId: `planjob_${request.planDate}_${request.hubId}`,
      externalJobId: result.externalJobId
    };
  }

  async persistSolution(solution: GraphHopperSolution, shifts: DriverShift[]) {
    if (!solution.solution) {
      return;
    }

    const routePlans: RoutePlan[] = solution.solution.routes.map((route) => {
      const shift = shifts.find((candidate) => candidate.id === route.vehicle_id);

      if (!shift) {
        throw new Error(`Unknown shift for route ${route.vehicle_id}`);
      }

      const stops: RouteStop[] = route.activities
        .filter((activity) => activity.type !== "start" && activity.type !== "end")
        .map((activity, index) => ({
          id: activity.id ?? `${shift.id}_stop_${index + 1}`,
          orderId: activity.id,
          sequence: index + 1,
          kind: mapActivityKind(activity.type),
          address: {
            label: activity.address?.location_id ?? "planned stop",
            street1: "To be enriched from canonical order data",
            city: "Unknown",
            postalCode: "Unknown",
            countryCode: "XX",
            coordinates:
              activity.address?.lat !== undefined && activity.address?.lon !== undefined
                ? { lat: activity.address.lat, lon: activity.address.lon }
                : undefined
          },
          plannedArrivalAt: activity.arr_time !== undefined
            ? new Date(activity.arr_time * 1000).toISOString()
            : undefined,
          plannedDepartureAt: activity.end_time !== undefined
            ? new Date(activity.end_time * 1000).toISOString()
            : undefined,
          status: "pending"
        }));

      return {
        id: `route_${shift.id}`,
        shiftId: shift.id,
        driverId: shift.driverId,
        vehicleId: shift.vehicleId,
        status: "ready",
        totalDistanceMeters: route.distance,
        totalDurationSeconds: route.completion_time,
        stops
      };
    });

    await this.deps.persistDraftPlan(routePlans);
  }
}

function mapActivityKind(activityType: string): RouteStop["kind"] {
  if (activityType === "pickup" || activityType === "pickupShipment") {
    return "pickup";
  }

  if (activityType === "break") {
    return "break";
  }

  return "delivery";
}

