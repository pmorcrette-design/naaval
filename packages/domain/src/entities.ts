export type CapacityVector = {
  parcels?: number;
  weightKg?: number;
  volumeDm3?: number;
};

export type Coordinates = {
  lat: number;
  lon: number;
};

export type TimeWindow = {
  start: string;
  end: string;
};

export type DeliveryAddress = {
  label: string;
  street1: string;
  street2?: string;
  city: string;
  postalCode: string;
  countryCode: string;
  coordinates?: Coordinates;
};

export type DeliveryOrderKind = "delivery" | "pickup_delivery" | "return";
export type DeliveryOrderStatus =
  | "draft"
  | "ready"
  | "planned"
  | "dispatched"
  | "in_progress"
  | "completed"
  | "failed"
  | "cancelled";

export type DeliveryOrder = {
  id: string;
  merchantId: string;
  reference: string;
  kind: DeliveryOrderKind;
  pickupAddress?: DeliveryAddress;
  dropoffAddress: DeliveryAddress;
  parcelCount: number;
  serviceDurationSeconds: number;
  capacity: CapacityVector;
  requiredSkills: string[];
  timeWindows: TimeWindow[];
  priority?: number;
  status: DeliveryOrderStatus;
};

export type VehicleType = {
  id: string;
  label: string;
  capacity: CapacityVector;
  vehicleClass: "bike" | "scooter" | "car" | "van" | "truck";
  routingProfile: "bike" | "car" | "truck" | "foot";
};

export type DriverShift = {
  id: string;
  driverId: string;
  vehicleId: string;
  vehicleTypeId: string;
  startAt: string;
  endAt: string;
  startCoordinates: Coordinates;
  endCoordinates?: Coordinates;
  skills: string[];
};

export type RouteStopStatus = "pending" | "arrived" | "served" | "failed" | "skipped";

export type RouteStop = {
  id: string;
  orderId?: string;
  sequence: number;
  kind: "pickup" | "delivery" | "break";
  address: DeliveryAddress;
  plannedArrivalAt?: string;
  plannedDepartureAt?: string;
  status: RouteStopStatus;
};

export type RoutePlanStatus =
  | "draft"
  | "ready"
  | "dispatched"
  | "in_progress"
  | "completed"
  | "cancelled";

export type RoutePlan = {
  id: string;
  shiftId: string;
  driverId: string;
  vehicleId: string;
  status: RoutePlanStatus;
  stops: RouteStop[];
  totalDistanceMeters?: number;
  totalDurationSeconds?: number;
};

export type ProofOfDelivery = {
  stopId: string;
  deliveredAt: string;
  recipientName?: string;
  signatureImageUrl?: string;
  photoUrls: string[];
  otpCode?: string;
  failureReasonCode?: string;
  note?: string;
};
