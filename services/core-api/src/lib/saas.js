export const PLATFORM_TENANT_ID = "tenant_naaval_internal";
export const DEMO_TENANT_ID = "tenant_demo_transport";
export const DEFAULT_SIGNUP_PLAN_ID = "trial";

export function slugify(value, fallback = "tenant") {
  const slug = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || fallback;
}

export function createDefaultPricingConfig() {
  return {
    currency: "EUR",
    basic: {
      distanceRatePerKm: 0.5,
      sizeBasePrices: {
        S: 9.8,
        M: 14.4,
        L: 18.91,
        XL: 24.6,
        XXL: 29.8
      }
    },
    pallet: {
      pricePerPallet: 35,
      vehicleThresholds: {
        van_3m3: 2,
        van_5m3: 4,
        van_10m3: 6,
        van_20m3: 8
      }
    },
    hours: {
      minimumHours: 3,
      includedKm: 150,
      vehicleHourlyRates: {
        bike: 16.5,
        scooter: 19.5,
        car: 23,
        van_3m3: 28.75,
        van_5m3: 31.62,
        van_10m3: 36.36,
        van_15m3: 41.84,
        van_20m3: 48.11
      }
    },
    drops: {
      minimumDrops: 10,
      includedKm: 100,
      vehicleDropRates: {
        car: 8.5,
        van_3m3: 11,
        van_5m3: 13.25,
        van_10m3: 16.2,
        van_15m3: 18.9,
        van_20m3: 22.4
      }
    }
  };
}

export function moduleCatalog() {
  return [
    { id: "orders", label: "Orders" },
    { id: "drivers", label: "Drivers" },
    { id: "optimizer", label: "Optimizer" },
    { id: "customers", label: "Customers" },
    { id: "recurring_routes", label: "Recurring Routes" },
    { id: "pricing", label: "Pricing Simulator" },
    { id: "inbox", label: "Inbox" },
    { id: "admin_users", label: "Ops Users" },
    { id: "pricing_admin", label: "Pricing Setup" },
    { id: "customer_portal", label: "Customer Portal" },
    { id: "dispatch_suggestions", label: "Dispatch Suggestions" },
    { id: "pricing_zones", label: "Pricing Zones" },
    { id: "capacity_optimization", label: "Capacity Optimization" },
    { id: "profitability_analytics", label: "Cost/KM Analytics" },
    { id: "notifications", label: "Client Notifications" },
    { id: "message_templates", label: "SMS/Email Templates" },
    { id: "teams", label: "Team Management" },
    { id: "advanced_permissions", label: "Advanced Permissions" },
    { id: "multi_warehouse", label: "Multi Warehouse" },
    { id: "api", label: "API" },
    { id: "webhooks", label: "Webhooks" },
    { id: "integrations", label: "ERP / Shopify / WMS" },
    { id: "white_label_tracking", label: "White-label Tracking" },
    { id: "geojson_export", label: "GeoJSON Export" },
    { id: "driver_analytics", label: "Driver Analytics" },
    { id: "custom_branding", label: "Custom Branding" },
    { id: "dedicated_support", label: "Dedicated Support" },
    { id: "sla", label: "SLA / OPS Support" },
    { id: "dedicated_hosting", label: "Dedicated Hosting" },
    { id: "custom_development", label: "Custom Development" }
  ];
}

export function algorithmCatalog() {
  return [
    { id: "basic", label: "Just Price" },
    { id: "drops", label: "Per Drop" },
    { id: "hours", label: "Point of Sales" },
    { id: "pallet", label: "Prix Palette" }
  ];
}

