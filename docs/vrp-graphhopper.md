# GraphHopper VRP Integration

This platform is designed around the official GraphHopper Route Optimization API documented here:

- https://docs.graphhopper.com/openapi/route-optimization

## Why GraphHopper fits this use case

According to the official documentation, the API models:

- vehicles
- vehicle types
- services
- shipments
- skills
- multiple time windows
- objective functions
- async optimization jobs via `/vrp/optimize`

That makes it a good match for city last-mile operations with shifts, depot starts, capacities, and mixed stop constraints.

## Mapping strategy

### Vehicles

Map each active shift to a GraphHopper vehicle:

- `vehicle_id`: internal shift id
- `type_id`: bike, scooter, van, etc.
- `start_address`: hub or first-mile origin
- `end_address`: optional return hub
- `earliest_start` and `latest_end`: shift boundaries
- `skills`: chilled, fragile, heavy-lift, ADR, etc.

### Orders

Use:

- `services` for single-stop jobs such as a pure delivery
- `shipments` for pickup + delivery pairs or reverse logistics

Model each order with:

- coordinates
- service duration
- size dimensions
- required skills
- priority
- allowed time windows

### Objectives

A practical default objective stack:

1. Minimize number of vehicles used
2. Minimize completion time
3. Minimize transport time

This should remain configurable per operation because some networks prefer route balance over vehicle minimization.

## Planning lifecycle

1. Collect candidate orders for a planning wave.
2. Validate geocodes, capacities, and time windows.
3. Build GraphHopper payload from orders + fleet + business rules.
4. Call `/vrp` for small synchronous solves or `/vrp/optimize` for heavier jobs.
5. Poll `/vrp/solution/{jobId}` for async jobs.
6. Persist the solution as an internal route plan.
7. Allow operators to manually adjust before dispatch.
8. Trigger re-optimization when incidents or same-day insertions occur.

## Operational rules outside the solver

Do not push every business rule into GraphHopper. Keep these rules in your own platform:

- merchant visibility rules
- carrier payment logic
- user permissions
- customer notifications
- SLA breach policies
- proof-of-delivery validation
- dispute handling

## Recommended optimization inputs

- planning date
- hub or operating area
- available drivers and vehicles
- shift windows and breaks
- parcel dimensions
- service time per stop
- promised time windows
- route wave or cut-off
- zone restrictions
- vehicle or driver skills

## Re-optimization triggers

- urgent same-day insertion
- driver no-show
- vehicle breakdown
- cascading lateness
- failed pickup
- merchant cancellation

