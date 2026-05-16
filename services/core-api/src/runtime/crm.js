import { appendEvent } from "../lib/events.js";
import { entityBelongsToAuth, requireAuth, scopedItems } from "../lib/auth.js";
import { badRequest, notFound, readJsonBody, sendJson } from "../lib/http.js";
import { createId } from "../lib/ids.js";
import { readDb, updateDb } from "../lib/store.js";

export function registerCrmRoutes(router) {
  router.get("/customers", async (request, response) => {
    const db = readDb();
    const auth = requireAuth(request, response, db, ["ops_user", "customer"]);
    if (!auth) {
      return;
    }

    const items = scopedItems(db.customers, auth, "customers");
    sendJson(response, 200, {
      items,
      total: items.length
    });
  });

  router.post("/customers", async (request, response) => {
    const body = await readJsonBody(request);
    const db = readDb();
    const auth = requireAuth(request, response, db, ["ops_user"]);
    if (!auth) {
      return;
    }

    if (!body.companyName || !body.headquartersAddress) {
      badRequest(response, "companyName and headquartersAddress are required");
      return;
    }

    let entity = null;

    updateDb((nextDb) => {
      entity = {
        id: body.id ?? createId("customer"),
        tenantId: auth.tenantId,
        companyId: auth.companyId,
        companyName: body.companyName,
        headquartersAddress: body.headquartersAddress,
        vatNumber: body.vatNumber ?? "",
        companyPhone: body.companyPhone ?? "",
        companyEmail: body.companyEmail ?? "",
        contactFirstName: body.contactFirstName ?? "",
        contactLastName: body.contactLastName ?? "",
        contactPhone: body.contactPhone ?? "",
        contactEmail: body.contactEmail ?? "",
        portalPassword: body.portalPassword ?? "demo",
        revenueRange: body.revenueRange ?? "",
        companySize: body.companySize ?? "smb",
        preferredAlgorithmId: body.preferredAlgorithmId ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      nextDb.customers.unshift(entity);
      appendEvent(nextDb, {
        type: "customer.created",
        entityType: "customer",
        entityId: entity.id,
        payload: {
          companyName: entity.companyName,
          tenantId: entity.tenantId
        }
      });
      return nextDb;
    });

    sendJson(response, 201, entity);
  });

  router.patch("/customers/:customerId", async (request, response, { params }) => {
    const body = await readJsonBody(request);
    const db = readDb();
    const auth = requireAuth(request, response, db, ["ops_user"]);
    if (!auth) {
      return;
    }

    const existing = db.customers.find((customer) => customer.id === params.customerId);
    if (!existing || !entityBelongsToAuth(existing, auth)) {
      notFound(response, "Customer not found");
      return;
    }

    let entity = null;

    updateDb((nextDb) => {
      entity = nextDb.customers.find((customer) => customer.id === params.customerId);
      if (!entity) {
        return nextDb;
      }

      Object.assign(entity, body, {
        id: params.customerId,
        tenantId: entity.tenantId,
        companyId: entity.companyId,
        updatedAt: new Date().toISOString()
      });

      appendEvent(nextDb, {
        type: "customer.updated",
        entityType: "customer",
        entityId: entity.id,
        payload: {
          updatedAt: entity.updatedAt
        }
      });
      return nextDb;
    });

    sendJson(response, 200, entity);
  });

  router.get("/quotes", async (request, response) => {
    const db = readDb();
    const auth = requireAuth(request, response, db, ["ops_user", "customer"]);
    if (!auth) {
      return;
    }

    const items = scopedItems(db.quotes, auth, "quotes");
    sendJson(response, 200, {
      items,
      total: items.length
    });
  });

  router.post("/quotes", async (request, response) => {
    const body = await readJsonBody(request);
    const db = readDb();
    const auth = requireAuth(request, response, db, ["ops_user", "customer"]);
    if (!auth) {
      return;
    }

    if (!body.customerId) {
      badRequest(response, "customerId is required");
      return;
    }

    const customer = db.customers.find((candidate) => candidate.id === body.customerId);
    if (!customer || !entityBelongsToAuth(customer, auth)) {
      notFound(response, "Customer not found");
      return;
    }

    let entity = null;

    updateDb((nextDb) => {
      entity = {
        id: body.id ?? createId("quote"),
        tenantId: customer.tenantId,
        companyId: customer.companyId,
        customerId: body.customerId,
        source: body.source ?? "basic",
        sourceLabel: body.sourceLabel ?? "Basic Algo",
        description: body.description ?? "",
        amount: Number(body.amount ?? 0),
        currency: body.currency ?? "EUR",
        dateKey: body.dateKey ?? new Date().toISOString().slice(0, 10),
        companySnapshot: body.companySnapshot ?? {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      nextDb.quotes.unshift(entity);
      appendEvent(nextDb, {
        type: "quote.created",
        entityType: "quote",
        entityId: entity.id,
        payload: {
          tenantId: entity.tenantId,
          customerId: entity.customerId
        }
      });
      return nextDb;
    });

    sendJson(response, 201, entity);
  });
}
