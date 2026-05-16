import { appendEvent } from "../lib/events.js";
import { entityBelongsToAuth, requireAuth, scopedItems } from "../lib/auth.js";
import { badRequest, notFound, readJsonBody, sendJson } from "../lib/http.js";
import { readDb, updateDb } from "../lib/store.js";

export function registerDispatchRoutes(router) {
  router.get("/routes", async (request, response, { query }) => {
    const db = readDb();
    const auth = requireAuth(request, response, db, ["ops_user", "driver", "customer"]);
    if (!auth) {
      return;
    }

    let items = [...scopedItems(db.routes, auth, "routes")];

    if (query.status) {
      items = items.filter((route) => route.status === query.status);
    }

    if (query.driverId) {
      items = items.filter((route) => route.driverId === query.driverId);
    }

    if (query.planId) {
      items = items.filter((route) => route.planId === query.planId);
    }

    sendJson(response, 200, {
      items,
      total: items.length
    });
  });

  router.get("/routes/:routeId", async (request, response, { params }) => {
    const db = readDb();
    const auth = requireAuth(request, response, db, ["ops_user", "driver", "customer"]);
    if (!auth) {
      return;
    }

    const route = db.routes.find((candidate) => candidate.id === params.routeId);

    if (!route || !entityBelongsToAuth(route, auth)) {
      notFound(response, "Route not found");
      return;
    }

    sendJson(response, 200, route);
  });

  router.post("/routes/:routeId/dispatch", async (request, response, { params }) => {
    const body = await readJsonBody(request);
    const db = readDb();
    const auth = requireAuth(request, response, db, ["ops_user"]);
    if (!auth) {
      return;
    }

    const existingRoute = db.routes.find((candidate) => candidate.id === params.routeId);
    if (!existingRoute || !entityBelongsToAuth(existingRoute, auth)) {
      notFound(response, "Route not found");
      return;
    }

    const effectiveDriverId = body.driverId ?? existingRoute.driverId;

    if (!effectiveDriverId) {
      badRequest(response, "Route has no driverId. Provide driverId in the request body.");
      return;
    }

    let dispatchedRoute = null;

    updateDb((nextDb) => {
      const route = nextDb.routes.find((candidate) => candidate.id === params.routeId);

      if (!route) {
        return nextDb;
      }

      route.driverId = effectiveDriverId;
      route.status = "dispatched";
      route.dispatchedAt = new Date().toISOString();
      route.updatedAt = new Date().toISOString();
      dispatchedRoute = route;

      for (const stop of route.stops) {
        if (!stop.orderId) {
          continue;
        }

        const order = nextDb.orders.find((candidate) => candidate.id === stop.orderId);
        if (order) {
          order.status = "dispatched";
          order.updatedAt = new Date().toISOString();
        }
      }

      appendEvent(nextDb, {
        type: "route.dispatched",
        entityType: "route",
        entityId: route.id,
        payload: {
          driverId: route.driverId
        }
      });

      return nextDb;
    });

    if (!dispatchedRoute) {
      notFound(response, "Route not found");
      return;
    }

    sendJson(response, 200, dispatchedRoute);
  });
}
