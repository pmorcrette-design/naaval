import { appendEvent } from "../lib/events.js";
import { badRequest, readJsonBody, sendJson } from "../lib/http.js";
import { readDb, updateDb } from "../lib/store.js";

export function registerPricingRoutes(router) {
  router.get("/pricing/config", async (_request, response) => {
    const db = readDb();
    sendJson(response, 200, {
      config: db.pricingConfig
    });
  });

  async function upsertPricingConfig(request, response) {
    const body = await readJsonBody(request);

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      badRequest(response, "pricing config payload must be an object");
      return;
    }

    let config = body;

    updateDb((db) => {
      db.pricingConfig = body;
      config = db.pricingConfig;
      appendEvent(db, {
        type: "pricing.config_updated",
        entityType: "pricing",
        entityId: "default",
        payload: {
          updatedAt: new Date().toISOString()
        }
      });
      return db;
    });

    sendJson(response, 200, {
      config
    });
  }

  router.post("/pricing/config", upsertPricingConfig);
  router.patch("/pricing/config", upsertPricingConfig);
}
