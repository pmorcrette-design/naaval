# Deploy `api.naaval.eu`

## Recommended target

Use a long-running container or VM with persistent storage:

- Render Web Service + Disk
- Railway + Volume
- Fly.io + Volume
- VPS (Hetzner, OVH, Scaleway)

The current API uses a JSON file for persistence, so it should **not** be deployed to a stateless serverless platform if you need durable writes.

## Required environment variables

```bash
HOST=0.0.0.0
PORT=3001
NAAVAL_DB_PATH=/data/naaval/db.json
GRAPHHOPPER_API_KEY=your_key
GRAPHHOPPER_BASE_URL=https://graphhopper.com/api/1
PLANNING_SOLVER=auto
```

## Boot command

```bash
node services/core-api/src/server.js
```

## Health check

```bash
GET /health
```

Expected response:

```json
{
  "status": "ok",
  "service": "core-api"
}
```

## Domain mapping

Once the service is live:

1. point `api.naaval.eu` to the hosting provider
2. set `window.NAAVAL_API_BASE_URL = "https://api.naaval.eu"` in:
   - `apps/ops-web/ops-config.js`
   - `apps/marketing-site/marketing-config.js` if signup should hit the public API

## First production checks

1. `POST /auth/signup/company`
2. `POST /auth/login`
3. `GET /tenant/context`
4. `GET /admin/tenants` with a `super_admin`
5. `POST /orders`
6. `POST /planning/optimize`

## Current limitation

This API is now multi-tenant and production-shaped, but the persistence layer is still file-based. The next clean evolution is PostgreSQL plus a migration path for:

- tenants
- ops users
- sessions
- customers
- orders
- routes
- pricing configs
