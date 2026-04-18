# Core API

This service is now scaffolded as a zero-dependency Node.js backend so it can run as soon as Node 18+ is available.

## What it includes

- `orders`: create, import, list, inspect
- `fleet`: hubs, vehicle types, vehicles, drivers, shifts
- `planning`: VRP payload build, GraphHopper call, async job polling, mock fallback
- `dispatch`: route list, route detail, route dispatch
- `execution`: carrier route view, heartbeats, stop status, proof of delivery, event log

## Run

```bash
node services/core-api/src/server.js
```

Or from the service folder:

```bash
cd services/core-api
node src/server.js
```

The default port is `3001`.

## Environment

The backend reads plain shell environment variables:

- `PORT`
- `GRAPHHOPPER_API_KEY`
- `GRAPHHOPPER_BASE_URL`
- `PLANNING_SOLVER`

If `GRAPHHOPPER_API_KEY` is absent, planning falls back to a mock solver so the product flow still works locally.

## Main endpoints

- `GET /health`
- `POST /dev/seed-demo`
- `GET /orders`
- `POST /orders`
- `POST /orders/import`
- `GET /fleet/overview`
- `POST /fleet/hubs`
- `POST /fleet/vehicle-types`
- `POST /fleet/vehicles`
- `POST /fleet/drivers`
- `POST /fleet/shifts`
- `POST /planning/optimize`
- `GET /planning/jobs/:jobId`
- `GET /plans/:planId`
- `GET /routes`
- `POST /routes/:routeId/dispatch`
- `GET /carrier/routes?driverId=...`
- `POST /carrier/check-ins`
- `POST /carrier/stops/:stopId/status`
- `POST /carrier/stops/:stopId/proof`

## Suggested demo flow

1. `POST /dev/seed-demo`
2. `POST /planning/optimize` with the seeded order and shift ids
3. `GET /plans/:planId`
4. `POST /routes/:routeId/dispatch`
5. `GET /carrier/routes?driverId=driver_amina`
6. `POST /carrier/stops/:stopId/proof`

## Persistence

Data is stored in `services/core-api/data/db.json` for now. This is intentionally simple so we can move fast, then swap the persistence layer to PostgreSQL later without changing the route contracts much.
