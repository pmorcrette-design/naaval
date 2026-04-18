import { createId } from "./ids.js";

export function appendEvent(db, input) {
  db.events.unshift({
    id: createId("evt"),
    type: input.type,
    entityType: input.entityType,
    entityId: input.entityId,
    payload: input.payload ?? {},
    occurredAt: new Date().toISOString()
  });
}

