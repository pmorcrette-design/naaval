import { appendEvent } from "../lib/events.js";
import { badRequest, notFound, readJsonBody, sendJson } from "../lib/http.js";
import { createId } from "../lib/ids.js";
import { readDb, updateDb } from "../lib/store.js";

export function registerAdminRoutes(router) {
  router.get("/admin/users", async (_request, response) => {
    const db = readDb();
    sendJson(response, 200, {
      items: db.opsUsers,
      total: db.opsUsers.length
    });
  });

  router.post("/admin/users", async (request, response) => {
    const body = await readJsonBody(request);

    if (!body.firstName || !body.lastName || !body.email) {
      badRequest(response, "firstName, lastName and email are required");
      return;
    }

    let entity = null;

    updateDb((db) => {
      entity = {
        id: body.id ?? createId("ops_user"),
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        role: body.role ?? "ops_agent",
        team: body.team ?? "Operations",
        temporaryPassword: body.temporaryPassword ?? "",
        status: body.status ?? "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      db.opsUsers.unshift(entity);
      appendEvent(db, {
        type: "ops_user.created",
        entityType: "ops_user",
        entityId: entity.id,
        payload: entity
      });
      return db;
    });

    sendJson(response, 201, entity);
  });

  router.delete("/admin/users/:userId", async (request, response) => {
    const existing = readDb().opsUsers.find((user) => user.id === request.params.userId);
    if (!existing) {
      notFound(response, "Ops user not found");
      return;
    }

    updateDb((db) => {
      db.opsUsers = db.opsUsers.filter((user) => user.id !== request.params.userId);
      appendEvent(db, {
        type: "ops_user.deleted",
        entityType: "ops_user",
        entityId: request.params.userId,
        payload: {
          deletedAt: new Date().toISOString()
        }
      });
      return db;
    });

    sendJson(response, 200, {
      deleted: true,
      id: request.params.userId
    });
  });
}
