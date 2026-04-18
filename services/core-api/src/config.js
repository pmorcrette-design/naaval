export function loadConfig() {
  return {
    port: Number.parseInt(process.env.PORT ?? "3001", 10),
    nodeEnv: process.env.NODE_ENV ?? "development",
    graphhopperApiKey: process.env.GRAPHHOPPER_API_KEY ?? "",
    graphhopperBaseUrl: process.env.GRAPHHOPPER_BASE_URL ?? "https://graphhopper.com/api/1",
    defaultSolver: process.env.PLANNING_SOLVER ?? "auto"
  };
}