export function saasPlanCatalog() {
  const starterModules = [
    "orders",
    "drivers",
    "optimizer",
    "pricing",
    "inbox",
    "recurring_routes",
    "admin_users",
    "pricing_admin"
  ];
  const growthModules = starterModules.concat([
    "customers",
    "dispatch_suggestions",
    "pricing_zones",
    "capacity_optimization",
    "profitability_analytics",
    "notifications",
    "message_templates",
    "teams"
  ]);
  const scaleModules = growthModules.concat([
    "advanced_permissions",
    "multi_warehouse",
    "api",
    "webhooks",
    "integrations",
    "customer_portal",
    "white_label_tracking",
    "geojson_export",
    "driver_analytics",
    "custom_branding"
  ]);
  const enterpriseModules = scaleModules.concat([
    "dedicated_support",
    "sla",
    "dedicated_hosting",
    "custom_development"
  ]);
  const baseAlgorithms = ["basic", "drops", "hours", "pallet"];

  return {
    trial: {
      id: "trial",
      label: "Trial",
      monthlyPriceEur: 0,
      modules: starterModules,
      algorithms: baseAlgorithms,
      usageLimits: {
        includedDrivers: 3,
        includedUsers: 2,
        includedOrdersPerMonth: 500,
        includedRunsPerMonth: 100
      }
    },
    starter: {
      id: "starter",
      label: "Starter",
      monthlyPriceEur: 79,
      modules: starterModules,
      algorithms: baseAlgorithms,
      usageLimits: {
        includedDrivers: 3,
        includedUsers: 3,
        includedOrdersPerMonth: 5000,
        includedRunsPerMonth: 500
      }
    },
    growth: {
      id: "growth",
      label: "Growth",
      monthlyPriceEur: 199,
      modules: growthModules,
      algorithms: baseAlgorithms,
      usageLimits: {
        includedDrivers: 15,
        includedUsers: 10,
        includedOrdersPerMonth: 25000,
        includedRunsPerMonth: 3000
      }
    },
    scale: {
      id: "scale",
      label: "Scale",
      monthlyPriceEur: 449,
      modules: scaleModules,
      algorithms: baseAlgorithms,
      usageLimits: {
        includedDrivers: 75,
        includedUsers: 50,
        includedOrdersPerMonth: 100000,
        includedRunsPerMonth: 15000
      }
    },
    enterprise: {
      id: "enterprise",
      label: "Enterprise",
      monthlyPriceEur: null,
      modules: enterpriseModules,
      algorithms: baseAlgorithms,
      usageLimits: {
        includedDrivers: null,
        includedUsers: null,
        includedOrdersPerMonth: null,
        includedRunsPerMonth: null
      }
    }
  };
}

export function resolvePlan(planId) {
  const catalog = saasPlanCatalog();
  return structuredClone(catalog[String(planId ?? "").trim().toLowerCase()] ?? catalog.starter);
}

export function buildDefaultTenants(timestamp) {
  return [
    {
      id: PLATFORM_TENANT_ID,
      companyId: PLATFORM_TENANT_ID,
      slug: "naaval-internal",
      companyName: "Naaval Internal",
      status: "active",
      planId: "enterprise",
      enabledModules: [],
      disabledModules: [],
      enabledAlgorithms: [],
      disabledAlgorithms: [],
      usageOverrides: {},
      moduleOverrides: {},
      algorithmOverrides: {},
      createdAt: timestamp,
      updatedAt: timestamp
    },
    {
      id: DEMO_TENANT_ID,
      companyId: DEMO_TENANT_ID,
      slug: "naaval-demo-transport",
      companyName: "Naaval Demo Transport",
      status: "active",
      planId: DEFAULT_SIGNUP_PLAN_ID,
      enabledModules: [],
      disabledModules: [],
      enabledAlgorithms: [],
      disabledAlgorithms: [],
      usageOverrides: {},
      moduleOverrides: {},
      algorithmOverrides: {},
      createdAt: timestamp,
      updatedAt: timestamp
    }
  ];
}

