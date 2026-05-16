import { appendEvent } from "../lib/events.js";
import { entityBelongsToAuth, requireAuth, scopedItems } from "../lib/auth.js";
import { badRequest, notFound, readJsonBody, sendJson } from "../lib/http.js";
import { createId } from "../lib/ids.js";
import { readDb, updateDb } from "../lib/store.js";

function findRouteByDriver(db, driverId, status, auth) {
  return scopedItems(db.routes, auth, "routes").filter((route) => {
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
  router.get("/carrier/routes", async (request, response, { query }) => {
    const db = readDb();
    const auth = requireAuth(request, response, db, ["driver", "ops_user"]);
    if (!auth) {
      return;
    }

    const driverId = query.driverId || (auth.actorType === "driver" ? auth.actor.id : null);
    if (!driverId) {
      badRequest(response, "driverId is required");
      return;
    }

    const routes = findRouteByDriver(db, driverId, query.status, auth).map((route) => buildCarrierView(route));
    sendJson(response, 200, {
      items: routes,
      total: routes.length
    });
  });

  router.get("/carrier/routes/:routeId", async (request, response, { params }) => {
    const db = readDb();
    const auth = requireAuth(request, response, db, ["driver", "ops_user", "customer"]);
    if (!auth) {
      return;
    }

    const route = db.routes.find((candidate) => candidate.id === params.routeId);

    if (!route || !entityBelongsToAuth(route, auth)) {
      notFound(response, "Route not found");
      return;
    }

    sendJson(response, 200, buildCarrierView(route));
  });

  router.post("/carrier/check-ins", async (request, response) => {
    const body = await readJsonBody(request);
    const db = readDb();
    const auth = requireAuth(request, response, db, ["driver", "ops_user"]);
    if (!auth) {
      return;
    }

    if (!body.driverId || !body.routeId || body.latitude === undefined || body.longitude === undefined) {
      badRequest(response, "driverId, routeId, latitude and longitude are required");
      return;
    }

    const route = db.routes.find((candidate) => candidate.id === body.routeId);
    if (!route || !entityBelongsToAuth(route, auth)) {
      notFound(response, "Route not found");
      return;
    }

    const heartbeat = {
      id: createId("hb"),
      tenantId: route.tenantId,
      companyId: route.companyId,
      driverId: body.driverId,
      routeId: body.routeId,
      latitude: body.latitude,
      longitude: body.longitude,
      locationLabel: body.locationLabel ?? null,
      occurredAt: body.occurredAt ?? new Date().toISOString()
    };

    updateDb((nextDb) => {
      nextDb.heartbeats.unshift(heartbeat);

      const mutableRoute = nextDb.routes.find((candidate) => candidate.id === body.routeId);
      if (mutableRoute) {
        mutableRoute.lastKnownPosition = {
          lat: body.latitude,
          lon: body.longitude
        };
        mutableRoute.lastHeartbeatAt = heartbeat.occurredAt;
      }

      appendEvent(nextDb, {
        type: "carrier.heartbeat",
        entityType: "route",
        entityId: body.routeId,
        payload: heartbeat
      });
      return nextDb;
    });

    sendJson(response, 202, heartbeat);
  });

  router.post("/carrier/stops/:stopId/status", async (request, response, { params }) => {
    const body = await readJsonBody(request);
    const db = readDb();
    const auth = requireAuth(request, response, db, ["driver", "ops_user"]);
    if (!auth) {
      return;
    }

    const allowedStatuses = ["pending", "arrived", "served", "failed", "skipped"];

    if (!allowedStatuses.includes(body.status)) {
      badRequest(response, "status must be one of pending, arrived, served, failed, skipped");
      return;
    }

    const existing = findStop(db, params.stopId);
    if (!existing || !entityBelongsToAuth(existing.route, auth)) {
      notFound(response, "Stop not found");
      return;
    }

    let updated = null;

    updateDb((nextDb) => {
      const found = findStop(nextDb, params.stopId);

      if (!found) {
        return nextDb;
      }

      const { route, stop } = found;
      stop.status = body.status;
      stop.note = body.note ?? stop.note;
      stop.updatedAt = new Date().toISOString();

      if (stop.orderId) {
        const order = nextDb.orders.find((candidate) => candidate.id === stop.orderId);

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

      appendEvent(nextDb, {
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
      return nextDb;
    });

    if (!updated) {
      notFound(response, "Stop not found");
      return;
    }

    sendJson(response, 200, updated);
  });

  router.post("/carrier/stops/:stopId/proof", async (request, response, { params }) => {
    const body = await readJsonBody(request);
    const db = readDb();
    const auth = requireAuth(request, response, db, ["driver", "ops_user"]);
    if (!auth) {
      return;
    }

    if (!body.deliveredAt) {
      badRequest(response, "deliveredAt is required");
      return;
    }

    const existing = findStop(db, params.stopId);
    if (!existing || !entityBelongsToAuth(existing.route, auth)) {
      notFound(response, "Stop not found");
      return;
    }

    let createdProof = null;

    updateDb((nextDb) => {
      const found = findStop(nextDb, params.stopId);

      if (!found) {
        return nextDb;
      }

      const { route, stop } = found;
      const proof = {
        id: createId("pod"),
        tenantId: route.tenantId,
        companyId: route.companyId,
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

      nextDb.proofs.unshift(proof);

      stop.status = proof.failureReasonCode ? "failed" : "served";
      stop.proofId = proof.id;
      stop.updatedAt = new Date().toISOString();

      if (stop.orderId) {
        const order = nextDb.orders.find((candidate) => candidate.id === stop.orderId);

        if (order) {
          order.status = proof.failureReasonCode ? "failed" : "completed";
          order.updatedAt = new Date().toISOString();
          order.lastProofId = proof.id;
          order.lastProofOutcomeCode = proof.failureReasonCode ? "failed" : "served";
          order.lastProofPhotoUrls = proof.photoUrls;
          order.lastProofNote = proof.note;
          order.lastProofDeliveredAt = proof.deliveredAt;
        }
      }

      updateRouteLifecycle(route);

      appendEvent(nextDb, {
        type: "proof.submitted",
        entityType: "proof",
        entityId: proof.id,
        payload: {
          routeId: route.id,
          stopId: stop.id
        }
      });

      createdProof = proof;
      return nextDb;
    });

    if (!createdProof) {
      notFound(response, "Stop not found");
      return;
    }

    sendJson(response, 201, createdProof);
  });

  router.get("/events", async (request, response, { query }) => {
    const db = readDb();
    const auth = requireAuth(request, response, db, ["ops_user"]);
    if (!auth) {
      return;
    }

    let items = scopedItems(db.events, auth, "events");
    if (query.type) {
      items = items.filter((item) => item.type === query.type);
    }

    sendJson(response, 200, {
      items,
      total: items.length
    });
  });
}
