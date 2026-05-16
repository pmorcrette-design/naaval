import { createHmac, timingSafeEqual } from "node:crypto";
import { conflict, forbidden, unauthorized } from "./http.js";
import {
  DEFAULT_SIGNUP_PLAN_ID,
  DEMO_TENANT_ID,
  PLATFORM_TENANT_ID,
  algorithmCatalog,
  ensureTenantScope,
  isPlatformRole,
  moduleCatalog,
  resolvePlan,
  resolveTenantContext,
  saasPlanCatalog,
  slugify
} from "./saas.js";
import { createId } from "./ids.js";

export {
  DEFAULT_SIGNUP_PLAN_ID,
  DEMO_TENANT_ID,
  PLATFORM_TENANT_ID,
  algorithmCatalog,
  moduleCatalog,
  resolvePlan,
  resolveTenantContext,
  saasPlanCatalog
};

export function normalizeEmail(value) {
  return String(value ?? "").trim().toLowerCase();
}

export function findTenant(db, tenantId) {
  if (!tenantId) {
    return null;
  }

  return db.tenants.find((tenant) => tenant.id === tenantId) ?? null;
}

export function buildSessionPayload(session, actor, tenant) {
  const firstName = actor?.firstName ?? "";
  const lastName = actor?.lastName ?? "";
  const fallbackName = [firstName, lastName].filter(Boolean).join(" ").trim();
  const name = actor?.name ?? actor?.companyName ?? actor?.label ?? fallbackName ?? "";
  const email =
    actor?.email ??
    actor?.contactEmail ??
    actor?.companyEmail ??
    "";

  return {
    token: session.token,
    session,
    actorType: session.actorType,
    actor,
    role: session.role,
    source: session.source,
    userId: session.userId ?? null,
    customerId: session.customerId ?? null,
    driverId: session.driverId ?? null,
    tenantId: session.tenantId ?? null,
    companyId: session.companyId ?? null,
    firstName,
    lastName,
    name,
    email,
    tenant,
    tenantContext: resolveTenantContext(tenant)
  };
}

function toBase64Url(input) {
  return Buffer.from(input).toString("base64url");
}

function resolveSessionSecret(secret = "") {
  return (
    String(secret || "").trim() ||
    String(process.env.NAAVAL_AUTH_SECRET || "").trim() ||
    String(process.env.NAAVAL_GOOGLE_CLIENT_SECRET || "").trim() ||
    String(process.env.GRAPHHOPPER_API_KEY || "").trim() ||
    String(process.env.NAAVAL_GOOGLE_CLIENT_ID || "").trim() ||
    "naaval-demo-auth-secret"
  );
}

function signSessionToken(secret, payload) {
  const header = {
    alg: "HS256",
    typ: "JWT"
  };
  const encodedHeader = toBase64Url(JSON.stringify(header));
  const encodedPayload = toBase64Url(JSON.stringify(payload));
  const signature = createHmac("sha256", resolveSessionSecret(secret))
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");
  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

function verifySessionToken(secret, token) {
  const parts = String(token ?? "").split(".");
  if (parts.length !== 3) {
    return null;
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;
  const expectedSignature = createHmac("sha256", resolveSessionSecret(secret))
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");

  const providedBuffer = Buffer.from(encodedSignature);
  const expectedBuffer = Buffer.from(expectedSignature);
  if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) {
    return null;
  }

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (payload.exp && nowSeconds >= Number(payload.exp)) {
      return null;
    }
    return payload;
  } catch (_error) {
    return null;
  }
}