export function resolveTenantContext(tenant) {
  if (!tenant) {
    const plan = resolvePlan("starter");
    return {
      tenant: null,
      plan,
      modules: plan.modules,
      algorithms: plan.algorithms,
      usageLimits: plan.usageLimits
    };
  }

  const plan = resolvePlan(tenant.planId);
  const modules = new Set(plan.modules ?? []);
  const algorithms = new Set(plan.algorithms ?? []);

  for (const moduleId of tenant.enabledModules ?? []) {
    if (moduleId) {
      modules.add(String(moduleId));
    }
  }

  for (const algorithmId of tenant.enabledAlgorithms ?? []) {
    if (algorithmId) {
      algorithms.add(String(algorithmId));
    }
  }

  for (const moduleId of tenant.disabledModules ?? []) {
    if (moduleId) {
      modules.delete(String(moduleId));
    }
  }

  for (const algorithmId of tenant.disabledAlgorithms ?? []) {
    if (algorithmId) {
      algorithms.delete(String(algorithmId));
    }
  }

  return {
    tenant: structuredClone(tenant),
    plan,
    modules: [...modules].sort(),
    algorithms: [...algorithms].sort(),
    usageLimits: {
      ...(structuredClone(plan.usageLimits ?? {})),
      ...(structuredClone(tenant.usageOverrides ?? {}))
    }
  };
}

export function ensureTenantScope(entity, tenantId) {
  entity.tenantId = entity.tenantId || tenantId;
  entity.companyId = entity.companyId || entity.tenantId || tenantId;
  return entity;
}

export function isPlatformRole(role) {
  return new Set(["super_admin", "naaval_admin"]).has(String(role ?? "").trim());
}

export function createEmptyDb() {
  return {
    tenants: [],
    authSessions: [],
    hubs: [],
    vehicleTypes: [],
    vehicles: [],
    carrierCompanies: [],
    drivers: [],
    opsUsers: [],
    shifts: [],
    customers: [],
    quotes: [],
    recurringRoutes: [],
    graphhopperUsage: {
      enabled: false,
      remaining: null,
      limit: null,
      resetSeconds: null,
      updatedAt: null,
      source: "unknown"
    },
    orders: [],
    planningJobs: [],
    routes: [],
    heartbeats: [],
    proofs: [],
    inboxMessages: [],
    events: [],
    pricingConfig: createDefaultPricingConfig(),
    tenantPricingConfigs: {}
  };
}

