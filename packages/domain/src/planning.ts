import type { Coordinates, DeliveryOrder, DriverShift, VehicleType } from "./entities";

export type ObjectivePreset = "balanced" | "fleet_min" | "speed";

export type PlanningContext = {
  hubId: string;
  planDate: string;
  shifts: DriverShift[];
  vehicleTypes: VehicleType[];
  orders: DeliveryOrder[];
};

export type RouteObjective = {
  type: "min";
  value: "vehicles" | "completion_time" | "transport_time";
};

export type GraphHopperAddress = {
  location_id: string;
  lat: number;
  lon: number;
};

export type GraphHopperVehicle = {
  vehicle_id: string;
  type_id: string;
  start_address: GraphHopperAddress;
  end_address?: GraphHopperAddress;
  earliest_start?: number;
  latest_end?: number;
  skills?: string[];
};

export type GraphHopperVehicleType = {
  type_id: string;
  profile: string;
  capacity?: number[];
};

export type GraphHopperService = {
  id: string;
  name: string;
  address: GraphHopperAddress;
  duration?: number;
  size?: number[];
  required_skills?: string[];
  time_windows?: Array<{
    earliest: number;
    latest: number;
  }>;
  priority?: number;
};

export type GraphHopperShipment = {
  id: string;
  name: string;
  pickup: {
    address: GraphHopperAddress;
    duration?: number;
  };
  delivery: {
    address: GraphHopperAddress;
    duration?: number;
  };
  size?: number[];
  required_skills?: string[];
  priority?: number;
};

export type GraphHopperProblem = {
  vehicles: GraphHopperVehicle[];
  vehicle_types: GraphHopperVehicleType[];
  services?: GraphHopperService[];
  shipments?: GraphHopperShipment[];
  objectives: RouteObjective[];
};

export function capacityVectorToArray(input: {
  parcels?: number;
  weightKg?: number;
  volumeDm3?: number;
}): number[] {
  return [input.parcels ?? 0, input.weightKg ?? 0, input.volumeDm3 ?? 0];
}

export function coordinatesToAddress(locationId: string, coordinates: Coordinates): GraphHopperAddress {
  return {
    location_id: locationId,
    lat: coordinates.lat,
    lon: coordinates.lon
  };
}

