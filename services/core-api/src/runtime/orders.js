import { appendEvent } from "../lib/events.js";
import { entityBelongsToAuth, requireAuth, scopedItems } from "../lib/auth.js";
import { badRequest, notFound, readJsonBody, sendJson } from "../lib/http.js";
import { createId } from "../lib/ids.js";
import { readDb, updateDb } from "../lib/store.js";

function normalizeOrderInput(input, fallbackMerchantId, tenantId, companyId) {
  if (!input.reference) {
    throw new Error("Order reference is required");
  }

  if (!input.dropoffAddress?.label || !input.dropoffAddress?.street1) {
    throw new Error("dropoffAddress with label and street1 is required");
  }

  return {
    id: input.id ?? createId("ord"),
    tenantId,
    companyId,
    merchantId: input.merchantId ?? fallbackMerchantId,
    customerId: input.customerId ?? null,
    hubId: input.hubId ?? null,
    kind: input.kind ?? "delivery",
    reference: input.reference,
    pickupAddress: input.pickupAddress ?? null,
    dropoffAddress: input.dropoffAddress,
    parcelSize: input.parcelSize ?? input.dropoffAddress?.parcelSize ?? input.pickupAddress?.parcelSize ?? "M",
    serviceDurationSeconds: input.serviceDurationSeconds ?? 300,
    pickupServiceDurationSeconds: input.pickupServiceDurationSeconds ?? input.serviceDurationSeconds ?? 300,
    parcelCount: input.parcelCount ?? 1,
    weightKg: input.weightKg ?? 0,
    volumeDm3: input.volumeDm3 ?? 0,
    requiredSkills: input.requiredSkills ?? [],
    timeWindows: input.timeWindows ?? [],
    priority: input.priority ?? 0,
    pickupGroupId: input.pickupGroupId ?? null,
    sourceBatchId: input.sourceBatchId ?? null,
    notes: input.notes ?? "",
    source: input.source ?? "ops",
    sourceLabel: input.sourceLabel ?? "Ops",
    status: input.status ?? "ready",
    statusMessage: input.statusMessage ?? null,
    statusReasonCode: input.statusReasonCode ?? null,
    statusReasonLabel: input.statusReasonLabel ?? null,
    statusReason: input.statusReason ?? null,
    lastProofId: input.lastProofId ?? null,
    lastProofOutcomeCode: input.lastProofOutcomeCode ?? null,
    lastProofOutcomeLabel: input.lastProofOutcomeLabel ?? null,
    lastProofPhotoUrls: input.lastProofPhotoUrls ?? [],
    lastProofNote: input.lastProofNote ?? null,
    lastProofDeliveredAt: input.lastProofDeliveredAt ?? null,
    lastKnownPosition: input.lastKnownPosition ?? null,
    lastKnownPositionAt: input.lastKnownPositionAt ?? null,
    lastKnownPositionLabel: input.lastKnownPositionLabel ?? null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function findDriver(db, driverId) {
  return db.drivers.find((candidate) => candidate.id === driverId) ?? null;
}

function findFirstShiftForDriver(db, driverId) {
  return (
    [...db.shifts]
      .filter((shift) => shift.driverId === driverId)
      .sort((left, right) => new Date(left.startAt).getTime() - new Date(right.startAt).getTime())[0] ?? null
  );
}

function createManualRouteForOrder(db, order, driverId) {
  const shift = findFirstShiftForDriver(db, driverId);
  const routeId = createId("route");
  const routeStart = shift?.startAt ? new Date(shift.startAt).getTime() : Date.now();
  let currentTime = routeStart;
  let sequence = 1;
  const stops = [];

  if ((order.kind === "pickup_delivery" || order.kind === "return") && order.pickupAddress) {
    const pickupArrival = new Date(currentTime + 10 * 60 * 1000).toISOString();
    currentTime += 10 * 60 * 1000 + (order.pickupServiceDurationSeconds ?? order.serviceDurationSeconds ?? 300) * 1000;
    stops.push({
      id: `${routeId}_stop_${sequence}`,
      orderId: order.id,
      sequence,
      kind: "pickup",
      address: order.pickupAddress,
      plannedArrivalAt: pickupArrival,
      plannedDepartureAt: new Date(currentTime).toISOString(),
      status: "pending"
    });
    sequence += 1;
  }

  const deliveryArrival = new Date(currentTime + 15 * 60 * 1000).toISOString();
  currentTime += 15 * 60 * 1000 + (order.serviceDurationSeconds ?? 300) * 1000;
  stops.push({
    id: `${routeId}_stop_${sequence}`,
    orderId: order.id,
    sequence,
    kind: "delivery",
    address: order.dropoffAddress,
    plannedArrivalAt: deliveryArrival,
    plannedDepartureAt: new Date(currentTime).toISOString(),
    status: "pending"
  });

  return {
    id: routeId,
    tenantId: order.tenantId,
    companyId: order.companyId,
    planId: createId("manual_plan"),
    shiftId: shift?.id ?? null,
    driverId,
    vehicleId: shift?.vehicleId ?? null,
    status: "ready",
    source: "manual_assignment",
    totalDistanceMeters: stops.length * 3800,
    totalDurationSeconds: Math.round((currentTime - routeStart) / 1000),
    stops,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

export function registerOrdersRoutes(router) {
  router.get("/orders", async (request, response, { query }) => {
    const db = readDb();
    const auth = requireAuth(request, response, db, ["ops_user", "customer"]);
    if (!auth) {
      return;
    }

    let items = [...scopedItems(db.orders, auth, "orders")];

    if (query.status) {
      items = items.filter((order) => order.status === query.status);
    }

    if (query.merchantId) {
      items = items.filter((order) => order.merchantId === query.merchantId);
    }

    if (query.hubId) {
      items = items.filter((order) => order.hubId === query.hubId);
    }

    sendJson(response, 200, {
      items,
      total: items.length
    });
  });

  router.get("/orders/:orderId", async (request, response, { params }) => {
    const db = readDb();
    const auth = requireAuth(request, response, db, ["ops_user", "customer"]);
    if (!auth) {
      return;
    }

    const order = db.orders.find((candidate) => candidate.id === params.orderId);

    if (!order || !entityBelongsToAuth(order, auth)) {
      notFound(response, "Order not found");
      return;
    }

    sendJson(response, 200, order);
  });

  router.post("/orders", async (request, response) => {
    const body = await readJsonBody(request);
    const db = readDb();
    const auth = requireAuth(request, response, db, ["ops_user", "customer"]);
    if (!auth) {
      return;
    }

    if (!body.merchantId) {
      badRequest(response, "merchantId is required");
      return;
    }

    try {
      const order = normalizeOrderInput(body, body.merchantId, auth.tenantId, auth.companyId);

      updateDb((nextDb) => {
        nextDb.orders.unshift(order);
        appendEvent(nextDb, {
          type: "order.created",
          entityType: "order",
          entityId: order.id,
          payload: {
            reference: order.reference,
            tenantId: order.tenantId
          }
        });
        return nextDb;
      });

      sendJson(response, 201, order);
    } catch (error) {
      badRequest(response, error.message);
    }
  });

  router.post("/orders/import", async (request, response) => {
    const body = await readJsonBody(request);
    const db = readDb();
    const auth = requireAuth(request, response, db, ["ops_user"]);
    if (!auth) {
      return;
    }

    if (!body.merchantId || !Array.isArray(body.orders)) {
      badRequest(response, "merchantId and orders[] are required");
      return;
    }

    try {
      const importedOrders = body.orders.map((order) =>
        normalizeOrderInput(order, body.merchantId, auth.tenantId, auth.companyId)
      );

      updateDb((nextDb) => {
        for (const order of importedOrders) {
          nextDb.orders.push(order);
          appendEvent(nextDb, {
            type: "order.imported",
            entityType: "order",
            entityId: order.id,
            payload: {
              reference: order.reference,
              tenantId: order.tenantId
            }
          });
        }

        return nextDb;
      });

      sendJson(response, 202, {
        imported: importedOrders.length,
        items: importedOrders
      });
    } catch (error) {
      badRequest(response, error.message);
    }
  });

  router.patch("/orders/:orderId", async (request, response, { params }) => {
    const body = await readJsonBody(request);
    const db = readDb();
    const auth = requireAuth(request, response, db, ["ops_user"]);
    if (!auth) {
      return;
    }

    const existing = db.orders.find((candidate) => candidate.id === params.orderId);
    if (!existing || !entityBelongsToAuth(existing, auth)) {
      notFound(response, "Order not found");
      return;
    }

    let entity = null;

    updateDb((nextDb) => {
      entity = nextDb.orders.find((candidate) => candidate.id === params.orderId);
      if (!entity) {
        return nextDb;
      }

      Object.assign(entity, body, {
        id: params.orderId,
        tenantId: entity.tenantId,
        companyId: entity.companyId,
        updatedAt: new Date().toISOString()
      });

      appendEvent(nextDb, {
        type: "order.updated",
        entityType: "order",
        entityId: entity.id,
        payload: {
          status: entity.status,
          updatedAt: entity.updatedAt
        }
      });
      return nextDb;
    });

    sendJson(response, 200, entity);
  });

  router.post("/orders/:orderId/assignment", async (request, response, { params }) => {
    const body = await readJsonBody(request);
    const db = readDb();
    const auth = requireAuth(request, response, db, ["ops_user"]);
    if (!auth) {
      return;
    }

    if (!body.driverId) {
      badRequest(response, "driverId is required");
      return;
    }

    const order = db.orders.find((candidate) => candidate.id === params.orderId);
    if (!order || !entityBelongsToAuth(order, auth)) {
      notFound(response, "Order not found");
      return;
    }

    const driver = findDriver(db, body.driverId);
    if (!driver || !entityBelongsToAuth(driver, auth)) {
      notFound(response, "Driver not found");
      return;
    }

    let assignedRoute = null;

    updateDb((nextDb) => {
      const mutableOrder = nextDb.orders.find((candidate) => candidate.id === params.orderId);
      if (!mutableOrder) {
        return nextDb;
      }

      let route = nextDb.routes.find((candidate) => candidate.stops?.some((stop) => stop.orderId === params.orderId));

      if (route) {
        const shift = findFirstShiftForDriver(nextDb, body.driverId);
        route.driverId = body.driverId;
        route.shiftId = shift?.id ?? route.shiftId ?? null;
        route.vehicleId = shift?.vehicleId ?? route.vehicleId ?? null;
        route.updatedAt = new Date().toISOString();
      } else {
        route = createManualRouteForOrder(nextDb, mutableOrder, body.driverId);
        nextDb.routes.unshift(route);
      }

      if (!["completed", "in_progress", "dispatched"].includes(mutableOrder.status)) {
        mutableOrder.status = "planned";
      }

      mutableOrder.updatedAt = new Date().toISOString();
      assignedRoute = route;

      appendEvent(nextDb, {
        type: "order.driver_assigned",
        entityType: "order",
        entityId: mutableOrder.id,
        payload: {
          driverId: body.driverId,
          routeId: route.id
        }
      });

      return nextDb;
    });

    if (!assignedRoute) {
      notFound(response, "Order not found");
      return;
    }

    sendJson(response, 200, assignedRoute);
  });
}