export function normalizeDb(db) {
  const normalized = { ...db };
  const baseline = createEmptyDb();
  for (const [key, value] of Object.entries(baseline)) {
    if (!(key in normalized)) {
      normalized[key] = structuredClone(value);
    }
  }

  if (!normalized.pricingConfig || typeof normalized.pricingConfig !== "object") {
    normalized.pricingConfig = createDefaultPricingConfig();
  }

  if (!normalized.tenantPricingConfigs || typeof normalized.tenantPricingConfigs !== "object") {
    normalized.tenantPricingConfigs = {};
  }

  const timestamp = new Date().toISOString();
  const defaultTenants = buildDefaultTenants(timestamp);
  const existingTenants = new Map((normalized.tenants ?? []).filter((tenant) => tenant?.id).map((tenant) => [tenant.id, tenant]));

  if (!normalized.tenants.length) {
    normalized.tenants = structuredClone(defaultTenants);
  } else {
    for (const defaultTenant of defaultTenants) {
      const existing = existingTenants.get(defaultTenant.id);

      if (!existing) {
        normalized.tenants.push(structuredClone(defaultTenant));
        continue;
      }

      existing.companyId = existing.companyId || defaultTenant.id;
      existing.slug = existing.slug || defaultTenant.slug;
      existing.companyName = existing.companyName || defaultTenant.companyName;
      existing.status = existing.status || defaultTenant.status;
      existing.planId = existing.planId || defaultTenant.planId;
      existing.enabledModules = existing.enabledModules ?? [];
      existing.disabledModules = existing.disabledModules ?? [];
      existing.enabledAlgorithms = existing.enabledAlgorithms ?? [];
      existing.disabledAlgorithms = existing.disabledAlgorithms ?? [];
      existing.usageOverrides = existing.usageOverrides ?? {};
      existing.moduleOverrides = existing.moduleOverrides ?? {};
      existing.algorithmOverrides = existing.algorithmOverrides ?? {};
    }
  }

  const defaultOpsUsers = [
    {
      id: "ops_user_pierre",
      firstName: "Pierre",
      lastName: "Ops",
      email: "pierre@naaval.app",
      role: "super_admin",
      team: "Naaval HQ",
      temporaryPassword: "demo",
      status: "active",
      tenantId: PLATFORM_TENANT_ID,
      companyId: PLATFORM_TENANT_ID,
      createdAt: timestamp,
      updatedAt: timestamp
    },
    {
      id: "ops_user_demo",
      firstName: "Demo",
      lastName: "Transport",
      email: "demo@naaval.app",
      role: "company_admin",
      team: "Operations",
      temporaryPassword: "demo",
      status: "active",
      tenantId: DEMO_TENANT_ID,
      companyId: DEMO_TENANT_ID,
      createdAt: timestamp,
      updatedAt: timestamp
    }
  ];

  const opsByEmail = new Map((normalized.opsUsers ?? []).map((user) => [String(user.email ?? "").trim().toLowerCase(), user]));
  if (!normalized.opsUsers.length) {
    normalized.opsUsers = structuredClone(defaultOpsUsers);
  } else {
    for (const defaultUser of defaultOpsUsers) {
      const existing = opsByEmail.get(String(defaultUser.email).trim().toLowerCase());
      if (!existing) {
        normalized.opsUsers.push(structuredClone(defaultUser));
        continue;
      }

      existing.temporaryPassword = existing.temporaryPassword || defaultUser.temporaryPassword;
      existing.status = existing.status || defaultUser.status;
      existing.team = existing.team || defaultUser.team;
      existing.role = existing.role || defaultUser.role;
      existing.tenantId = existing.tenantId || defaultUser.tenantId;
      existing.companyId = existing.companyId || defaultUser.companyId;
    }
  }

  const roleMapping = {
    ops_admin: "company_admin",
    ops_manager: "company_admin",
    ops_dispatcher: "company_user",
    ops_agent: "company_user"
  };

  for (const user of normalized.opsUsers) {
    const email = String(user.email ?? "").trim().toLowerCase();
    if (email === "pierre@naaval.app") {
      user.role = "super_admin";
      user.tenantId = PLATFORM_TENANT_ID;
      user.companyId = PLATFORM_TENANT_ID;
    } else if (email === "demo@naaval.app") {
      user.role = "company_admin";
      user.tenantId = DEMO_TENANT_ID;
      user.companyId = DEMO_TENANT_ID;
    } else {
      user.role = roleMapping[String(user.role ?? "").trim()] ?? (String(user.role ?? "company_user").trim() || "company_user");
      ensureTenantScope(user, String(user.tenantId ?? DEMO_TENANT_ID));
    }

    user.temporaryPassword = user.temporaryPassword || "demo";
    user.status = user.status || "active";
    user.team = user.team || "Operations";
  }

  const tenantScopedCollections = [
    "hubs",
    "vehicleTypes",
    "vehicles",
    "carrierCompanies",
    "drivers",
    "shifts",
    "customers",
    "quotes",
    "recurringRoutes",
    "orders",
    "planningJobs",
    "routes",
    "heartbeats",
    "proofs",
    "inboxMessages"
  ];

  for (const key of tenantScopedCollections) {
    for (const entity of normalized[key] ?? []) {
      ensureTenantScope(entity, String(entity.tenantId ?? DEMO_TENANT_ID));
    }
  }

  for (const driver of normalized.drivers ?? []) {
    driver.temporaryPassword = String(driver.temporaryPassword ?? "").trim() || "demo";
    driver.status = driver.status || "active";
  }

  for (const customer of normalized.customers ?? []) {
    customer.portalPassword = String(customer.portalPassword ?? "").trim() || "demo";
  }

  normalized.tenantPricingConfigs[DEMO_TENANT_ID] = normalized.tenantPricingConfigs[DEMO_TENANT_ID] ?? structuredClone(normalized.pricingConfig);
  normalized.tenantPricingConfigs[PLATFORM_TENANT_ID] = normalized.tenantPricingConfigs[PLATFORM_TENANT_ID] ?? structuredClone(normalized.pricingConfig);

  return normalized;
}
