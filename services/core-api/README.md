# Core API

This service is now the SaaS-ready API for Naaval. It keeps the zero-dependency Node.js runtime, but now includes multi-tenant auth, tenant isolation, SaaS plans, and Naaval back-office controls.

## What it includes

- `orders`: create, import, list, inspect
- `fleet`: hubs, vehicle types, vehicles, drivers, shifts
- `auth`: company signup, ops login, customer login, tenant context
- `saas admin`: tenant list, plan/module/algorithm overrides
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

- `HOST`
- `PORT`
- `NAAVAL_DB_PATH`
- `GRAPHHOPPER_API_KEY`
- `GRAPHHOPPER_BASE_URL`
- `PLANNING_SOLVER`

If `GRAPHHOPPER_API_KEY` is absent, planning falls back to a mock solver so the product flow still works locally.

`NAAVAL_DB_PATH` lets you mount the JSON database somewhere durable when deploying to a VM or container.

## Main endpoints

- `GET /health`
- `GET /saas/catalog`
- `POST /auth/signup/company`
- `POST /auth/login`
- `POST /auth/google-ops`
- `POST /auth/customer-login`
- `POST /auth/logout`
- `GET /auth/me`
- `GET /tenant/context`
- `POST /dev/seed-demo`
- `GET /admin/tenants`
- `GET /admin/tenants/:tenantId`
- `PATCH /admin/tenants/:tenantId`
- `GET /admin/users`
- `POST /admin/users`
- `PATCH /admin/users/:userId`
- `DELETE /admin/users/:userId`
- `GET /orders`
- `POST /orders`
- `POST /orders/import`
- `PATCH /orders/:orderId`
- `POST /orders/:orderId/assignment`
- `GET /fleet/overview`
- `POST /fleet/hubs`
- `POST /fleet/vehicle-types`
- `POST /fleet/vehicles`
- `POST /fleet/drivers`
- `POST /fleet/shifts`
- `PATCH /fleet/hubs/:hubId`
- `PATCH /fleet/vehicle-types/:vehicleTypeId`
- `PATCH /fleet/vehicles/:vehicleId`
- `PATCH /fleet/drivers/:driverId`
- `PATCH /fleet/shifts/:shiftId`
- `GET /customers`
- `POST /customers`
- `PATCH /customers/:customerId`
- `GET /quotes`
- `POST /quotes`
- `GET /pricing/config`
- `PATCH /pricing/config`
- `POST /planning/optimize`
- `GET /planning/jobs`
- `GET /planning/jobs/:jobId`
- `GET /plans/:planId`
- `GET /routes`
- `POST /routes/:routeId/dispatch`
- `GET /carrier/routes?driverId=...`
- `POST /carrier/check-ins`
- `POST /carrier/stops/:stopId/status`
- `POST /carrier/stops/:stopId/proof`

## Suggested demo flow

1. `POST /auth/signup/company`
2. Persist the returned `token`
3. Send `Authorization: Bearer <token>` on all company-scoped requests
4. `POST /customers`
5. `POST /orders`
6. `POST /planning/optimize`
7. `GET /plans/:planId`
8. `POST /routes/:routeId/dispatch`

## Persistence

Data is stored in `services/core-api/data/db.json` for now. This is intentionally simple so we can move fast, then swap the persistence layer to PostgreSQL later without changing the route contracts much.

## Deployment note

For a real public API (`api.naaval.eu`), prefer a container or VM target with a durable volume:

- Render
- Railway
- Fly.io
- Hetzner / OVH VPS

Do **not** deploy this JSON-file persistence model to a serverless target like Vercel if you expect writes to persist. The API shape is ready for production, but the persistence layer should move to PostgreSQL for the final hosted SaaS version.
