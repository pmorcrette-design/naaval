import {
  capacityVectorToArray,
  coordinatesToAddress,
  type DeliveryOrder,
  type DriverShift,
  type GraphHopperProblem,
  type GraphHopperService,
  type GraphHopperShipment,
  type GraphHopperVehicle,
  type GraphHopperVehicleType,
  type ObjectivePreset,
  type PlanningContext,
  type RouteObjective,
  type VehicleType
} from "@lmd/domain";

function toEpochSeconds(value: string): number {
  return Math.floor(new Date(value).getTime() / 1000);
}

function buildObjectives(preset: ObjectivePreset): RouteObjective[] {
  if (preset === "fleet_min") {
    return [
      { type: "min", value: "vehicles" },
      { type: "min", value: "completion_time" }
    ];
  }

  if (preset === "speed") {
    return [
      { type: "min", value: "completion_time" },
      { type: "min", value: "transport_time" }
    ];
  }

  return [
    { type: "min", value: "vehicles" },
    { type: "min", value: "completion_time" },
    { type: "min", value: "transport_time" }
  ];
}

function buildVehicleTypes(vehicleTypes: VehicleType[]): GraphHopperVehicleType[] {
  return vehicleTypes.map((vehicleType) => ({
    type_id: vehicleType.id,
    profile: vehicleType.routingProfile,
    capacity: capacityVectorToArray(vehicleType.capacity)
  }));
}

function buildVehicles(shifts: DriverShift[]): GraphHopperVehicle[] {
  return shifts.map((shift) => ({
    vehicle_id: shift.id,
    type_id: shift.vehicleTypeId,
    start_address: coordinatesToAddress(`shift:${shift.id}:start`, shift.startCoordinates),
    end_address: shift.endCoordinates
      ? coordinatesToAddress(`shift:${shift.id}:end`, shift.endCoordinates)
      : undefined,
    earliest_start: toEpochSeconds(shift.startAt),
    latest_end: toEpochSeconds(shift.endAt),
    skills: shift.skills
  }));
}

function buildService(order: DeliveryOrder): GraphHopperService {
  const coordinates = order.dropoffAddress.coordinates;

  if (!coordinates) {
    throw new Error(`Order ${order.id} is missing dropoff coordinates`);
  }

  return {
    id: order.id,
    name: order.reference,
    address: coordinatesToAddress(`order:${order.id}:dropoff`, coordinates),
    duration: order.serviceDurationSeconds,
    size: capacityVectorToArray(order.capacity),
    required_skills: order.requiredSkills,
    time_windows: order.timeWindows.map((window) => ({
      earliest: toEpochSeconds(window.start),
      latest: toEpochSeconds(window.end)
    })),
    priority: order.priority
  };
}

function buildShipment(order: DeliveryOrder): GraphHopperShipment {
  const pickupCoordinates = order.pickupAddress?.coordinates;
  const dropoffCoordinates = order.dropoffAddress.coordinates;

  if (!pickupCoordinates) {
    throw new Error(`Order ${order.id} is missing pickup coordinates`);
  }

  if (!dropoffCoordinates) {
    throw new Error(`Order ${order.id} is missing dropoff coordinates`);
  }

  return {
    id: order.id,
    name: order.reference,
    pickup: {
      address: coordinatesToAddress(`order:${order.id}:pickup`, pickupCoordinates),
      duration: order.serviceDurationSeconds
    },
    delivery: {
      address: coordinatesToAddress(`order:${order.id}:dropoff`, dropoffCoordinates),
      duration: order.serviceDurationSeconds
    },
    size: capacityVectorToArray(order.capacity),
    required_skills: order.requiredSkills,
    priority: order.priority
  };
}

export function buildVrpPayload(
  context: PlanningContext,
  objectivePreset: ObjectivePreset
): GraphHopperProblem {
  const services: GraphHopperService[] = [];
  const shipments: GraphHopperShipment[] = [];

  for (const order of context.orders) {
    if (order.kind === "pickup_delivery" || order.kind === "return") {
      shipments.push(buildShipment(order));
      continue;
    }

    services.push(buildService(order));
  }

  return {
    vehicles: buildVehicles(context.shifts),
    vehicle_types: buildVehicleTypes(context.vehicleTypes),
    services,
    shipments,
    objectives: buildObjectives(objectivePreset)
  };
}
