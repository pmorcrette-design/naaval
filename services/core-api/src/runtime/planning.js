import { appendEvent } from "../lib/events.js";
import { entityBelongsToAuth, requireAuth, scopedItems } from "../lib/auth.js";
import { badRequest, notFound, readJsonBody, sendJson } from "../lib/http.js";
import { createId } from "../lib/ids.js";
import { readDb, updateDb, writeDb } from "../lib/store.js";

function createCapacityArray(orderOrVehicleType) {
  const capacity = orderOrVehicleType.capacity ?? {};
  return [capacity.parcels ?? orderOrVehicleType.parcelCount ?? 0, capacity.weightKg ?? orderOrVehicleType.weightKg ?? 0, capacity.volumeDm3 ?? orderOrVehicleType.volumeDm3 ?? 0];
}

function toEpochSeconds(value) {
  return Math.floor(new Date(value).getTime() / 1000);
}

function toGraphhopperAddress(locationId, address) {
  if (!address?.coordinates) {
    throw new Error(`Coordinates are required for ${locationId}`);
  }

  return {
    location_id: locationId,
    lat: address.coordinates.lat,
    lon: address.coordinates.lon
  };
}

function buildObjectives(preset) {
  if (preset === "fleet_min") {
    return [
      { type: "min", value: "vehicles" },
      { type: "min", value: "completion_time" }
    ];
  }

  if (preset === "speed") {
    return [
      { type: "min", value: "completion_time" },
      { type: "min", value: "transport_time" }
    ];
  }

  return [
    { type: "min", value: "vehicles" },
    { type: "min", value: "completion_time" },
    { type: "min", value: "transport_time" }
  ];
}

function buildGraphhopperProblem({ orders, shifts, vehicleTypes, objectivePreset }) {
  const services = [];
  const shipments = [];

  for (const order of orders) {
    if (order.kind === "pickup_delivery" || order.kind === "return") {
      if (!order.pickupAddress?.coordinates || !order.dropoffAddress?.coordinates) {
        throw new Error(`Order ${order.id} requires pickup and dropoff coordinates`);
      }

      shipments.push({
        id: order.id,
        name: order.reference,
        pickup: {
          address: toGraphhopperAddress(`order:${order.id}:pickup`, order.pickupAddress),
          duration: order.serviceDurationSeconds
        },
        delivery: {
          address: toGraphhopperAddress(`order:${order.id}:dropoff`, order.dropoffAddress),
          duration: order.serviceDurationSeconds
        },
        size: createCapacityArray(order),
        required_skills: order.requiredSkills ?? [],
        priority: order.priority ?? 0
      });

      continue;
    }

    services.push({
      id: order.id,
      name: order.reference,
      address: toGraphhopperAddress(`order:${order.id}:dropoff`, order.dropoffAddress),
      duration: order.serviceDurationSeconds,
      size: createCapacityArray(order),
      required_skills: order.requiredSkills ?? [],
      priority: order.priority ?? 0,
      time_windows: (order.timeWindows ?? []).map((window) => ({
        earliest: toEpochSeconds(window.start),
        latest: toEpochSeconds(window.end)
      }))
    });
  }

  return {
    vehicles: shifts.map((shift) => ({
      vehicle_id: shift.id,
      type_id: shift.vehicleTypeId,
      start_address: toGraphhopperAddress(`shift:${shift.id}:start`, {
        coordinates: shift.startCoordinates
      }),
      end_address: shift.endCoordinates
        ? toGraphhopperAddress(`shift:${shift.id}:end`, {
            coordinates: shift.endCoordinates
          })
        : undefined,
      earliest_start: toEpochSeconds(shift.startAt),
      latest_end: toEpochSeconds(shift.endAt),
      skills: shift.skills ?? []
    })),
    vehicle_types: vehicleTypes.map((vehicleType) => ({
      type_id: vehicleType.id,
      profile: vehicleType.routingProfile,
      capacity: createCapacityArray(vehicleType)
    })),
    services,
    shipments,
    objectives: buildObjectives(objectivePreset)
  };
}

async function graphhopperRequest(config, path, body) {
  const separator = path.includes("?") ? "&" : "?";
  const url = `${config.graphhopperBaseUrl}${path}${separator}key=${config.graphhopperApiKey}`;

  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: body
      ? {
          "Content-Type": "application/json"
        }
      : undefined,
    body: body ? JSON.stringify(body) : undefined
  });

  if (!response.ok) {
    throw new Error(`GraphHopper request failed with status ${response.status}`);
  }

  return response.json();
}

