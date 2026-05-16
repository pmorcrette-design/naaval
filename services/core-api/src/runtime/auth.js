import { appendEvent } from "../lib/events.js";
import {
  DEFAULT_SIGNUP_PLAN_ID,
  DEMO_TENANT_ID,
  PLATFORM_TENANT_ID,
  algorithmCatalog,
  buildSessionPayload,
  createAuthSession,
  createCompanyTenant,
  createDefaultCompanyHub,
  findTenant,
  moduleCatalog,
  normalizeEmail,
  requireAuth,
  resolveAuthSession,
  resolvePlan,
  resolveTenantContext,
  saasPlanCatalog
} from "../lib/auth.js";
import { badRequest, conflict, readJsonBody, sendJson } from "../lib/http.js";
import { verifyGoogleIdCredential } from "../lib/google.js";
import { createId } from "../lib/ids.js";
import { readDb, updateDb } from "../lib/store.js";

function serializeActor(actor) {
  if (!actor) {
    return null;
  }

  return structuredClone(actor);
}

function buildUnauthorizedPayload(message) {
  return {
    error: {
      code: "unauthorized",
      message
    }
  };
}

export function registerAuthRoutes(router, config) {
  router.get("/saas/catalog", async (_request, response) => {
    sendJson(response, 200, {
      plans: Object.values(saasPlanCatalog()),
      modules: moduleCatalog(),
      algorithms: algorithmCatalog()
    });
  });

  router.post("/auth/login", async (request, response) => {
    const body = await readJsonBody(request);
    const email = normalizeEmail(body.email);
    const password = String(body.password ?? "").trim();

    if (!email || !password) {
      badRequest(response, "email and password are required");
      return;
    }

    let payload = null;

    updateDb((db) => {
      const user = db.opsUsers.find((candidate) => normalizeEmail(candidate.email) === email);
      if (!user || String(user.status ?? "active") !== "active") {
        payload = { error: "Invalid credentials", statusCode: 401 };
        return db;
      }

      const expectedPassword = String(user.temporaryPassword ?? "").trim() || "demo";
      if (password !== expectedPassword) {
        payload = { error: "Invalid credentials", statusCode: 401 };
        return db;
      }

      const tenant = findTenant(db, user.tenantId);
      const session = createAuthSession(db, {
        actorType: "ops_user",
        actor: user,
        tenantId: String(user.tenantId ?? DEMO_TENANT_ID),
        role: String(user.role ?? "company_user"),
        source: "password"
      });

      payload = buildSessionPayload(session, serializeActor(user), tenant);
      return db;
    });

    if (payload?.error) {
      sendJson(response, payload.statusCode, buildUnauthorizedPayload(payload.error));
      return;
    }

    sendJson(response, 200, payload);
  });

  router.post("/auth/google-ops", async (request, response) => {
    const body = await readJsonBody(request);
    const credential = String(body.credential ?? "").trim();
    const emailFallback = normalizeEmail(body.email);

    if (String(config.googleClientId ?? "").trim() && !credential) {
      badRequest(response, "credential is required");
      return;
    }

    if (!credential && !emailFallback) {
      badRequest(response, "credential is required");
      return;
    }

    let verifiedIdentity = null;
    if (credential) {
      try {
        verifiedIdentity = await verifyGoogleIdCredential(config, credential);
      } catch (error) {
        sendJson(response, 401, buildUnauthorizedPayload(error.message || "Google token verification failed."));
        return;
      }
    }

    const email = verifiedIdentity?.email || emailFallback;
    let payload = null;

    updateDb((db) => {
      const user = db.opsUsers.find((candidate) => normalizeEmail(candidate.email) === email);
      if (!user || String(user.status ?? "active") !== "active") {
        payload = { error: "This Google account is not registered as an ops user yet", statusCode: 401 };
        return db;
      }

      const tenant = findTenant(db, user.tenantId);
      const session = createAuthSession(db, {
        actorType: "ops_user",
        actor: user,
        tenantId: String(user.tenantId ?? DEMO_TENANT_ID),
        role: String(user.role ?? "company_user"),
        source: "google"
      });

      payload = buildSessionPayload(session, serializeActor(user), tenant);
      return db;
    });

    if (payload?.error) {
      sendJson(response, payload.statusCode, buildUnauthorizedPayload(payload.error));
      return;
    }

    sendJson(response, 200, payload);
  });

  router.post("/auth/google-customer", async (request, response) => {
    const body = await readJsonBody(request);
    const credential = String(body.credential ?? "").trim();

    if (!credential) {
      badRequest(response, "credential is required");
      return;
    }

    let identity = null;
    try {
      identity = await verifyGoogleIdCredential(config, credential);
    } catch (error) {
      sendJson(response, 401, buildUnauthorizedPayload(error.message || "Google token verification failed."));
      return;
    }

    let payload = null;

    updateDb((db) => {
      const customer =
        db.customers.find((candidate) =>
          [normalizeEmail(candidate.companyEmail), normalizeEmail(candidate.contactEmail)].includes(identity.email)
        ) ?? null;

      if (!customer) {
        payload = { error: "No customer account matches this Google account yet", statusCode: 401 };
        return db;
      }

      const tenant = findTenant(db, customer.tenantId);
      const session = createAuthSession(db, {
        actorType: "customer",
        actor: customer,
        tenantId: String(customer.tenantId ?? DEMO_TENANT_ID),
        role: "customer_user",
        source: "google"
      });

      payload = buildSessionPayload(session, serializeActor(customer), tenant);
      return db;
    });

    if (payload?.error) {
      sendJson(response, payload.statusCode, buildUnauthorizedPayload(payload.error));
      return;
    }

    sendJson(response, 200, payload);
  });

  router.post("/auth/google-driver", async (request, response) => {
    const body = await readJsonBody(request);
    const credential = String(body.credential ?? "").trim();

    if (!credential) {
      badRequest(response, "credential is required");
      return;
    }

    let identity = null;
    try {
      identity = await verifyGoogleIdCredential(config, credential);
    } catch (error) {
      sendJson(response, 401, buildUnauthorizedPayload(error.message || "Google token verification failed."));
      return;
    }

    let payload = null;

    updateDb((db) => {
      const driver = db.drivers.find((candidate) => normalizeEmail(candidate.email) === identity.email) ?? null;
      if (!driver || String(driver.status ?? "active") !== "active") {
        payload = { error: "This Google account is not linked to a driver yet", statusCode: 401 };
        return db;
      }

      const tenant = findTenant(db, driver.tenantId);
      const session = createAuthSession(db, {
        actorType: "driver",
        actor: driver,
        tenantId: String(driver.tenantId ?? DEMO_TENANT_ID),
        role: "driver",
        source: "google"
      });

      payload = buildSessionPayload(session, serializeActor(driver), tenant);
      return db;
    });

    if (payload?.error) {
      sendJson(response, payload.statusCode, buildUnauthorizedPayload(payload.error));
      return;
    }

    sendJson(response, 200, payload);
  });

  router.post("/auth/driver-login", async (request, response) => {
    const body = await readJsonBody(request);
    const email = normalizeEmail(body.email);
    const password = String(body.password ?? "").trim();

    if (!email || !password) {
      badRequest(response, "email and password are required");
      return;
    }

    let payload = null;

    updateDb((db) => {
      const driver = db.drivers.find((candidate) => normalizeEmail(candidate.email) === email) ?? null;
      if (!driver || String(driver.status ?? "active") !== "active") {
        payload = { error: "Invalid credentials", statusCode: 401 };
        return db;
      }

      const expectedPassword = String(driver.temporaryPassword ?? "").trim() || "demo";
      if (password !== expectedPassword) {
        payload = { error: "Invalid credentials", statusCode: 401 };
        return db;
      }

      const tenant = findTenant(db, driver.tenantId);
      const session = createAuthSession(db, {
        actorType: "driver",
        actor: driver,
        tenantId: String(driver.tenantId ?? DEMO_TENANT_ID),
        role: "driver",
        source: "password"
      });

      payload = buildSessionPayload(session, serializeActor(driver), tenant);
      return db;
    });

    if (payload?.error) {
      sendJson(response, payload.statusCode, buildUnauthorizedPayload(payload.error));
      return;
    }

    sendJson(response, 200, payload);
  });

  router.post("/auth/customer-login", async (request, response) => {
    const body = await readJsonBody(request);
    const email = normalizeEmail(body.email);
    const password = String(body.password ?? "").trim();

    if (!email || !password) {
      badRequest(response, "email and password are required");
      return;
    }

    let payload = null;

    updateDb((db) => {
      const customer =
        db.customers.find((candidate) =>
          [normalizeEmail(candidate.companyEmail), normalizeEmail(candidate.contactEmail)].includes(email)
        ) ?? null;

      if (!customer) {
        payload = { error: "No customer account matches this email yet", statusCode: 401 };
        return db;
      }

      const expectedPassword = String(customer.portalPassword ?? "").trim() || "demo";
      if (password !== expectedPassword) {
        payload = { error: "Invalid credentials", statusCode: 401 };
        return db;
      }

      const tenant = findTenant(db, customer.tenantId);
      const session = createAuthSession(db, {
        actorType: "customer",
        actor: customer,
        tenantId: String(customer.tenantId ?? DEMO_TENANT_ID),
        role: "customer_user",
        source: "email"
      });

      payload = buildSessionPayload(session, serializeActor(customer), tenant);
      return db;
    });

    if (payload?.error) {
      sendJson(response, payload.statusCode, buildUnauthorizedPayload(payload.error));
      return;
    }

    sendJson(response, 200, payload);
  });

  router.post("/auth/signup/company", async (request, response) => {
    const body = await readJsonBody(request);
    const firstName = String(body.firstName ?? "").trim();
    const lastName = String(body.lastName ?? "").trim();
    const companyName = String(body.company ?? body.companyName ?? "").trim();
    const email = normalizeEmail(body.email);
    const password = String(body.password ?? "").trim() || "demo";
    const phone = String(body.phone ?? "").trim();

    if (!firstName || !lastName || !companyName || !email) {
      badRequest(response, "firstName, lastName, company and email are required");
      return;
    }

    let payload = null;

    updateDb((db) => {
      if (db.opsUsers.some((candidate) => normalizeEmail(candidate.email) === email)) {
        payload = { error: "An account with this email already exists", statusCode: 409 };
        return db;
      }

      const tenant = createCompanyTenant(db, {
        companyName,
        planId: String(body.planId ?? DEFAULT_SIGNUP_PLAN_ID)
      });

      tenant.signupMeta = {
        volume: String(body.volume ?? "").trim(),
        message: String(body.message ?? "").trim(),
        phone,
        createdByEmail: email
      };
      tenant.updatedAt = new Date().toISOString();

      createDefaultCompanyHub(db, tenant);

      const timestamp = new Date().toISOString();
      const user = {
        id: createId("ops_user"),
        tenantId: tenant.id,
        companyId: tenant.id,
        firstName,
        lastName,
        email,
        phone,
        role: "company_admin",
        team: companyName,
        temporaryPassword: password,
        status: "active",
        createdAt: timestamp,
        updatedAt: timestamp
      };

      db.opsUsers.unshift(user);
      appendEvent(db, {
        type: "ops_user.created",
        entityType: "ops_user",
        entityId: user.id,
        payload: {
          tenantId: tenant.id,
          email
        }
      });

      const session = createAuthSession(db, {
        actorType: "ops_user",
        actor: user,
        tenantId: tenant.id,
        role: "company_admin",
        source: "signup"
      });

      payload = {
        ...buildSessionPayload(session, serializeActor(user), tenant),
        redirectPath: "/ops/",
        planId: tenant.planId
      };

      return db;
    });

    if (payload?.error) {
      if (payload.statusCode === 409) {
        conflict(response, payload.error);
        return;
      }
      sendJson(response, payload.statusCode, {
        error: {
          code: "signup_failed",
          message: payload.error
        }
      });
      return;
    }

    sendJson(response, 201, payload);
  });

  router.post("/auth/logout", async (request, response) => {
    const db = readDb();
    const auth = resolveAuthSession(db, request);

    if (!auth) {
      sendJson(response, 200, { ok: true });
      return;
    }

    updateDb((nextDb) => {
      nextDb.authSessions = nextDb.authSessions.filter((session) => session.token !== auth.session.token);
      return nextDb;
    });

    sendJson(response, 200, { ok: true });
  });

  router.get("/auth/me", async (request, response) => {
    const db = readDb();
    const auth = requireAuth(request, response, db);
    if (!auth) {
      return;
    }

    sendJson(response, 200, buildSessionPayload(auth.session, serializeActor(auth.actor), auth.tenant));
  });

  router.get("/tenant/context", async (request, response) => {
    const db = readDb();
    const auth = requireAuth(request, response, db, ["ops_user", "customer", "driver"]);
    if (!auth) {
      return;
    }

    sendJson(response, 200, {
      tenantId: auth.tenantId,
      companyId: auth.companyId,
      actorType: auth.actorType,
      role: auth.role,
      tenantContext: resolveTenantContext(auth.tenant),
      actor: serializeActor(auth.actor)
    });
  });

  router.get("/admin/saas/catalog", async (request, response) => {
    const db = readDb();
    const auth = requireAuth(request, response, db, ["ops_user"]);
    if (!auth) {
      return;
    }

    sendJson(response, 200, {
      plans: Object.values(saasPlanCatalog()),
      modules: moduleCatalog(),
      algorithms: algorithmCatalog(),
      defaultSignupPlanId: DEFAULT_SIGNUP_PLAN_ID,
      platformTenantId: PLATFORM_TENANT_ID,
      internalTenantContext: resolveTenantContext(findTenant(db, PLATFORM_TENANT_ID))
    });
  });

  router.get("/auth/prototype-login", async (_request, response) => {
    const db = readDb();
    sendJson(response, 200, {
      message: "Use POST /auth/login",
      demoAccounts: db.opsUsers
        .filter((user) => ["pierre@naaval.app", "demo@naaval.app"].includes(normalizeEmail(user.email)))
        .map((user) => ({
          email: user.email,
          role: user.role,
          defaultPassword: user.temporaryPassword || "demo"
        })),
      customerHint: "Use POST /auth/customer-login with a customer contact email",
      defaultSignupPlan: resolvePlan(DEFAULT_SIGNUP_PLAN_ID)
    });
  });
}
