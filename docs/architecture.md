# Architecture Blueprint

## Product surfaces

### Ops Web

Used by:

- Operations managers
- Dispatchers
- Customer support
- Finance and billing teams

Main capabilities:

- Customer and account setup
- Delivery order intake
- Planning board
- Dispatch console
- Live map and route monitoring
- Incident handling
- Billing export and KPI dashboards

### Carrier App

Used by:

- Drivers
- Owner-drivers
- Carrier partners

Main capabilities:

- Authentication and shift start
- Route acceptance
- Stop-by-stop execution
- Navigation handoff
- Scan, pickup, delivery, and proof capture
- Exception declaration
- Offline sync for low-connectivity areas

### Core API

Responsibilities:

- Multi-tenant business logic
- Order lifecycle
- Fleet and workforce data
- Planning orchestration
- Dispatch, tracking, and event sourcing
- Proof of delivery persistence
- Billing and reporting feeds

## Bounded contexts

- `identity`: companies, users, roles, and permissions
- `catalog`: service areas, hubs, zones, vehicle types, and customer constraints
- `orders`: consignments, pickups, deliveries, time windows, and SLA rules
- `planning`: VRP payload building, optimization jobs, plan persistence, and replanning
- `dispatch`: run assignment, route publication, and route overrides
- `execution`: live position, stop status, proof of delivery, incident handling
- `billing`: completed tasks, surcharges, incentives, and exports

## Suggested runtime stack

- Frontend web: Next.js + TypeScript
- Mobile: Expo React Native + TypeScript
- Backend: NestJS or Fastify + TypeScript
- Database: PostgreSQL
- Cache and queues: Redis
- File storage: S3-compatible storage
- Maps and optimization: GraphHopper Directions API + Route Optimization API
- Notifications: email, SMS, WhatsApp, push notifications

## System flow

1. Orders are imported from merchants, marketplaces, or internal operators.
2. Orders are normalized into a canonical delivery model.
3. Planning builds a VRP input from orders, fleet, shifts, zones, and constraints.
4. GraphHopper solves the VRP and returns routes or an async job id.
5. The platform persists the generated plan and exposes manual override tools.
6. Dispatch publishes routes to the carrier app.
7. Drivers execute stops and send back events, positions, and proof of delivery.
8. Billing and KPI layers consume the final execution data.

## Data ownership

- Your platform owns customers, orders, routes, assignments, stop events, and proofs.
- GraphHopper is treated as a solver, not as the source of truth.
- Mobile devices are write-through clients with offline buffering.

## Non-functional requirements

- Multi-tenant isolation
- Role-based access control
- Immutable operational event log
- Re-optimization support during the day
- Soft real-time position updates
- Auditability for customer claims and billing disputes

