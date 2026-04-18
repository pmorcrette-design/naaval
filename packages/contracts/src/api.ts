export type ApiError = {
  code: string;
  message: string;
};

export type PaginatedResponse<T> = {
  items: T[];
  total: number;
};

export type OptimizePlanRequest = {
  hubId: string;
  planDate: string;
  orderIds: string[];
  driverShiftIds: string[];
  objectivePreset: "balanced" | "fleet_min" | "speed";
};

export type LaunchOptimizationResponse = {
  planningJobId: string;
  externalJobId?: string;
};

export type CarrierHeartbeatRequest = {
  driverId: string;
  routeId: string;
  latitude: number;
  longitude: number;
  occurredAt: string;
};

export type SubmitProofRequest = {
  deliveredAt: string;
  recipientName?: string;
  otpCode?: string;
  signatureImageUrl?: string;
  photoUrls: string[];
  failureReasonCode?: string;
  note?: string;
};

