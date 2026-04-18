export type GraphHopperOptimizeResponse = {
  job_id: string;
};

export type GraphHopperSolution = {
  job_id: string;
  status: "processing" | "waiting_in_queue" | "finished";
  solution?: {
    routes: Array<{
      vehicle_id: string;
      distance: number;
      completion_time: number;
      transport_time: number;
      activities: Array<{
        type: string;
        id?: string;
        arr_time?: number;
        end_time?: number;
        address?: {
          location_id?: string;
          lat?: number;
          lon?: number;
        };
      }>;
    }>;
  };
};

