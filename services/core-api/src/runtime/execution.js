import { appendEvent } from "../lib/events.js";
import { badRequest, notFound, readJsonBody, sendJson } from "../lib/http.js";
import { createId } from "../lib/ids.js";
import { readDb, updateDb } from "../lib/store.js";

function findRouteByDriver(db, driverId, status) {
  return db.routes.filter((route) => {
    if (route.driverId !== driverId) {
      return false;
    }

    if (!status) {
      return true;
    }

    return route.status === status;
  });
}

function findStop(db, stopId) {
  for (const route of db.routes) {
    const stop = route.stops.find((candidate) => candidate.id === stopId);

    if (stop) {
      return {
        route,
        stop
      };
    }
  }

  return null;
}

function updateRouteLifecycle(route) {
  const hasStarted = route.stops.some((stop) => ["arrived", "served", "failed", "skipped"].includes(stop.status));
  const hasPending = route.stops.some((stop) => ["pending", "arrived"].includes(stop.status));

  if (hasStarted && route.status !== "completed" && route.status !== "cancelled") {
    route.status = "in_progress";
  }

  if (!hasPending && route.stops.length > 0) {
    route.status = "completed";
    route.completedAt = new Date().toISOString();
  }
}

function buildCarrierView(route) {
  const nextStop = route.stops.find((stop) => stop.status === "pending");

  return {
    route,
    nextStop,
    pendingStops: route.stops.filter((stop) => stop.status === "pending").length
  };
}

export function registerExecutionRoutes(router) {
  router.get("/carrier/routes", async (_request, response, { query }) => {
    if (!query.driverId) {
      badRequest(response, "driverId is required");
      return;
    }

    const db = readDb();
    const routes = findRouteByDriver(db, query.driverId, query.status).map((route) => buildCarrierView(route));

    sendJson(response, 200, {
      items: routes,
      total: routes.length
    });
  });

  router.get("/carrier/routes/:routeId", async (_request, response, { params }) => {
    const db = readDb();
    const route = db.routes.find((candidate) => candidate.id === params.routeId);

    if (!route) {
      notFound(response, "Route not found");
      return;
    }

    sendJson(response, 200, buildCarrierView(route));
  });

  router.post("/carrier/check-ins", async (request, response) => {
    const body = await readJsonBody(request);

    if (!body.driverId || !body.routeId || body.latitude === undefined || body.longitude === undefined) {
      badRequest(response, "driverId, routeId, latitude and longitude are required");
      return;
    }

    const heartbeat = {
      id: createId("hb"),
      driverId: body.driverId,
      routeId: body.routeId,
      latitude: body.latitude,
      longitude: body.longitude,
      occurredAt: body.occurredAt ?? new Date().toISOString()
    };

    updateDb((db) => {
      db.heartbeats.unshift(heartbeat);

      const route = db.routes.find((candidate) => candidate.id === body.routeId);

      if (route) {
        route.lastKnownPosition = {
          lat: body.latitude,
          lon: body.longitude
        };
        route.lastHeartbeatAt = heartbeat.occurredAt;
      }

      appendEvent(db, {
        type: "carrier.heartbeat",
        entityType: "route",
        entityId: body.routeId,
        payload: heartbeat
      });
      return db;
    });

    sendJson(response, 202, heartbeat);
  });

  router.post("/carrier/stops/:stopId/status", async (request, response, { params }) => {
    const body = await readJsonBody(request);
    const allowedStatuses = ["pending", "arrived", "served", "failed", "skipped"];

    if (!allowedStatuses.includes(body.status)) {
      badRequest(response, "status must be one of pending, arrived, served, failed, skipped");
      return;
    }

    let updated = null;

    updateDb((db) => {
      const found = findStop(db, params.stopId);

      if (!found) {
        return db;
      }

      const { route, stop } = found;
      stop.status = body.status;
      stop.note = body.note ?? stop.note;
      stop.updatedAt = new Date().toISOString();

      if (stop.orderId) {
        const order = db.orders.find((candidate) => candidate.id === stop.orderId);

        if (order) {
          if (body.status === "arrived") {
            order.status = "in_progress";
          } else if (body.status === "served") {
            order.status = "completed";
          } else if (body.status === "failed" || body.status === "skipped") {
            order.status = "failed";
          }

          order.updatedAt = new Date().toISOString();
        }
      }

      updateRouteLifecycle(route);

      appendEvent(db, {
        type: "stop.status_changed",
        entityType: "stop",
        entityId: stop.id,
        payload: {
          routeId: route.id,
          status: stop.status
        }
      });

      updated = {
        route,
        stop
      };
      return db;
    });

    if (!updated) {
      notFound(response, "Stop not found");
      return;
    }

    sendJson(response, 200, updated);
  });

  router.post("/carrier/stops/:stopId/proof", async (request, response, { params }) => {
    const body = await readJsonBody(request);

    if (!body.deliveredAt) {
      badRequest(response, "deliveredAt is required");
      return;
    }

    let createdProof = null;

    updateDb((db) => {
      const found = findStop(db, params.stopId);

      if (!found) {
        return db;
      }

      const { route, stop } = found;
      const proof = {
        id: createId("pod"),
        stopId: stop.id,
        routeId: route.id,
        orderId: stop.orderId ?? null,
        deliveredAt: body.deliveredAt,
        recipientName: body.recipientName ?? null,
        otpCode: body.otpCode ?? null,
        signatureImageUrl: body.signatureImageUrl ?? null,
        photoUrls: body.photoUrls ?? [],
        failureReasonCode: body.failureReasonCode ?? null,
        note: body.note ?? null,
        createdAt: new Date().toISOString()
      };

      db.proofs.unshift(proof);

      stop.status = proof.failureReasonCode ? "failed" : "served";
      stop.proofId = proof.id;
      stop.updatedAt = new Date().toISOString();

      if (stop.orderId) {
        const order = db.orders.find((candidate) => candidate.id === stop.orderId);

        if (order) {
          order.status = proof.failureReasonCode ? "failed" : "completed";
          order.updatedAt = new Date().toISOString();
        }
      }

      updateRouteLifecycle(route);

      appendEvent(db, {
        type: "proof.submitted",
        entityType: "proof",
        entityId: proof.id,
        payload: {
          routeId: route.id,
          stopId: stop.id
        }
      });

      createdProof = proof;
      return db;
    });

    if (!createdProof) {
      notFound(response, "Stop not found");
      return;
    }

    sendJson(response, 201, createdProof);
  });

  router.get("/events", async (_request, response, { query }) => {
    const db = readDb();
    let items = [...db.events];

    if (query.entityType) {
      items = items.filter((event) => event.entityType === query.entityType);
    }

    if (query.entityId) {
      items = items.filter((event) => event.entityId === query.entityId);
    }

    sendJson(response, 200, {
      items,
      total: items.length
    });
  });
}
