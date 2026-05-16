import { createId } from "./ids.js";

export function appendEvent(db, input) {
  db.events.unshift({
    id: createId("evt"),
    tenantId: input.tenantId ?? input.payload?.tenantId ?? null,
    companyId: input.companyId ?? input.payload?.companyId ?? input.payload?.tenantId ?? null,
    type: input.type,
    entityType: input.entityType,
    entityId: input.entityId,
    payload: input.payload ?? {},
    occurredAt: new Date().toISOString()
  });
}
