import { appendEvent } from "../lib/events.js";
import { entityBelongsToAuth, requireAuth, scopedItems } from "../lib/auth.js";
import { forbidden } from "../lib/http.js";
import { badRequest, notFound, readJsonBody, sendJson } from "../lib/http.js";
import { createId } from "../lib/ids.js";
import { readDb, updateDb } from "../lib/store.js";

function buildEntity(prefix, body, defaults = {}, auth) {
  return {
    id: body.id ?? createId(prefix),
    tenantId: auth.tenantId,
    companyId: auth.companyId,
    ...defaults,
    ...body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function registerCollectionRoutes(
  router,
  path,
  collectionName,
  eventType,
  defaults = {},
  entityName = collectionName.slice(0, -1),
  options = {}
) {
  const entityIdParam = `${entityName.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())}Id`;
  const readActorTypes = options.readActorTypes ?? ["ops_user"];
  const writeActorTypes = options.writeActorTypes ?? ["ops_user"];

  router.get(path, async (request, response) => {
    const db = readDb();
    const auth = requireAuth(request, response, db, readActorTypes);
    if (!auth) {
      return;
    }

    const items = scopedItems(db[collectionName], auth, collectionName);
    sendJson(response, 200, {
      items,
      total: items.length
    });
  });

  router.post(path, async (request, response) => {
    const body = await readJsonBody(request);
    const db = readDb();
    const auth = requireAuth(request, response, db, writeActorTypes);
    if (!auth) {
      return;
    }

    try {
      const entity = buildEntity(entityName, body, defaults, auth);

      updateDb((nextDb) => {
        nextDb[collectionName].push(entity);
        appendEvent(nextDb, {
          type: eventType,
          entityType: entityName,
          entityId: entity.id,
          payload: {
            tenantId: entity.tenantId
          }
        });
        return nextDb;
      });

      sendJson(response, 201, entity);
    } catch (error) {
      badRequest(response, error.message);
    }
  });

  router.patch(`${path}/:${entityIdParam}`, async (request, response, { params }) => {
    const body = await readJsonBody(request);
    const entityId = params[entityIdParam];
    const db = readDb();
    const auth = requireAuth(request, response, db, writeActorTypes);
    if (!auth) {
      return;
    }

    const existing = db[collectionName].find((candidate) => candidate.id === entityId);
    if (!existing || !entityBelongsToAuth(existing, auth)) {
      notFound(response, `${entityName} not found`);
      return;
    }

    if (options.selfWriteOnlyForDriver && auth.actorType === "driver" && String(existing.id) !== String(auth.actor.id)) {
      forbidden(response, `This ${entityName} cannot be updated by the current driver`);
      return;
    }

    let entity = null;

    updateDb((nextDb) => {
      entity = nextDb[collectionName].find((candidate) => candidate.id === entityId);
      if (!entity) {
        return nextDb;
      }

      Object.assign(entity, body, {
        id: entityId,
        tenantId: entity.tenantId,
        companyId: entity.companyId,
        updatedAt: new Date().toISOString()
      });

      appendEvent(nextDb, {
        type: `${eventType.replace(".created", "")}.updated`,
        entityType: entityName,
        entityId,
        payload: {
          updatedAt: entity.updatedAt
        }
      });
      return nextDb;
    });

    sendJson(response, 200, entity);
  });
}

export function registerFleetRoutes(router) {
  registerCollectionRoutes(router, "/fleet/hubs", "hubs", "hub.created");
  registerCollectionRoutes(
    router,
    "/fleet/vehicle-types",
    "vehicleTypes",
    "vehicle_type.created",
    {
      vehicleClass: "van",
      routingProfile: "car",
      capacity: {
        parcels: 0,
        weightKg: 0,
        volumeDm3: 0
      }
    },
    "vehicle_type"
  );
  registerCollectionRoutes(router, "/fleet/vehicles", "vehicles", "vehicle.created");
  registerCollectionRoutes(
    router,
    "/fleet/carrier-companies",
    "carrierCompanies",
    "carrier_company.created",
    {},
    "carrier_company",
    {
      readActorTypes: ["ops_user", "driver"]
    }
  );
  registerCollectionRoutes(
    router,
    "/fleet/drivers",
    "drivers",
    "driver.created",
    {
      skills: [],
      status: "active",
      temporaryPassword: "demo"
    },
    "driver",
    {
      readActorTypes: ["ops_user", "driver"],
      writeActorTypes: ["ops_user", "driver"],
      selfWriteOnlyForDriver: true
    }
  );
  registerCollectionRoutes(
    router,
    "/fleet/shifts",
    "shifts",
    "shift.created",
    {
      skills: [],
      status: "planned"
    },
    "shift"
  );

  router.get("/fleet/overview", async (request, response) => {
    const db = readDb();
    const auth = requireAuth(request, response, db, ["ops_user"]);
    if (!auth) {
      return;
    }

    const hubs = scopedItems(db.hubs, auth, "hubs");
    const vehicleTypes = scopedItems(db.vehicleTypes, auth, "vehicleTypes");
    const vehicles = scopedItems(db.vehicles, auth, "vehicles");
    const drivers = scopedItems(db.drivers, auth, "drivers");
    const shifts = scopedItems(db.shifts, auth, "shifts");

    sendJson(response, 200, {
      hubs: hubs.length,
      vehicleTypes: vehicleTypes.length,
      vehicles: vehicles.length,
      drivers: drivers.length,
      shifts: shifts.length
    });
  });
}