function createRouteStop(routeId, order, kind, sequence, arrivalAt, departureAt) {
  const address = kind === "pickup" ? order.pickupAddress : order.dropoffAddress;

  return {
    id: `${routeId}_stop_${sequence}`,
    orderId: order.id,
    sequence,
    kind,
    address,
    plannedArrivalAt: arrivalAt,
    plannedDepartureAt: departureAt,
    status: "pending"
  };
}

function buildMockRoutes({ planId, shifts, orders }) {
  const buckets = shifts.map((shift) => ({
    shift,
    orders: []
  }));

  const orderedOrders = [...orders].sort((left, right) => {
    const leftWindow = left.timeWindows?.[0]?.start ?? left.createdAt;
    const rightWindow = right.timeWindows?.[0]?.start ?? right.createdAt;
    return leftWindow.localeCompare(rightWindow);
  });

  orderedOrders.forEach((order, index) => {
    if (buckets.length === 0) {
      return;
    }

    buckets[index % buckets.length].orders.push(order);
  });

  return buckets
    .filter((bucket) => bucket.orders.length > 0)
    .map((bucket) => {
      const routeId = createId("route");
      let currentTime = new Date(bucket.shift.startAt).getTime();
      let sequence = 1;
      const stops = [];

      for (const order of bucket.orders) {
        if ((order.kind === "pickup_delivery" || order.kind === "return") && order.pickupAddress) {
          const pickupArrival = new Date(currentTime + 10 * 60 * 1000).toISOString();
          currentTime += 10 * 60 * 1000 + order.serviceDurationSeconds * 1000;
          const pickupDeparture = new Date(currentTime).toISOString();
          stops.push(createRouteStop(routeId, order, "pickup", sequence, pickupArrival, pickupDeparture));
          sequence += 1;
        }

        const deliveryArrival = new Date(currentTime + 15 * 60 * 1000).toISOString();
        currentTime += 15 * 60 * 1000 + order.serviceDurationSeconds * 1000;
        const deliveryDeparture = new Date(currentTime).toISOString();
        stops.push(createRouteStop(routeId, order, "delivery", sequence, deliveryArrival, deliveryDeparture));
        sequence += 1;
      }

      return {
        id: routeId,
        tenantId: bucket.orders[0]?.tenantId ?? bucket.shift.tenantId ?? null,
        companyId: bucket.orders[0]?.companyId ?? bucket.shift.companyId ?? null,
        planId,
        shiftId: bucket.shift.id,
        driverId: bucket.shift.driverId,
        vehicleId: bucket.shift.vehicleId,
        status: "ready",
        source: "mock",
        totalDistanceMeters: stops.length * 4500,
        totalDurationSeconds: Math.round((currentTime - new Date(bucket.shift.startAt).getTime()) / 1000),
        stops
      };
    });
}

function mapActivityKind(activityType) {
  if (activityType === "pickupShipment") {
    return "pickup";
  }

  if (activityType === "break") {
    return "break";
  }

  return "delivery";
}

function hydrateGraphhopperRoutes({ planId, solution, shifts, orders }) {
  const orderMap = new Map(orders.map((order) => [order.id, order]));

  return (solution.solution?.routes ?? []).map((route) => {
    const shift = shifts.find((candidate) => candidate.id === route.vehicle_id);

    if (!shift) {
      throw new Error(`Unknown shift returned by GraphHopper: ${route.vehicle_id}`);
    }

    const routeId = createId("route");
    const stops = route.activities
      .filter((activity) => activity.type !== "start" && activity.type !== "end")
      .map((activity, index) => {
        const order = activity.id ? orderMap.get(activity.id) : null;
        const kind = mapActivityKind(activity.type);

        let address = {
          label: activity.location_id ?? "planned stop",
          street1: "Unknown",
          city: "Unknown",
          postalCode: "Unknown",
          countryCode: "XX",
          coordinates:
            activity.address?.lat !== undefined && activity.address?.lon !== undefined
              ? {
                  lat: activity.address.lat,
                  lon: activity.address.lon
                }
              : undefined
        };

        if (order) {
          address =
            kind === "pickup" && order.pickupAddress
              ? order.pickupAddress
              : order.dropoffAddress;
        }

        return {
          id: `${routeId}_stop_${index + 1}`,
          orderId: order?.id ?? activity.id ?? null,
          sequence: index + 1,
          kind,
          address,
          plannedArrivalAt:
            activity.arr_time !== undefined
              ? new Date(activity.arr_time * 1000).toISOString()
              : undefined,
          plannedDepartureAt:
            activity.end_time !== undefined
              ? new Date(activity.end_time * 1000).toISOString()
              : undefined,
          status: "pending"
        };
      });

    return {
      id: routeId,
      tenantId: orders.find((order) => route.activities.some((activity) => activity.id === order.id))?.tenantId ?? shift.tenantId ?? null,
      companyId: orders.find((order) => route.activities.some((activity) => activity.id === order.id))?.companyId ?? shift.companyId ?? null,
      planId,
      shiftId: shift.id,
      driverId: shift.driverId,
      vehicleId: shift.vehicleId,
      status: "ready",
      source: "graphhopper",
      totalDistanceMeters: route.distance ?? 0,
      totalDurationSeconds: route.completion_time ?? 0,
      stops
    };
  });
}

