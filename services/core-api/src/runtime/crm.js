import { appendEvent } from "../lib/events.js";
import { badRequest, notFound, readJsonBody, sendJson } from "../lib/http.js";
import { createId } from "../lib/ids.js";
import { readDb, updateDb } from "../lib/store.js";

export function registerCrmRoutes(router) {
  router.get("/customers", async (_request, response) => {
    const db = readDb();
    sendJson(response, 200, {
      items: db.customers,
      total: db.customers.length
    });
  });

  router.post("/customers", async (request, response) => {
    const body = await readJsonBody(request);
    if (!body.companyName || !body.headquartersAddress) {
      badRequest(response, "companyName and headquartersAddress are required");
      return;
    }

    let entity = null;

    updateDb((db) => {
      entity = {
        id: body.id ?? createId("customer"),
        companyName: body.companyName,
        headquartersAddress: body.headquartersAddress,
        vatNumber: body.vatNumber ?? "",
        companyPhone: body.companyPhone ?? "",
        companyEmail: body.companyEmail ?? "",
        contactFirstName: body.contactFirstName ?? "",
        contactLastName: body.contactLastName ?? "",
        contactPhone: body.contactPhone ?? "",
        contactEmail: body.contactEmail ?? "",
        revenueRange: body.revenueRange ?? "",
        companySize: body.companySize ?? "smb",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      db.customers.unshift(entity);
      appendEvent(db, {
        type: "customer.created",
        entityType: "customer",
        entityId: entity.id,
        payload: entity
      });
      return db;
    });

    sendJson(response, 201, entity);
  });

  router.patch("/customers/:customerId", async (request, response) => {
    const body = await readJsonBody(request);
    const existing = readDb().customers.find((customer) => customer.id === request.params.customerId);
    if (!existing) {
      notFound(response, "Customer not found");
      return;
    }

    let entity = null;

    updateDb((db) => {
      entity = db.customers.find((customer) => customer.id === request.params.customerId);
      Object.assign(entity, body, {
        id: request.params.customerId,
        updatedAt: new Date().toISOString()
      });
      appendEvent(db, {
        type: "customer.updated",
        entityType: "customer",
        entityId: entity.id,
        payload: {
          updatedAt: entity.updatedAt
        }
      });
      return db;
    });

    sendJson(response, 200, entity);
  });

  router.get("/quotes", async (_request, response) => {
    const db = readDb();
    sendJson(response, 200, {
      items: db.quotes,
      total: db.quotes.length
    });
  });

  router.post("/quotes", async (request, response) => {
    const body = await readJsonBody(request);
    if (!body.customerId) {
      badRequest(response, "customerId is required");
      return;
    }

    let entity = null;

    updateDb((db) => {
      entity = {
        id: body.id ?? createId("quote"),
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
      db.quotes.unshift(entity);
      appendEvent(db, {
        type: "quote.created",
        entityType: "quote",
        entityId: entity.id,
        payload: entity
      });
      return db;
    });

    sendJson(response, 201, entity);
  });
}
