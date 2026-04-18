import { createRouter } from "./lib/router.js";
import { sendJson } from "./lib/http.js";
import { resolveDbPath } from "./lib/store.js";
import { registerAdminRoutes } from "./runtime/admin.js";
import { registerCrmRoutes } from "./runtime/crm.js";
import { registerDemoRoutes } from "./runtime/demo.js";
import { registerDispatchRoutes } from "./runtime/dispatch.js";
import { registerExecutionRoutes } from "./runtime/execution.js";
import { registerFleetRoutes } from "./runtime/fleet.js";
import { registerOrdersRoutes } from "./runtime/orders.js";
import { registerPlanningRoutes } from "./runtime/planning.js";
import { registerPricingRoutes } from "./runtime/pricing.js";

export function createApp(config) {
  const router = createRouter({ config });

  router.get("/health", async (_request, response) => {
    sendJson(response, 200, {
      status: "ok",
      service: "core-api",
      dbPath: resolveDbPath(),
      solver: config.graphhopperApiKey ? "graphhopper-enabled" : "mock-only"
    });
  });

  registerDemoRoutes(router);
  registerAdminRoutes(router);
  registerCrmRoutes(router);
  registerOrdersRoutes(router);
  registerFleetRoutes(router);
  registerPricingRoutes(router);
  registerPlanningRoutes(router, config);
  registerDispatchRoutes(router);
  registerExecutionRoutes(router);

  return router;
}