function persistFinishedPlan(db, planId, routes) {
  db.routes = db.routes.filter((route) => route.planId !== planId);
  db.routes.push(...routes);

  const routeOrderIds = new Set();

  for (const route of routes) {
    for (const stop of route.stops) {
      if (stop.orderId) {
        routeOrderIds.add(stop.orderId);
      }
    }
  }

  for (const order of db.orders) {
    if (routeOrderIds.has(order.id)) {
      order.status = "planned";
      order.updatedAt = new Date().toISOString();
    }
  }
}

function buildPlanResponse(db, planId) {
  const plan = db.planningJobs.find((job) => job.id === planId);

  if (!plan) {
    return null;
  }

  return {
    plan,
    routes: db.routes.filter((route) => route.planId === planId),
    orders: db.orders.filter((order) => plan.orderIds.includes(order.id))
  };
}

async function refreshPlanningJob(db, config, planningJob) {
  if (planningJob.status === "finished" || !planningJob.externalJobId) {
    return planningJob;
  }

  const solution = await graphhopperRequest(config, `/vrp/solution/${planningJob.externalJobId}`);

  planningJob.updatedAt = new Date().toISOString();
  planningJob.externalStatus = solution.status;

  if (solution.status !== "finished") {
    planningJob.status = solution.status;
    return planningJob;
  }

  const orders = db.orders.filter((order) => planningJob.orderIds.includes(order.id));
  const shifts = db.shifts.filter((shift) => planningJob.driverShiftIds.includes(shift.id));
  const routes = hydrateGraphhopperRoutes({
    planId: planningJob.id,
    solution,
    shifts,
    orders
  });

  persistFinishedPlan(db, planningJob.id, routes);
  planningJob.status = "finished";
  planningJob.routeIds = routes.map((route) => route.id);
  planningJob.completedAt = new Date().toISOString();
  appendEvent(db, {
    type: "planning.finished",
    entityType: "plan",
    entityId: planningJob.id,
    payload: {
      routeCount: routes.length
    }
  });

  return planningJob;
}

