import { appendEvent } from "../lib/events.js";
import {
  PLATFORM_TENANT_ID,
  requireAuth,
  resolveTargetTenantId,
  scopedPricingConfig,
  isPlatformAdminAuth
} from "../lib/auth.js";
import { badRequest, readJsonBody, sendJson } from "../lib/http.js";
import { readDb, updateDb } from "../lib/store.js";

export function registerPricingRoutes(router) {
  router.get("/pricing/config", async (request, response) => {
    const db = readDb();
    const auth = requireAuth(request, response, db, ["ops_user", "customer"]);
    if (!auth) {
      return;
    }

    sendJson(response, 200, {
      config: scopedPricingConfig(db, auth),
      tenantId: auth.tenantId
    });
  });

  async function upsertPricingConfig(request, response) {
    const body = await readJsonBody(request);

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      badRequest(response, "pricing config payload must be an object");
      return;
    }

    const db = readDb();
    const auth = requireAuth(request, response, db, ["ops_user"]);
    if (!auth) {
      return;
    }

    let config = body;
    let tenantId = auth.tenantId;

    updateDb((nextDb) => {
      tenantId = resolveTargetTenantId(auth, body, PLATFORM_TENANT_ID);
      const configPayload = structuredClone(body);
      delete configPayload.tenantId;
      delete configPayload.companyId;
      delete configPayload.applyGlobally;

      if (isPlatformAdminAuth(auth) && body.applyGlobally === true) {
        nextDb.pricingConfig = structuredClone(configPayload);
      }

      nextDb.tenantPricingConfigs[tenantId] = structuredClone(configPayload);
      config = nextDb.tenantPricingConfigs[tenantId];
      appendEvent(nextDb, {
        type: "pricing.config_updated",
        entityType: "pricing",
        entityId: tenantId,
        payload: {
          tenantId,
          updatedAt: new Date().toISOString()
        }
      });
      return nextDb;
    });

    sendJson(response, 200, {
      config,
      tenantId
    });
  }

  router.post("/pricing/config", upsertPricingConfig);
  router.patch("/pricing/config", upsertPricingConfig);
}