export function createAuthSession(db, { actorType, actor, tenantId, role, source = "password", secret = "" }) {
  const issuedAtSeconds = Math.floor(Date.now() / 1000);
  const expiresAtSeconds = issuedAtSeconds + 60 * 60 * 24 * 14;
  const sessionId = createId("session");
  const payload = {
    sid: sessionId,
    actorType,
    userId: actorType === "ops_user" ? actor.id : null,
    customerId: actorType === "customer" ? actor.id : null,
    driverId: actorType === "driver" ? actor.id : null,
    tenantId,
    companyId: tenantId,
    role,
    source,
    iat: issuedAtSeconds,
    exp: expiresAtSeconds
  };

  const session = {
    id: sessionId,
    token: signSessionToken(secret, payload),
    actorType,
    userId: actorType === "ops_user" ? actor.id : null,
    customerId: actorType === "customer" ? actor.id : null,
    driverId: actorType === "driver" ? actor.id : null,
    tenantId,
    companyId: tenantId,
    role,
    source,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.authSessions = (db.authSessions ?? []).filter((candidate) => candidate.token !== session.token);
  db.authSessions.unshift(session);
  return session;
}

function getAuthorizationToken(request) {
  const header = request.headers.authorization ?? request.headers.Authorization;
  if (header && /^Bearer\s+/i.test(header)) {
    return header.replace(/^Bearer\s+/i, "").trim();
  }

  const explicit = request.headers["x-naaval-session-token"];
  if (explicit) {
    return String(explicit).trim();
  }

  return null;
}

export function resolveAuthSession(db, request, config = {}) {
  const token = getAuthorizationToken(request);
  if (!token) {
    return null;
  }

  let session = null;
  const signedPayload = verifySessionToken(config.authSecret, token);

  if (signedPayload) {
    session = {
      id: signedPayload.sid ?? null,
      token,
      actorType: signedPayload.actorType ?? null,
      userId: signedPayload.userId ?? null,
      customerId: signedPayload.customerId ?? null,
      driverId: signedPayload.driverId ?? null,
      tenantId: signedPayload.tenantId ?? null,
      companyId: signedPayload.companyId ?? signedPayload.tenantId ?? null,
      role: signedPayload.role ?? null,
      source: signedPayload.source ?? "password",
      createdAt: signedPayload.iat ? new Date(Number(signedPayload.iat) * 1000).toISOString() : null,
      updatedAt: new Date().toISOString()
    };
  } else {
    session = (db.authSessions ?? []).find((candidate) => candidate.token === token) ?? null;
  }

  if (!session) {
    return null;
  }

  let actor = null;
  if (session.actorType === "ops_user") {
    actor = db.opsUsers.find((item) => item.id === session.userId) ?? null;
  } else if (session.actorType === "customer") {
    actor = db.customers.find((item) => item.id === session.customerId) ?? null;
  } else if (session.actorType === "driver") {
    actor = db.drivers.find((item) => item.id === session.driverId) ?? null;
  }

  if (!actor) {
    return null;
  }

  if (session.actorType === "ops_user" || session.actorType === "driver") {
    if (String(actor.status ?? "active") !== "active") {
      return null;
    }
  }

  return {
    session,
    actorType: session.actorType,
    actor,
    tenant: findTenant(db, session.tenantId),
    tenantId: session.tenantId,
    companyId: session.companyId,
    role: session.role
  };
}

export function requireAuth(request, response, db, allowedActorTypes = ["ops_user", "customer", "driver"], config = {}) {
  const auth = resolveAuthSession(db, request, config);
  if (!auth) {
    unauthorized(response, "Authentication is required");
    return null;
  }

  if (allowedActorTypes.length > 0 && !allowedActorTypes.includes(auth.actorType)) {
    forbidden(response, "This account cannot access this resource");
    return null;
  }

  return auth;
}

export function isPlatformAdminAuth(auth) {
  return Boolean(auth && auth.actorType === "ops_user" && isPlatformRole(auth.role));
}

export function requirePlatformAdminAccess(response, auth) {
  if (!isPlatformAdminAuth(auth)) {
    forbidden(response, "Naaval admin access is required");
    return false;
  }

  return true;
}

export function requireCompanyAdminAccess(response, auth) {
  if (!auth || auth.actorType !== "ops_user") {
    forbidden(response, "Ops access is required");
    return false;
  }

  if (isPlatformAdminAuth(auth)) {
    return true;
  }

  if (String(auth.role ?? "") !== "company_admin") {
    forbidden(response, "Company admin access is required");
    return false;
  }

  return true;
}

export function entityBelongsToAuth(entity, auth) {
  if (!auth || isPlatformAdminAuth(auth)) {
    return true;
  }

  return String(entity?.tenantId ?? entity?.companyId ?? "") === String(auth.tenantId ?? "");
}

export function scopedItems(items, auth, collectionName) {
  if (!auth || isPlatformAdminAuth(auth)) {
    return items;
  }

  const tenantId = String(auth.tenantId ?? "");
  const scoped = items.filter((item) => String(item?.tenantId ?? item?.companyId ?? "") === tenantId);

  if (auth.actorType === "customer") {
    const customerId = String(auth.actor.id);
    if (collectionName === "customers") {
      return scoped.filter((item) => String(item.id) === customerId);
    }
    if (collectionName === "quotes") {
      return scoped.filter((item) => String(item.customerId ?? "") === customerId);
    }
    if (collectionName === "orders") {
      return scoped.filter((item) => String(item.customerId ?? "") === customerId);
    }
    if (collectionName === "recurringRoutes") {
      return scoped.filter((item) => String(item.customerId ?? "") === customerId);
    }
    return scoped;
  }

  if (auth.actorType === "driver") {
    const driverId = String(auth.actor.id);
    if (collectionName === "drivers") {
      return scoped.filter((item) => String(item.id) === driverId);
    }
    if (collectionName === "carrierCompanies") {
      const carrierCompanyId = String(auth.actor.carrierCompanyId ?? "");
      return carrierCompanyId ? scoped.filter((item) => String(item.id) === carrierCompanyId) : [];
    }
    if (collectionName === "shifts") {
      return scoped.filter((item) => String(item.driverId ?? "") === driverId);
    }
    if (collectionName === "routes") {
      return scoped.filter((item) => String(item.driverId ?? "") === driverId);
    }
  }

  return scoped;
}

export function scopedPricingConfig(db, auth) {
  if (!auth) {
    return structuredClone(db.pricingConfig);
  }

  const tenantId = String(auth.tenantId ?? DEMO_TENANT_ID);
  return structuredClone(db.tenantPricingConfigs?.[tenantId] ?? db.pricingConfig);
}

export function resolveTargetTenantId(auth, body, defaultForPlatform = null) {
  const requested = String(body?.tenantId ?? body?.companyId ?? "").trim();

  if (isPlatformAdminAuth(auth)) {
    if (requested) {
      return requested;
    }
    return defaultForPlatform || String(auth.tenantId ?? PLATFORM_TENANT_ID);
  }

  return String(auth?.tenantId ?? DEMO_TENANT_ID);
}

export function allowedRoleValuesForCreator(auth) {
  if (isPlatformAdminAuth(auth)) {
    return new Set(["super_admin", "naaval_admin", "company_admin", "company_user"]);
  }

  return new Set(["company_admin", "company_user"]);
}

export function sanitizeOpsUserRole(response, auth, role) {
  const normalized = String(role ?? "company_user").trim() || "company_user";
  if (!allowedRoleValuesForCreator(auth).has(normalized)) {
    forbidden(response, "You cannot assign this role");
    return null;
  }

  return normalized;
}

export function serializeTenantRecord(db, tenant) {
  const tenantId = tenant.id;
  return {
    ...structuredClone(tenant),
    tenantContext: resolveTenantContext(tenant),
    opsUsersCount: db.opsUsers.filter((item) => String(item.tenantId) === tenantId).length,
    driversCount: db.drivers.filter((item) => String(item.tenantId) === tenantId).length,
    ordersCount: db.orders.filter((item) => String(item.tenantId) === tenantId).length,
    routesCount: db.routes.filter((item) => String(item.tenantId) === tenantId).length
  };
}

export function createCompanyTenant(db, { companyName, planId = DEFAULT_SIGNUP_PLAN_ID, status = "active" }) {
  const timestamp = new Date().toISOString();
  const baseSlug = slugify(companyName, "company");
  let candidateSlug = baseSlug;
  let suffix = 2;
  const existingSlugs = new Set((db.tenants ?? []).map((tenant) => String(tenant.slug ?? "")));

  while (existingSlugs.has(candidateSlug)) {
    candidateSlug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }

  const tenant = {
    id: createId("tenant"),
    companyId: "",
    slug: candidateSlug,
    companyName,
    status,
    planId,
    enabledModules: [],
    disabledModules: [],
    enabledAlgorithms: [],
    disabledAlgorithms: [],
    usageOverrides: {},
    moduleOverrides: {},
    algorithmOverrides: {},
    createdAt: timestamp,
    updatedAt: timestamp
  };

  tenant.companyId = tenant.id;
  db.tenants.unshift(tenant);
  db.tenantPricingConfigs[tenant.id] = structuredClone(db.pricingConfig);
  return tenant;
}

export function createDefaultCompanyHub(db, tenant) {
  const timestamp = new Date().toISOString();
  const hub = {
    id: createId("hub"),
    tenantId: tenant.id,
    companyId: tenant.id,
    label: `${tenant.companyName} Main Hub`,
    city: "",
    address: "",
    coordinates: {
      lat: 48.8566,
      lon: 2.3522
    },
    createdAt: timestamp,
    updatedAt: timestamp
  };

  db.hubs.unshift(hub);
  return hub;
}

export function ensureTenantEntity(entity, auth, fallbackTenantId = null) {
  const tenantId = fallbackTenantId || String(auth?.tenantId ?? DEMO_TENANT_ID);
  return ensureTenantScope(entity, tenantId);
}

export function ensureUniqueOpsEmail(response, db, email, excludedUserId = null) {
  const normalizedEmail = normalizeEmail(email);
  const conflictUser = db.opsUsers.find((user) => normalizeEmail(user.email) === normalizedEmail && user.id !== excludedUserId);
  if (conflictUser) {
    conflict(response, "An account with this email already exists");
    return false;
  }

  return true;
}