export function registerPlanningRoutes(router, config) {
  router.post("/planning/optimize", async (request, response) => {
    const body = await readJsonBody(request);
    const db = readDb();
    const auth = requireAuth(request, response, db, ["ops_user"]);
    if (!auth) {
      return;
    }

    if (!body.hubId || !body.planDate || !Array.isArray(body.orderIds) || !Array.isArray(body.driverShiftIds)) {
      badRequest(response, "hubId, planDate, orderIds[] and driverShiftIds[] are required");
      return;
    }

    const orders = scopedItems(db.orders, auth, "orders").filter((order) => body.orderIds.includes(order.id));
    const shifts = scopedItems(db.shifts, auth, "shifts").filter((shift) => body.driverShiftIds.includes(shift.id));
    const vehicleTypes = scopedItems(db.vehicleTypes, auth, "vehicleTypes").filter((vehicleType) =>
      shifts.some((shift) => shift.vehicleTypeId === vehicleType.id)
    );

    if (orders.length === 0) {
      badRequest(response, "No orders found for orderIds");
      return;
    }

    if (shifts.length === 0) {
      badRequest(response, "No shifts found for driverShiftIds");
      return;
    }

    if (vehicleTypes.length === 0) {
      badRequest(response, "No vehicle types found for the selected shifts");
      return;
    }

    const objectivePreset = body.objectivePreset ?? "balanced";
    const requestedSolver = body.solver ?? config.defaultSolver;
    const solver =
      requestedSolver === "graphhopper"
        ? "graphhopper"
        : requestedSolver === "mock"
          ? "mock"
          : config.graphhopperApiKey
            ? "graphhopper"
            : "mock";

    const planId = createId("plan");

    try {
      const problem = buildGraphhopperProblem({
        orders,
        shifts,
        vehicleTypes,
        objectivePreset
      });

      if (solver === "graphhopper") {
        const useAsync = body.async === true || orders.length > 25;

        if (useAsync) {
          const optimizeResult = await graphhopperRequest(config, "/vrp/optimize", problem);

          updateDb((nextDb) => {
            nextDb.planningJobs.push({
              id: planId,
              tenantId: auth.tenantId,
              companyId: auth.companyId,
              hubId: body.hubId,
              planDate: body.planDate,
              orderIds: body.orderIds,
              driverShiftIds: body.driverShiftIds,
              objectivePreset,
              solver,
              status: "processing",
              externalStatus: "processing",
              externalJobId: optimizeResult.job_id,
              routeIds: [],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            });
            appendEvent(nextDb, {
              type: "planning.started",
              entityType: "plan",
              entityId: planId,
              payload: {
                solver,
                async: true
              }
            });
            return nextDb;
          });

          sendJson(response, 202, {
            planningJobId: planId,
            externalJobId: optimizeResult.job_id,
            status: "processing",
            solver
          });
          return;
        }

        const solution = await graphhopperRequest(config, "/vrp", problem);
        const routes = hydrateGraphhopperRoutes({
          planId,
          solution,
          shifts,
          orders
        });

        updateDb((nextDb) => {
            nextDb.planningJobs.push({
              id: planId,
              tenantId: auth.tenantId,
              companyId: auth.companyId,
              hubId: body.hubId,
            planDate: body.planDate,
            orderIds: body.orderIds,
            driverShiftIds: body.driverShiftIds,
            objectivePreset,
            solver,
            status: "finished",
            externalStatus: solution.status ?? "finished",
            externalJobId: solution.job_id ?? null,
            routeIds: routes.map((route) => route.id),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            completedAt: new Date().toISOString()
          });
          persistFinishedPlan(nextDb, planId, routes);
          appendEvent(nextDb, {
            type: "planning.finished",
            entityType: "plan",
            entityId: planId,
            payload: {
              solver,
              routeCount: routes.length
            }
          });
          return nextDb;
        });

        sendJson(response, 202, {
          planningJobId: planId,
          status: "finished",
          solver
        });
        return;
      }

      const routes = buildMockRoutes({
        planId,
        shifts,
        orders
      });

      updateDb((nextDb) => {
        nextDb.planningJobs.push({
          id: planId,
          tenantId: auth.tenantId,
          companyId: auth.companyId,
          hubId: body.hubId,
          planDate: body.planDate,
          orderIds: body.orderIds,
          driverShiftIds: body.driverShiftIds,
          objectivePreset,
          solver,
          status: "finished",
          externalStatus: "mock_finished",
          externalJobId: null,
          routeIds: routes.map((route) => route.id),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          problem
        });
        persistFinishedPlan(nextDb, planId, routes);
        appendEvent(nextDb, {
          type: "planning.finished",
          entityType: "plan",
          entityId: planId,
          payload: {
            solver,
            routeCount: routes.length
          }
        });
        return nextDb;
      });

      sendJson(response, 202, {
        planningJobId: planId,
        status: "finished",
        solver
      });
    } catch (error) {
      badRequest(response, error.message);
    }
  });

  router.get("/planning/jobs", async (request, response) => {
    const db = readDb();
    const auth = requireAuth(request, response, db, ["ops_user"]);
    if (!auth) {
      return;
    }

    const items = scopedItems(db.planningJobs, auth, "planningJobs");
    sendJson(response, 200, {
      items,
      total: items.length
    });
  });

  router.get("/planning/jobs/:jobId", async (request, response, { params }) => {
    try {
      const db = readDb();
      const auth = requireAuth(request, response, db, ["ops_user"]);
      if (!auth) {
        return;
      }
      const planningJob = db.planningJobs.find((job) => job.id === params.jobId);

      if (!planningJob || !entityBelongsToAuth(planningJob, auth)) {
        notFound(response, "Planning job not found");
        return;
      }

      if (planningJob.solver === "graphhopper" && planningJob.status !== "finished" && planningJob.externalJobId) {
        await refreshPlanningJob(db, config, planningJob);
        writeDb(db);
      }

      sendJson(response, 200, db.planningJobs.find((job) => job.id === params.jobId));
    } catch (error) {
      badRequest(response, error.message);
    }
  });

  router.get("/plans/:planId", async (request, response, { params }) => {
    const db = readDb();
    const auth = requireAuth(request, response, db, ["ops_user", "customer", "driver"]);
    if (!auth) {
      return;
    }
    const payload = buildPlanResponse(db, params.planId);

    if (!payload || !entityBelongsToAuth(payload.plan, auth)) {
      notFound(response, "Plan not found");
      return;
    }

    sendJson(response, 200, payload);
  });
}
