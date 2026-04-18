# LMD Control Tower

This repository is a foundation for a Shippr-like last-mile delivery platform.
It is designed around three product surfaces:

1. `ops-web`: the back-office and dispatch tower for planners, dispatchers, and support teams.
2. `carrier-app`: the field app used by drivers and couriers.
3. `core-api`: the domain backend that orchestrates orders, routing, dispatch, tracking, proof of delivery, and billing inputs.

The route optimization layer is designed to integrate with the official GraphHopper Route Optimization API and model a full vehicle routing problem (VRP) using vehicles, services, shipments, objectives, and time constraints.

## What is already in this repo

- A product and technical architecture baseline
- A business scope for a full LMD company
- A GraphHopper VRP integration blueprint
- An initial OpenAPI contract
- Shared domain and contract packages
- Backend skeleton code for planning and courier workflows

## What is intentionally not done yet

The current environment does not have Node.js or pnpm installed, so this repository contains a scaffold and design baseline instead of a runnable application. Once the runtime is available, the next step is to turn these packages into:

- `apps/ops-web`: Next.js control tower
- `apps/carrier-app`: Expo React Native app
- `services/core-api`: NestJS or Fastify backend

Environment variables can start from `.env.example`.

## Suggested product modules

- Order ingestion and SLA validation
- Fleet, drivers, shifts, and capacity management
- Automatic planning with GraphHopper VRP
- Manual dispatch and route overrides
- Live tracking and ETA monitoring
- Driver mobile flows and proof of delivery
- Incident and exception management
- Pricing, invoicing inputs, and customer reporting

## Repository layout

```text
apps/
  carrier-app/
  ops-web/
docs/
  api/
infra/
packages/
  contracts/
  domain/
services/
  core-api/
```

## Key design choices

- Keep optimization as a dedicated planning capability, not mixed with order CRUD.
- Persist the canonical plan in your own database even if the optimization is outsourced.
- Separate order import, optimization, dispatch, and execution into distinct stages.
- Treat the carrier app as an execution tool with offline resilience and exception-first UX.

## Recommended first delivery milestone

1. Import same-day and scheduled delivery orders.
2. Model fleet, shifts, vehicle capacities, zones, and skills.
3. Optimize routes with GraphHopper.
4. Dispatch runs to drivers.
5. Let drivers execute stops, report incidents, and capture proof of delivery.
6. Surface a live control tower with route progress and SLA alerts.

## Source references

- GraphHopper Route Optimization API: https://docs.graphhopper.com/openapi/route-optimization
- GraphHopper Directions API overview: https://docs.graphhopper.com/
