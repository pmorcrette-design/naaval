import { appendEvent } from "../lib/events.js";
import {
  DEMO_TENANT_ID,
  PLATFORM_TENANT_ID,
  buildSessionPayload,
  createCompanyTenant,
  createDefaultCompanyHub,
  ensureUniqueOpsEmail,
  entityBelongsToAuth,
  findTenant,
  normalizeEmail,
  requireAuth,
  requireCompanyAdminAccess,
  requirePlatformAdminAccess,
  resolveTargetTenantId,
  resolveTenantContext,
  sanitizeOpsUserRole,
  scopedItems,
  serializeTenantRecord
} from "../lib/auth.js";
import { badRequest, notFound, readJsonBody, sendJson } from "../lib/http.js";
import { createId } from "../lib/ids.js";
import { readDb, updateDb } from "../lib/store.js";

export function registerAdminRoutes(router) {
  router.get("/admin/users", async (request, response) => {
    const db = readDb();
    const auth = requireAuth(request, response, db, ["ops_user"]);
    if (!auth) {
      return;
    }

    const items = scopedItems(db.opsUsers, auth, "opsUsers");
    sendJson(response, 200, {
      items,
      total: items.length
    });
  });

  router.post("/admin/users", async (request, response) => {
    const body = await readJsonBody(request);
    const db = readDb();
    const auth = requireAuth(request, response, db, ["ops_user"]);
    if (!auth || !requireCompanyAdminAccess(response, auth)) {
      return;
    }

    if (!body.firstName || !body.lastName || !body.email) {
      badRequest(response, "firstName, lastName and email are required");
      return;
    }

    const role = sanitizeOpsUserRole(response, auth, body.role);
    if (!role) {
      return;
    }

    if (!ensureUniqueOpsEmail(response, db, body.email)) {
      return;
    }

    let entity = null;

    updateDb((nextDb) => {
      const tenantId = resolveTargetTenantId(auth, body, role === "super_admin" || role === "naaval_admin" ? PLATFORM_TENANT_ID : DEMO_TENANT_ID);
      entity = {
        id: body.id ?? createId("ops_user"),
        tenantId,
        companyId: tenantId,
        firstName: body.firstName,
        lastName: body.lastName,
        email: normalizeEmail(body.email),
        phone: body.phone ?? "",
        role,
        team: body.team ?? "Operations",
        temporaryPassword: body.temporaryPassword ?? "demo",
        status: body.status ?? "active",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      nextDb.opsUsers.unshift(entity);
      appendEvent(nextDb, {
        type: "ops_user.created",
        entityType: "ops_user",
        entityId: entity.id,
        payload: {
          tenantId,
          email: entity.email,
          role: entity.role
        }
      });
      return nextDb;
    });

    sendJson(response, 201, entity);
  });

  router.patch("/admin/users/:userId", async (request, response, { params }) => {
    const body = await readJsonBody(request);
    const db = readDb();
    const auth = requireAuth(request, response, db, ["ops_user"]);
    if (!auth || !requireCompanyAdminAccess(response, auth)) {
      return;
    }

    const existing = db.opsUsers.find((user) => user.id === params.userId);
    if (!existing || !entityBelongsToAuth(existing, auth)) {
      notFound(response, "Ops user not found");
      return;
    }

    const nextEmail = body.email ? normalizeEmail(body.email) : existing.email;
    if (!ensureUniqueOpsEmail(response, db, nextEmail, existing.id)) {
      return;
    }

    const role = body.role ? sanitizeOpsUserRole(response, auth, body.role) : existing.role;
    if (!role) {
      return;
    }

    let entity = null;

    updateDb((nextDb) => {
      entity = nextDb.opsUsers.find((user) => user.id === params.userId);
      if (!entity) {
        return nextDb;
      }

      const tenantId = body.tenantId || body.companyId ? resolveTargetTenantId(auth, body, entity.tenantId) : entity.tenantId;
      Object.assign(entity, body, {
        id: params.userId,
        email: nextEmail,
        role,
        tenantId,
        companyId: tenantId,
        updatedAt: new Date().toISOString()
      });

      appendEvent(nextDb, {
        type: "ops_user.updated",
        entityType: "ops_user",
        entityId: entity.id,
        payload: {
          tenantId,
          email: entity.email,
          role: entity.role,
          updatedAt: entity.updatedAt
        }
      });

      return nextDb;
    });

    sendJson(response, 200, entity);
  });

  router.delete("/admin/users/:userId", async (request, response, { params }) => {
    const db = readDb();
    const auth = requireAuth(request, response, db, ["ops_user"]);
    if (!auth || !requireCompanyAdminAccess(response, auth)) {
      return;
    }

    const existing = db.opsUsers.find((user) => user.id === params.userId);
    if (!existing || !entityBelongsToAuth(existing, auth)) {
      notFound(response, "Ops user not found");
      return;
    }

    if (existing.id === auth.actor.id) {
      badRequest(response, "You cannot delete your current session user");
      return;
    }

    updateDb((nextDb) => {
      nextDb.opsUsers = nextDb.opsUsers.filter((user) => user.id !== params.userId);
      appendEvent(nextDb, {
        type: "ops_user.deleted",
        entityType: "ops_user",
        entityId: params.userId,
        payload: {
          deletedAt: new Date().toISOString()
        }
      });
      return nextDb;
    });

    sendJson(response, 200, {
      deleted: true,
      id: params.userId
    });
  });

  router.get("/admin/tenants", async (request, response) => {
    const db = readDb();
    const auth = requireAuth(request, response, db, ["ops_user"]);
    if (!auth || !requirePlatformAdminAccess(response, auth)) {
      return;
    }

    const items = db.tenants.map((tenant) => serializeTenantRecord(db, tenant));
    sendJson(response, 200, {
      items,
      total: items.length
    });
  });

  router.post("/admin/tenants", async (request, response) => {
    const body = await readJsonBody(request);
    const db = readDb();
    const auth = requireAuth(request, response, db, ["ops_user"]);
    if (!auth || !requirePlatformAdminAccess(response, auth)) {
      return;
    }

    const companyName = String(body.companyName ?? body.company ?? "").trim();
    const adminFirstName = String(body.adminFirstName ?? body.firstName ?? "").trim();
    const adminLastName = String(body.adminLastName ?? body.lastName ?? "").trim();
    const adminEmail = normalizeEmail(body.adminEmail ?? body.email);
    const adminPhone = String(body.adminPhone ?? body.phone ?? "").trim();
    const displayName = String(body.displayName ?? "").trim();
    const temporaryPassword = String(body.temporaryPassword ?? "").trim() || "demo";
    const planId = String(body.planId ?? "starter").trim() || "starter";
    const status = String(body.status ?? "active").trim() || "active";

    if (!companyName || !adminFirstName || !adminLastName || !adminEmail) {
      badRequest(response, "companyName, adminFirstName, adminLastName and adminEmail are required");
      return;
    }

    if (!ensureUniqueOpsEmail(response, db, adminEmail)) {
      return;
    }

    let tenantPayload = null;

    updateDb((nextDb) => {
      const tenant = createCompanyTenant(nextDb, {
        companyName,
        planId,
        status
      });
      if (displayName) {
        tenant.displayName = displayName;
      }
      tenant.signupMeta = {
        createdByEmail: adminEmail,
        phone: adminPhone
      };
      tenant.updatedAt = new Date().toISOString();
      createDefaultCompanyHub(nextDb, tenant);

      const timestamp = new Date().toISOString();
      const user = {
        id: createId("ops_user"),
        tenantId: tenant.id,
        companyId: tenant.id,
        firstName: adminFirstName,
        lastName: adminLastName,
        email: adminEmail,
        phone: adminPhone,
        role: "company_admin",
        team: companyName,
        temporaryPassword,
        status: "active",
        createdAt: timestamp,
        updatedAt: timestamp
      };

      nextDb.opsUsers.unshift(user);
      appendEvent(nextDb, {
        type: "ops_user.created",
        entityType: "ops_user",
        entityId: user.id,
        payload: {
          tenantId: tenant.id,
          email: user.email,
          role: user.role
        }
      });

      tenantPayload = {
        tenant: serializeTenantRecord(nextDb, tenant),
        pricingConfig: structuredClone(nextDb.tenantPricingConfigs?.[tenant.id] ?? nextDb.pricingConfig),
        tenantContext: resolveTenantContext(tenant),
        latestUsers: [structuredClone(user)]
      };
      return nextDb;
    });

    sendJson(response, 201, tenantPayload);
  });

  router.get("/admin/tenants/:tenantId", async (request, response, { params }) => {
    const db = readDb();
    const auth = requireAuth(request, response, db, ["ops_user"]);
    if (!auth || !requirePlatformAdminAccess(response, auth)) {
      return;
    }

    const tenant = findTenant(db, params.tenantId);
    if (!tenant) {
      notFound(response, "Tenant not found");
      return;
    }

    sendJson(response, 200, {
      tenant: serializeTenantRecord(db, tenant),
      pricingConfig: structuredClone(db.tenantPricingConfigs?.[tenant.id] ?? db.pricingConfig),
      tenantContext: resolveTenantContext(tenant),
      latestUsers: db.opsUsers.filter((item) => item.tenantId === tenant.id).slice(0, 10)
    });
  });

  router.patch("/admin/tenants/:tenantId", async (request, response, { params }) => {
    const body = await readJsonBody(request);
    const db = readDb();
    const auth = requireAuth(request, response, db, ["ops_user"]);
    if (!auth || !requirePlatformAdminAccess(response, auth)) {
      return;
    }

    const tenant = db.tenants.find((item) => item.id === params.tenantId);
    if (!tenant) {
      notFound(response, "Tenant not found");
      return;
    }

    let updated = null;

    updateDb((nextDb) => {
      updated = nextDb.tenants.find((item) => item.id === params.tenantId);
      if (!updated) {
        return nextDb;
      }

      if (body.companyName !== undefined) {
        updated.companyName = String(body.companyName).trim() || updated.companyName;
      }
      if (body.slug !== undefined) {
        updated.slug = String(body.slug).trim() || updated.slug;
      }
      if (body.status !== undefined) {
        updated.status = String(body.status).trim() || updated.status;
      }
      if (body.planId !== undefined) {
        updated.planId = String(body.planId).trim() || updated.planId;
      }
      if (Array.isArray(body.enabledModules)) {
        updated.enabledModules = [...new Set(body.enabledModules.map(String))];
      }
      if (Array.isArray(body.disabledModules)) {
        updated.disabledModules = [...new Set(body.disabledModules.map(String))];
      }
      if (Array.isArray(body.enabledAlgorithms)) {
        updated.enabledAlgorithms = [...new Set(body.enabledAlgorithms.map(String))];
      }
      if (Array.isArray(body.disabledAlgorithms)) {
        updated.disabledAlgorithms = [...new Set(body.disabledAlgorithms.map(String))];
      }
      if (body.usageOverrides && typeof body.usageOverrides === "object" && !Array.isArray(body.usageOverrides)) {
        updated.usageOverrides = structuredClone(body.usageOverrides);
      }
      if (body.moduleOverrides && typeof body.moduleOverrides === "object" && !Array.isArray(body.moduleOverrides)) {
        updated.moduleOverrides = structuredClone(body.moduleOverrides);
      }
      if (body.algorithmOverrides && typeof body.algorithmOverrides === "object" && !Array.isArray(body.algorithmOverrides)) {
        updated.algorithmOverrides = structuredClone(body.algorithmOverrides);
      }

      updated.updatedAt = new Date().toISOString();

      appendEvent(nextDb, {
        type: "tenant.updated",
        entityType: "tenant",
        entityId: updated.id,
        payload: {
          planId: updated.planId,
          status: updated.status,
          updatedAt: updated.updatedAt
        }
      });

      return nextDb;
    });

    sendJson(response, 200, {
      tenant: serializeTenantRecord(readDb(), updated)
    });
  });

  router.get("/admin/backoffice/overview", async (request, response) => {
    const db = readDb();
    const auth = requireAuth(request, response, db, ["ops_user"]);
    if (!auth || !requirePlatformAdminAccess(response, auth)) {
      return;
    }

    const managedTenants = db.tenants.filter((tenant) => tenant.id !== PLATFORM_TENANT_ID);
    const activeTenants = managedTenants.filter((tenant) => tenant.status === "active");
    const context = resolveTenantContext(findTenant(db, PLATFORM_TENANT_ID));
    const totalMrrEur = managedTenants.reduce((sum, tenant) => sum + (Number(resolveTenantContext(tenant)?.plan?.monthlyPriceEur ?? 0) || 0), 0);
    sendJson(response, 200, {
      signedUpCompanies: managedTenants.length,
      tenants: managedTenants.length,
      activeTenants: activeTenants.length,
      trialTenants: managedTenants.filter((tenant) => tenant.planId === "trial").length,
      platformUsers: db.opsUsers.filter((user) => user.tenantId === PLATFORM_TENANT_ID).length,
      companyAdmins: db.opsUsers.filter((user) => user.role === "company_admin").length,
      activeRoutes: db.routes.filter((route) => route.status === "in_progress" || route.status === "dispatched").length,
      totalOrders: db.orders.length,
      totalMrrEur,
      internalTenantContext: context
    });
  });

  router.get("/admin/session/bootstrap", async (request, response) => {
    const db = readDb();
    const auth = requireAuth(request, response, db, ["ops_user"]);
    if (!auth) {
      return;
    }

    sendJson(response, 200, buildSessionPayload(auth.session, auth.actor, auth.tenant));
  });
}
