import { appendEvent } from "../lib/events.js";
import { badRequest, notFound, readJsonBody, sendJson } from "../lib/http.js";
import { createId } from "../lib/ids.js";
import { readDb, updateDb } from "../lib/store.js";

function normalizeOrderInput(input, fallbackMerchantId) {
  if (!input.reference) {
    throw new Error("Order reference is required");
  }

  if (!input.dropoffAddress?.label || !input.dropoffAddress?.street1) {
    throw new Error("dropoffAddress with label and street1 is required");
  }

  return {
    id: input.id ?? createId("ord"),
    merchantId: input.merchantId ?? fallbackMerchantId,
    hubId: input.hubId ?? null,
    kind: input.kind ?? "delivery",
    reference: input.reference,
    pickupAddress: input.pickupAddress ?? null,
    dropoffAddress: input.dropoffAddress,
    parcelSize: input.parcelSize ?? input.dropoffAddress?.parcelSize ?? input.pickupAddress?.parcelSize ?? "M",
    serviceDurationSeconds: input.serviceDurationSeconds ?? 300,
    parcelCount: input.parcelCount ?? 1,
    weightKg: input.weightKg ?? 0,
    volumeDm3: input.volumeDm3 ?? 0,
    requiredSkills: input.requiredSkills ?? [],
    timeWindows: input.timeWindows ?? [],
    priority: input.priority ?? 0,
    notes: input.notes ?? "",
    status: input.status ?? "ready",
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
    currentTime += 10 * 60 * 1000 + (order.serviceDurationSeconds ?? 300) * 1000;
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
  router.get("/orders", async (_request, response, { query }) => {
    const db = readDb();
    let items = [...db.orders];

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

  router.get("/orders/:orderId", async (_request, response, { params }) => {
    const db = readDb();
    const order = db.orders.find((candidate) => candidate.id === params.orderId);

    if (!order) {
      notFound(response, "Order not found");
      return;
    }

    sendJson(response, 200, order);
  });

  router.post("/orders", async (request, response) => {
    const body = await readJsonBody(request);

    if (!body.merchantId) {
      badRequest(response, "merchantId is required");
      return;
    }

    try {
      const order = normalizeOrderInput(body, body.merchantId);

      updateDb((db) => {
        db.orders.push(order);
        appendEvent(db, {
          type: "order.created",
          entityType: "order",
          entityId: order.id,
          payload: { reference: order.reference }
        });
        return db;
      });

      sendJson(response, 201, order);
    } catch (error) {
      badRequest(response, error.message);
    }
  });

  router.post("/orders/import", async (request, response) => {
    const body = await readJsonBody(request);

    if (!body.merchantId || !Array.isArray(body.orders)) {
      badRequest(response, "merchantId and orders[] are required");
      return;
    }

    try {
      const importedOrders = body.orders.map((order) => normalizeOrderInput(order, body.merchantId));

      updateDb((db) => {
        for (const order of importedOrders) {
          db.orders.push(order);
          appendEvent(db, {
            type: "order.imported",
            entityType: "order",
            entityId: order.id,
            payload: { reference: order.reference }
          });
        }

        return db;
      });

      sendJson(response, 202, {
        imported: importedOrders.length,
        items: importedOrders
      });
    } catch (error) {
      badRequest(response, error.message);
    }
  });

  router.patch("/orders/:orderId/assignment", async (request, response, { params }) => {
    const body = await readJsonBody(request);

    if (!body.driverId) {
      badRequest(response, "driverId is required");
      return;
    }

    const db = readDb();
    const order = db.orders.find((candidate) => candidate.id === params.orderId);

    if (!order) {
      notFound(response, "Order not found");
      return;
    }

    const driver = findDriver(db, body.driverId);

    if (!driver) {
      notFound(response, "Driver not found");
      return;
    }

    let assignedRoute = null;

    updateDb((db) => {
      const mutableOrder = db.orders.find((candidate) => candidate.id === params.orderId);
      if (!mutableOrder) {
        return db;
      }

      let route = db.routes.find((candidate) => candidate.stops?.some((stop) => stop.orderId === params.orderId));

      if (route) {
        const shift = findFirstShiftForDriver(db, body.driverId);
        route.driverId = body.driverId;
        route.shiftId = shift?.id ?? route.shiftId ?? null;
        route.vehicleId = shift?.vehicleId ?? route.vehicleId ?? null;
        route.updatedAt = new Date().toISOString();
      } else {
        route = createManualRouteForOrder(db, mutableOrder, body.driverId);
        db.routes.unshift(route);
      }

      if (!["completed", "in_progress", "dispatched"].includes(mutableOrder.status)) {
        mutableOrder.status = "planned";
      }

      mutableOrder.updatedAt = new Date().toISOString();
      assignedRoute = route;

      appendEvent(db, {
        type: "order.driver_assigned",
        entityType: "order",
        entityId: mutableOrder.id,
        payload: {
          driverId: body.driverId,
          routeId: route.id
        }
      });

      return db;
    });

    sendJson(response, 200, {
      order: {
        ...order,
        status: ["completed", "in_progress", "dispatched"].includes(order.status) ? order.status : "planned"
      },
      route: assignedRoute
    });
  });
}
