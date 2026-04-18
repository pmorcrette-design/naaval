import { appendEvent } from "../lib/events.js";
import { badRequest, readJsonBody, sendJson } from "../lib/http.js";
import { createId } from "../lib/ids.js";
import { readDb, updateDb } from "../lib/store.js";

function buildEntity(prefix, body, defaults = {}) {
  return {
    id: body.id ?? createId(prefix),
    ...defaults,
    ...body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function registerCollectionRoutes(router, path, collectionName, eventType, defaults = {}, entityName = collectionName.slice(0, -1)) {
  router.get(path, async (_request, response) => {
    const db = readDb();
    sendJson(response, 200, {
      items: db[collectionName],
      total: db[collectionName].length
    });
  });

  router.post(path, async (request, response) => {
    const body = await readJsonBody(request);

    try {
      const entity = buildEntity(entityName, body, defaults);

      updateDb((db) => {
        db[collectionName].push(entity);
        appendEvent(db, {
          type: eventType,
          entityType: entityName,
          entityId: entity.id,
          payload: entity
        });
        return db;
      });

      sendJson(response, 201, entity);
    } catch (error) {
      badRequest(response, error.message);
    }
  });
}

export function registerFleetRoutes(router) {
  registerCollectionRoutes(router, "/fleet/hubs", "hubs", "hub.created");
  registerCollectionRoutes(router, "/fleet/vehicle-types", "vehicleTypes", "vehicle_type.created", {
    vehicleClass: "van",
    routingProfile: "car",
    capacity: {
      parcels: 0,
      weightKg: 0,
      volumeDm3: 0
    }
  });
  registerCollectionRoutes(router, "/fleet/vehicles", "vehicles", "vehicle.created");
  registerCollectionRoutes(router, "/fleet/carrier-companies", "carrierCompanies", "carrier_company.created", {}, "carrier_company");
  registerCollectionRoutes(router, "/fleet/drivers", "drivers", "driver.created", {
    skills: [],
    status: "active"
  });
  registerCollectionRoutes(router, "/fleet/shifts", "shifts", "shift.created", {
    skills: [],
    status: "planned"
  });

  router.get("/fleet/overview", async (_request, response) => {
    const db = readDb();

    sendJson(response, 200, {
      hubs: db.hubs.length,
      vehicleTypes: db.vehicleTypes.length,
      vehicles: db.vehicles.length,
      drivers: db.drivers.length,
      shifts: db.shifts.length
    });
  });
}
