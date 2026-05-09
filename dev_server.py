#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import mimetypes
import re
import threading
from copy import deepcopy
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.parse import parse_qs, urlencode, urlparse
from urllib.request import Request, urlopen
import uuid


ROOT_DIR = Path(__file__).resolve().parent
OPS_FRONTEND_DIR = ROOT_DIR / "apps" / "ops-web"
MARKETING_FRONTEND_DIR = ROOT_DIR / "apps" / "marketing-site"
PORTAL_FRONTEND_DIR = ROOT_DIR / "apps" / "customer-portal"
CARRIER_FRONTEND_DIR = ROOT_DIR / "apps" / "carrier-app"
DATA_DIR = ROOT_DIR / "services" / "core-api" / "data"
DB_PATH = DATA_DIR / "db.json"
DB_LOCK = threading.Lock()
ENV_PATHS = [ROOT_DIR / ".env.local", ROOT_DIR / ".env"]


def load_local_env() -> dict[str, str]:
    values: dict[str, str] = {}

    for path in ENV_PATHS:
        if not path.exists():
            continue

        for raw_line in path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue

            key, raw_value = line.split("=", 1)
            values[key.strip()] = raw_value.strip().strip('"').strip("'")

    return values


def load_runtime_config() -> dict[str, str]:
    local_env = load_local_env()
    return {
        "graphhopper_api_key": os.environ.get("GRAPHHOPPER_API_KEY") or local_env.get("GRAPHHOPPER_API_KEY", ""),
        "graphhopper_base_url": os.environ.get("GRAPHHOPPER_BASE_URL")
        or local_env.get("GRAPHHOPPER_BASE_URL", "https://graphhopper.com/api/1"),
        "planning_solver": os.environ.get("PLANNING_SOLVER") or local_env.get("PLANNING_SOLVER", "auto"),
    }


RUNTIME_CONFIG = load_runtime_config()


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def today_at(hours: int, minutes: int) -> str:
    value = datetime.now().astimezone().replace(hour=hours, minute=minutes, second=0, microsecond=0)
    return value.isoformat()


def create_id(prefix: str) -> str:
    return f"{prefix}_{datetime.now().strftime('%Y%m%d%H%M%S')}_{uuid.uuid4().hex[:6]}"


def parse_iso_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    normalized = str(value).strip()
    if normalized.endswith("Z"):
        normalized = normalized[:-1] + "+00:00"
    return datetime.fromisoformat(normalized)


def default_pricing_config() -> dict[str, Any]:
    return {
        "currency": "EUR",
        "basic": {
            "distanceRatePerKm": 0.5,
            "sizeBasePrices": {
                "S": 9.8,
                "M": 14.4,
                "L": 18.91,
                "XL": 24.6,
                "XXL": 29.8,
            },
        },
        "pallet": {
            "pricePerPallet": 35.0,
            "vehicleThresholds": {
                "van_3m3": 2,
                "van_5m3": 4,
                "van_10m3": 6,
                "van_20m3": 8,
            },
        },
        "hours": {
            "minimumHours": 3,
            "includedKm": 150,
            "vehicleHourlyRates": {
                "bike": 16.5,
                "scooter": 19.5,
                "car": 23.0,
                "van_3m3": 28.75,
                "van_5m3": 31.62,
                "van_10m3": 36.36,
                "van_15m3": 41.84,
                "van_20m3": 48.11,
            },
        },
        "drops": {
            "minimumDrops": 10,
            "includedKm": 100,
            "vehicleDropRates": {
                "car": 8.5,
                "van_3m3": 11.0,
                "van_5m3": 13.25,
                "van_10m3": 16.2,
                "van_15m3": 18.9,
                "van_20m3": 22.4,
            },
        },
    }


PLATFORM_TENANT_ID = "tenant_naaval_internal"
DEMO_TENANT_ID = "tenant_demo_transport"
DEFAULT_SIGNUP_PLAN_ID = "trial"


def slugify(value: str, fallback: str = "tenant") -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", str(value or "").strip().lower()).strip("-")
    return slug or fallback


def module_catalog() -> list[dict[str, Any]]:
    return [
        {"id": "orders", "label": "Orders"},
        {"id": "drivers", "label": "Drivers"},
        {"id": "optimizer", "label": "Optimizer"},
        {"id": "customers", "label": "Customers"},
        {"id": "recurring_routes", "label": "Recurring Routes"},
        {"id": "pricing", "label": "Pricing Simulator"},
        {"id": "inbox", "label": "Inbox"},
        {"id": "admin_users", "label": "Ops Users"},
        {"id": "pricing_admin", "label": "Pricing Setup"},
        {"id": "customer_portal", "label": "Customer Portal"},
        {"id": "dispatch_suggestions", "label": "Dispatch Suggestions"},
        {"id": "pricing_zones", "label": "Pricing Zones"},
        {"id": "capacity_optimization", "label": "Capacity Optimization"},
        {"id": "profitability_analytics", "label": "Cost/KM Analytics"},
        {"id": "notifications", "label": "Client Notifications"},
        {"id": "message_templates", "label": "SMS/Email Templates"},
        {"id": "teams", "label": "Team Management"},
        {"id": "advanced_permissions", "label": "Advanced Permissions"},
        {"id": "multi_warehouse", "label": "Multi Warehouse"},
        {"id": "api", "label": "API"},
        {"id": "webhooks", "label": "Webhooks"},
        {"id": "integrations", "label": "ERP / Shopify / WMS"},
        {"id": "white_label_tracking", "label": "White-label Tracking"},
        {"id": "geojson_export", "label": "GeoJSON Export"},
        {"id": "driver_analytics", "label": "Driver Analytics"},
        {"id": "custom_branding", "label": "Custom Branding"},
        {"id": "dedicated_support", "label": "Dedicated Support"},
        {"id": "sla", "label": "SLA / OPS Support"},
        {"id": "dedicated_hosting", "label": "Dedicated Hosting"},
        {"id": "custom_development", "label": "Custom Development"},
    ]


def algorithm_catalog() -> list[dict[str, Any]]:
    return [
        {"id": "basic", "label": "Just Price"},
        {"id": "drops", "label": "Per Drop"},
        {"id": "hours", "label": "Point of Sales"},
        {"id": "pallet", "label": "Prix Palette"},
    ]


def saas_plan_catalog() -> dict[str, dict[str, Any]]:
    starter_modules = [
        "orders",
        "drivers",
        "optimizer",
        "pricing",
        "inbox",
        "recurring_routes",
        "admin_users",
        "pricing_admin",
    ]
    growth_modules = starter_modules + [
        "customers",
        "dispatch_suggestions",
        "pricing_zones",
        "capacity_optimization",
        "profitability_analytics",
        "notifications",
        "message_templates",
        "teams",
    ]
    scale_modules = growth_modules + [
        "advanced_permissions",
        "multi_warehouse",
        "api",
        "webhooks",
        "integrations",
        "customer_portal",
        "white_label_tracking",
        "geojson_export",
        "driver_analytics",
        "custom_branding",
    ]
    enterprise_modules = scale_modules + [
        "dedicated_support",
        "sla",
        "dedicated_hosting",
        "custom_development",
    ]

    starter_algorithms = ["basic", "drops", "hours", "pallet"]
    return {
        "trial": {
            "id": "trial",
            "label": "Trial",
            "monthlyPriceEur": 0,
            "modules": starter_modules,
            "algorithms": starter_algorithms,
            "usageLimits": {
                "includedDrivers": 3,
                "includedUsers": 2,
                "includedOrdersPerMonth": 500,
                "includedRunsPerMonth": 100,
            },
        },
        "starter": {
            "id": "starter",
            "label": "Starter",
            "monthlyPriceEur": 79,
            "modules": starter_modules,
            "algorithms": starter_algorithms,
            "usageLimits": {
                "includedDrivers": 3,
                "includedUsers": 3,
                "includedOrdersPerMonth": 5000,
                "includedRunsPerMonth": 500,
            },
        },
        "growth": {
            "id": "growth",
            "label": "Growth",
            "monthlyPriceEur": 199,
            "modules": growth_modules,
            "algorithms": starter_algorithms,
            "usageLimits": {
                "includedDrivers": 15,
                "includedUsers": 10,
                "includedOrdersPerMonth": 25000,
                "includedRunsPerMonth": 3000,
            },
        },
        "scale": {
            "id": "scale",
            "label": "Scale",
            "monthlyPriceEur": 449,
            "modules": scale_modules,
            "algorithms": starter_algorithms,
            "usageLimits": {
                "includedDrivers": 75,
                "includedUsers": 50,
                "includedOrdersPerMonth": 100000,
                "includedRunsPerMonth": 15000,
            },
        },
        "enterprise": {
            "id": "enterprise",
            "label": "Enterprise",
            "monthlyPriceEur": None,
            "modules": enterprise_modules,
            "algorithms": starter_algorithms,
            "usageLimits": {
                "includedDrivers": None,
                "includedUsers": None,
                "includedOrdersPerMonth": None,
                "includedRunsPerMonth": None,
            },
        },
    }


def build_default_tenants(timestamp: str) -> list[dict[str, Any]]:
    return [
        {
            "id": PLATFORM_TENANT_ID,
            "companyId": PLATFORM_TENANT_ID,
            "slug": "naaval-internal",
            "companyName": "Naaval Internal",
            "status": "active",
            "planId": "enterprise",
            "enabledModules": [],
            "disabledModules": [],
            "enabledAlgorithms": [],
            "disabledAlgorithms": [],
            "usageOverrides": {},
            "moduleOverrides": {},
            "algorithmOverrides": {},
            "createdAt": timestamp,
            "updatedAt": timestamp,
        },
        {
            "id": DEMO_TENANT_ID,
            "companyId": DEMO_TENANT_ID,
            "slug": "naaval-demo-transport",
            "companyName": "Naaval Demo Transport",
            "status": "active",
            "planId": DEFAULT_SIGNUP_PLAN_ID,
            "enabledModules": [],
            "disabledModules": [],
            "enabledAlgorithms": [],
            "disabledAlgorithms": [],
            "usageOverrides": {},
            "moduleOverrides": {},
            "algorithmOverrides": {},
            "createdAt": timestamp,
            "updatedAt": timestamp,
        },
    ]


def resolve_plan(plan_id: str | None) -> dict[str, Any]:
    catalog = saas_plan_catalog()
    return deepcopy(catalog.get(str(plan_id or "").strip().lower()) or catalog["starter"])


def resolve_tenant_context(tenant: dict[str, Any] | None) -> dict[str, Any]:
    if not tenant:
        plan = resolve_plan("starter")
        return {
            "tenant": None,
            "plan": plan,
            "modules": plan["modules"],
            "algorithms": plan["algorithms"],
            "usageLimits": plan["usageLimits"],
        }

    plan = resolve_plan(tenant.get("planId"))
    modules = set(plan.get("modules", []))
    algorithms = set(plan.get("algorithms", []))
    modules.update(str(item) for item in tenant.get("enabledModules", []) if item)
    algorithms.update(str(item) for item in tenant.get("enabledAlgorithms", []) if item)
    modules.difference_update(str(item) for item in tenant.get("disabledModules", []) if item)
    algorithms.difference_update(str(item) for item in tenant.get("disabledAlgorithms", []) if item)
    usage_limits = {**deepcopy(plan.get("usageLimits", {})), **deepcopy(tenant.get("usageOverrides", {}))}
    return {
        "tenant": deepcopy(tenant),
        "plan": plan,
        "modules": sorted(modules),
        "algorithms": sorted(algorithms),
        "usageLimits": usage_limits,
    }


def ensure_tenant_scope(entity: dict[str, Any], tenant_id: str) -> dict[str, Any]:
    entity.setdefault("tenantId", tenant_id)
    entity.setdefault("companyId", entity.get("tenantId") or tenant_id)
    return entity


def is_platform_role(role: str | None) -> bool:
    return str(role or "").strip() in {"super_admin", "naaval_admin"}


def empty_db() -> dict[str, Any]:
    return {
        "tenants": [],
        "authSessions": [],
        "hubs": [],
        "vehicleTypes": [],
        "vehicles": [],
        "carrierCompanies": [],
        "drivers": [],
        "opsUsers": [],
        "shifts": [],
        "customers": [],
        "quotes": [],
        "recurringRoutes": [],
        "graphhopperUsage": {
            "enabled": False,
            "remaining": None,
            "limit": None,
            "resetSeconds": None,
            "updatedAt": None,
            "source": "unknown",
        },
        "orders": [],
        "planningJobs": [],
        "routes": [],
        "heartbeats": [],
        "proofs": [],
        "inboxMessages": [],
        "events": [],
        "pricingConfig": default_pricing_config(),
        "tenantPricingConfigs": {},
    }


def ensure_db() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    if not DB_PATH.exists():
        DB_PATH.write_text(json.dumps(empty_db(), indent=2), encoding="utf-8")


def normalize_db(db: dict[str, Any]) -> dict[str, Any]:
    normalized = dict(db)
    baseline = empty_db()

    for key, value in baseline.items():
        if key not in normalized:
            normalized[key] = deepcopy(value)

    if not isinstance(normalized.get("pricingConfig"), dict):
        normalized["pricingConfig"] = default_pricing_config()

    if not isinstance(normalized.get("tenantPricingConfigs"), dict):
        normalized["tenantPricingConfigs"] = {}

    timestamp = now_iso()
    default_tenants = build_default_tenants(timestamp)
    existing_tenants = {str(item.get("id")): item for item in normalized.get("tenants", []) if item.get("id")}
    if not normalized.get("tenants"):
        normalized["tenants"] = deepcopy(default_tenants)
    else:
        for default_tenant in default_tenants:
            tenant_id = default_tenant["id"]
            if tenant_id not in existing_tenants:
                normalized["tenants"].append(deepcopy(default_tenant))
            else:
                tenant = existing_tenants[tenant_id]
                tenant.setdefault("companyId", tenant_id)
                tenant.setdefault("slug", default_tenant["slug"])
                tenant.setdefault("companyName", default_tenant["companyName"])
                tenant.setdefault("status", default_tenant["status"])
                tenant.setdefault("planId", default_tenant["planId"])
                tenant.setdefault("enabledModules", [])
                tenant.setdefault("disabledModules", [])
                tenant.setdefault("enabledAlgorithms", [])
                tenant.setdefault("disabledAlgorithms", [])
                tenant.setdefault("usageOverrides", {})
                tenant.setdefault("moduleOverrides", {})
                tenant.setdefault("algorithmOverrides", {})

    default_ops_users = [
        {
            "id": "ops_user_pierre",
            "firstName": "Pierre",
            "lastName": "Ops",
            "email": "pierre@naaval.app",
            "role": "super_admin",
            "team": "Naaval HQ",
            "temporaryPassword": "demo",
            "status": "active",
            "tenantId": PLATFORM_TENANT_ID,
            "companyId": PLATFORM_TENANT_ID,
            "createdAt": timestamp,
            "updatedAt": timestamp,
        },
        {
            "id": "ops_user_demo",
            "firstName": "Demo",
            "lastName": "Transport",
            "email": "demo@naaval.app",
            "role": "company_admin",
            "team": "Operations",
            "temporaryPassword": "demo",
            "status": "active",
            "tenantId": DEMO_TENANT_ID,
            "companyId": DEMO_TENANT_ID,
            "createdAt": timestamp,
            "updatedAt": timestamp,
        },
    ]

    if not normalized.get("opsUsers"):
        normalized["opsUsers"] = deepcopy(default_ops_users)
    else:
        existing_by_email = {str(user.get("email", "")).strip().lower(): user for user in normalized["opsUsers"]}
        for default_user in default_ops_users:
            email = str(default_user["email"]).strip().lower()
            if email not in existing_by_email:
                normalized["opsUsers"].append(deepcopy(default_user))
            else:
                existing = existing_by_email[email]
                existing.setdefault("temporaryPassword", default_user["temporaryPassword"])
                existing.setdefault("status", default_user["status"])
                existing.setdefault("team", default_user["team"])
                existing.setdefault("role", default_user["role"])
                existing.setdefault("tenantId", default_user["tenantId"])
                existing.setdefault("companyId", default_user["companyId"])

    role_mapping = {
        "ops_admin": "company_admin",
        "ops_manager": "company_admin",
        "ops_dispatcher": "company_user",
        "ops_agent": "company_user",
    }

    for user in normalized["opsUsers"]:
        email = str(user.get("email", "")).strip().lower()
        if email == "pierre@naaval.app":
            user["role"] = "super_admin"
            user["tenantId"] = PLATFORM_TENANT_ID
            user["companyId"] = PLATFORM_TENANT_ID
        elif email == "demo@naaval.app":
            user["role"] = "company_admin"
            user["tenantId"] = DEMO_TENANT_ID
            user["companyId"] = DEMO_TENANT_ID
        else:
            user["role"] = role_mapping.get(str(user.get("role") or "").strip(), str(user.get("role") or "company_user").strip() or "company_user")
            ensure_tenant_scope(user, str(user.get("tenantId") or DEMO_TENANT_ID))
        user.setdefault("temporaryPassword", "demo")
        user.setdefault("status", "active")
        user.setdefault("team", "Operations")

    tenant_scoped_keys = [
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
        "inboxMessages",
    ]
    for key in tenant_scoped_keys:
        for item in normalized.get(key, []):
            ensure_tenant_scope(item, str(item.get("tenantId") or DEMO_TENANT_ID))

    normalized["tenantPricingConfigs"].setdefault(DEMO_TENANT_ID, deepcopy(normalized["pricingConfig"]))
    normalized["tenantPricingConfigs"].setdefault(PLATFORM_TENANT_ID, deepcopy(normalized["pricingConfig"]))

    return normalized


def read_db() -> dict[str, Any]:
    ensure_db()
    with DB_LOCK:
        raw = DB_PATH.read_text(encoding="utf-8").strip()
        if not raw:
            db = empty_db()
            DB_PATH.write_text(json.dumps(db, indent=2), encoding="utf-8")
            return db
        return normalize_db(json.loads(raw))


def write_db(db: dict[str, Any]) -> None:
    ensure_db()
    temp_path = DB_PATH.with_suffix(".tmp")
    with DB_LOCK:
        temp_path.write_text(json.dumps(db, indent=2), encoding="utf-8")
        temp_path.replace(DB_PATH)


def append_event(db: dict[str, Any], event_type: str, entity_type: str, entity_id: str, payload: dict[str, Any] | None = None) -> None:
    db["events"].insert(
        0,
        {
            "id": create_id("evt"),
            "type": event_type,
            "entityType": entity_type,
            "entityId": entity_id,
            "payload": payload or {},
            "occurredAt": now_iso(),
        },
    )


def create_capacity_array(entity: dict[str, Any]) -> list[int]:
    capacity = entity.get("capacity") or {}
    return [
        int(capacity.get("parcels", entity.get("parcelCount", 0)) or 0),
        int(capacity.get("weightKg", entity.get("weightKg", 0)) or 0),
        int(capacity.get("volumeDm3", entity.get("volumeDm3", 0)) or 0),
    ]


def graphhopper_priority(value: Any) -> int:
    return max(1, int(value or 1))


def to_epoch_seconds(value: str | None) -> int | None:
    if not value:
        return None
    parsed = parse_iso_datetime(value)
    return int(parsed.timestamp()) if parsed else None


def rebase_iso_datetime(value: str | None, plan_date: str) -> str | None:
    if not value:
        return None

    original = parse_iso_datetime(value)
    if not original:
        return None
    rebased = datetime.fromisoformat(f"{plan_date}T{original.strftime('%H:%M:%S')}")
    if original.tzinfo is not None:
        rebased = rebased.replace(tzinfo=original.tzinfo)
    return rebased.isoformat()


def materialize_shift_for_plan_date(shift: dict[str, Any], plan_date: str) -> dict[str, Any]:
    planned_shift = deepcopy(shift)
    rebased_start = rebase_iso_datetime(shift.get("startAt"), plan_date)
    rebased_end = rebase_iso_datetime(shift.get("endAt"), plan_date)

    if rebased_start:
        planned_shift["startAt"] = rebased_start
    if rebased_end:
        planned_shift["endAt"] = rebased_end

    if rebased_start and rebased_end:
        start_value = datetime.fromisoformat(rebased_start)
        end_value = datetime.fromisoformat(rebased_end)
        if end_value <= start_value:
            planned_shift["endAt"] = (end_value + timedelta(days=1)).isoformat()

    return planned_shift


def to_graphhopper_address(location_id: str, address: dict[str, Any] | None) -> dict[str, Any]:
    coordinates = (address or {}).get("coordinates") or {}
    lat = coordinates.get("lat")
    lon = coordinates.get("lon")
    if lat is None or lon is None:
        raise ValueError(f"Coordinates are required for {location_id}")

    return {
        "location_id": location_id,
        "lat": lat,
        "lon": lon,
    }


def address_identity_key(address: dict[str, Any] | None) -> str:
    if not address:
        return ""

    coordinates = (address.get("coordinates") or {}) if isinstance(address, dict) else {}
    lat = coordinates.get("lat")
    lon = coordinates.get("lon")
    if lat is not None and lon is not None:
        return f"{round(float(lat), 6)}:{round(float(lon), 6)}"

    return "|".join(
        [
            str(address.get("street1", "")).strip().lower(),
            str(address.get("postalCode", "")).strip().lower(),
            str(address.get("city", "")).strip().lower(),
            str(address.get("countryCode", "")).strip().lower(),
        ]
    )


def detect_common_pickup_context(orders: list[dict[str, Any]]) -> dict[str, Any] | None:
    pickup_addresses = [deepcopy(order.get("pickupAddress")) for order in orders if order.get("pickupAddress")]
    if len(pickup_addresses) != len(orders) or not pickup_addresses:
        return None

    pickup_group_ids = {
        str(order.get("pickupGroupId", "")).strip()
        for order in orders
        if order.get("pickupAddress")
    }
    pickup_group_ids.discard("")
    if len(pickup_group_ids) > 1:
        return None

    pickup_keys = {address_identity_key(address) for address in pickup_addresses}
    if len(pickup_keys) != 1:
        return None

    return {
        "address": pickup_addresses[0],
        "orderIds": [order["id"] for order in orders],
    }


def build_objectives(objective_preset: str) -> list[dict[str, str]]:
    if objective_preset == "fleet_min":
        return [
            {"type": "min", "value": "vehicles"},
            {"type": "min", "value": "completion_time"},
        ]

    if objective_preset == "speed":
        return [{"type": "min", "value": "completion_time"}]

    if objective_preset == "distance":
        return [{"type": "min", "value": "completion_time"}]

    return [
        {"type": "min", "value": "vehicles"},
        {"type": "min", "value": "completion_time"},
    ]


def build_graphhopper_problem(
    orders: list[dict[str, Any]],
    shifts: list[dict[str, Any]],
    vehicle_types: list[dict[str, Any]],
    objective_preset: str,
) -> tuple[dict[str, Any], dict[str, Any] | None]:
    services: list[dict[str, Any]] = []
    shipments: list[dict[str, Any]] = []
    common_pickup = detect_common_pickup_context(orders)

    for order in orders:
        order_kind = order.get("kind")
        service_duration = int(order.get("serviceDurationSeconds", 300) or 300)
        pickup_service_duration = int(order.get("pickupServiceDurationSeconds", service_duration) or service_duration)

        if common_pickup:
            service: dict[str, Any] = {
                "id": order["id"],
                "name": order.get("reference", order["id"]),
                "address": to_graphhopper_address(f"order:{order['id']}:dropoff", order.get("dropoffAddress")),
                "duration": service_duration,
                "size": create_capacity_array(order),
                "required_skills": order.get("requiredSkills", []),
                "priority": graphhopper_priority(order.get("priority")),
            }

            time_windows = []
            for window in order.get("timeWindows", []) or []:
                earliest = to_epoch_seconds(window.get("start"))
                latest = to_epoch_seconds(window.get("end"))
                if earliest and latest:
                    time_windows.append({"earliest": earliest, "latest": latest})

            if time_windows:
                service["time_windows"] = time_windows

            services.append(service)
            continue

        if order.get("pickupAddress") and order.get("dropoffAddress") and order_kind != "delivery_only":
            shipments.append(
                {
                    "id": order["id"],
                    "name": order.get("reference", order["id"]),
                    "pickup": {
                        "address": to_graphhopper_address(f"order:{order['id']}:pickup", order.get("pickupAddress")),
                        "duration": pickup_service_duration,
                    },
                    "delivery": {
                        "address": to_graphhopper_address(f"order:{order['id']}:dropoff", order.get("dropoffAddress")),
                        "duration": service_duration,
                    },
                    "size": create_capacity_array(order),
                    "required_skills": order.get("requiredSkills", []),
                    "priority": graphhopper_priority(order.get("priority")),
                }
            )
            continue

        service: dict[str, Any] = {
            "id": order["id"],
            "name": order.get("reference", order["id"]),
            "address": to_graphhopper_address(f"order:{order['id']}:dropoff", order.get("dropoffAddress")),
            "duration": service_duration,
            "size": create_capacity_array(order),
            "required_skills": order.get("requiredSkills", []),
            "priority": graphhopper_priority(order.get("priority")),
        }

        time_windows = []
        for window in order.get("timeWindows", []) or []:
            earliest = to_epoch_seconds(window.get("start"))
            latest = to_epoch_seconds(window.get("end"))
            if earliest and latest:
                time_windows.append({"earliest": earliest, "latest": latest})

        if time_windows:
            service["time_windows"] = time_windows

        services.append(service)

    vehicles = []
    for shift in shifts:
        start_address = common_pickup["address"] if common_pickup else {"coordinates": shift.get("startCoordinates")}
        vehicle = {
            "vehicle_id": shift["id"],
            "type_id": shift["vehicleTypeId"],
            "start_address": to_graphhopper_address(
                f"shift:{shift['id']}:start",
                start_address,
            ),
            "earliest_start": to_epoch_seconds(shift.get("startAt")),
            "latest_end": to_epoch_seconds(shift.get("endAt")),
            "skills": shift.get("skills", []),
        }
        if shift.get("endCoordinates"):
            vehicle["end_address"] = to_graphhopper_address(
                f"shift:{shift['id']}:end",
                {"coordinates": shift.get("endCoordinates")},
            )
        vehicles.append(vehicle)

    return (
        {
            "vehicles": vehicles,
            "vehicle_types": [
                {
                    "type_id": vehicle_type["id"],
                    "profile": vehicle_type.get("routingProfile", "car"),
                    "capacity": create_capacity_array(vehicle_type),
                }
                for vehicle_type in vehicle_types
            ],
            "services": services,
            "shipments": shipments,
            "objectives": build_objectives(objective_preset),
        },
        common_pickup,
    )


def graphhopper_request(path: str, body: dict[str, Any] | None = None) -> dict[str, Any]:
    api_key = RUNTIME_CONFIG.get("graphhopper_api_key", "")
    if not api_key:
        raise ValueError("GraphHopper API key is missing")

    base_url = RUNTIME_CONFIG.get("graphhopper_base_url", "https://graphhopper.com/api/1").rstrip("/")
    separator = "&" if "?" in path else "?"
    url = f"{base_url}{path}{separator}{urlencode({'key': api_key})}"
    payload = json.dumps(body).encode("utf-8") if body is not None else None
    request = Request(
        url,
        data=payload,
        method="POST" if body is not None else "GET",
        headers={"Content-Type": "application/json"} if body is not None else {},
    )

    try:
        with urlopen(request, timeout=60) as response:
            payload = json.loads(response.read().decode("utf-8"))
            usage = {
                "enabled": True,
                "remaining": response.headers.get("X-RateLimit-Remaining"),
                "limit": response.headers.get("X-RateLimit-Limit"),
                "resetSeconds": response.headers.get("X-RateLimit-Reset"),
                "updatedAt": now_iso(),
                "source": "graphhopper",
            }
            return {
                "data": payload,
                "usage": usage,
            }
    except HTTPError as error:
        details = error.read().decode("utf-8", errors="ignore")
        raise ValueError(details or f"GraphHopper request failed with status {error.code}") from error
    except URLError as error:
        raise ValueError(f"Unable to reach GraphHopper: {error.reason}") from error


def route_profile_for_shift(shift: dict[str, Any] | None) -> str:
    vehicle_type_id = str((shift or {}).get("vehicleTypeId", "")).lower()
    if "bike" in vehicle_type_id:
        return "bike"
    if "foot" in vehicle_type_id:
        return "foot"
    return "car"


def graphhopper_route_geometry(points: list[dict[str, float]], profile: str = "car") -> dict[str, Any]:
    api_key = RUNTIME_CONFIG.get("graphhopper_api_key", "")
    if not api_key:
        raise ValueError("GraphHopper API key is missing")
    if len(points) < 2:
        return {"coordinates": points, "source": "fallback"}

    base_url = RUNTIME_CONFIG.get("graphhopper_base_url", "https://graphhopper.com/api/1").rstrip("/")
    params: list[tuple[str, str]] = [
        ("profile", profile),
        ("points_encoded", "false"),
        ("instructions", "false"),
        ("calc_points", "true"),
        ("key", api_key),
    ]
    for point in points:
        params.append(("point", f"{point['lat']},{point['lon']}"))

    url = f"{base_url}/route?{urlencode(params, doseq=True)}"
    request = Request(url, method="GET")

    try:
        with urlopen(request, timeout=60) as response:
            payload = json.loads(response.read().decode("utf-8"))
            raw_points = ((payload.get("paths") or [{}])[0].get("points") or {})
            coordinates = raw_points.get("coordinates") or []
            decoded = [{"lat": coord[1], "lon": coord[0]} for coord in coordinates if len(coord) >= 2]
            usage = {
                "enabled": True,
                "remaining": response.headers.get("X-RateLimit-Remaining"),
                "limit": response.headers.get("X-RateLimit-Limit"),
                "resetSeconds": response.headers.get("X-RateLimit-Reset"),
                "updatedAt": now_iso(),
                "source": "graphhopper",
            }
            return {
                "coordinates": decoded or points,
                "source": "graphhopper",
                "usage": usage,
            }
    except HTTPError as error:
        details = error.read().decode("utf-8", errors="ignore")
        raise ValueError(details or f"GraphHopper route request failed with status {error.code}") from error
    except URLError as error:
        raise ValueError(f"Unable to reach GraphHopper route service: {error.reason}") from error


def has_coordinates(address: dict[str, Any] | None) -> bool:
    coordinates = (address or {}).get("coordinates") or {}
    return coordinates.get("lat") is not None and coordinates.get("lon") is not None


def build_address_query(address: dict[str, Any] | None) -> str:
    if not address:
        return ""

    parts = [
        (address.get("street1") or "").strip(),
        (address.get("postalCode") or "").strip(),
        (address.get("city") or "").strip(),
        (address.get("countryCode") or "").strip(),
    ]
    return ", ".join(part for part in parts if part)


def graphhopper_geocode(address: dict[str, Any] | None) -> dict[str, Any] | None:
    if not address or has_coordinates(address):
        return address

    api_key = RUNTIME_CONFIG.get("graphhopper_api_key", "")
    if not api_key:
        return address

    query = build_address_query(address)
    if not query:
        return address

    base_url = RUNTIME_CONFIG.get("graphhopper_base_url", "https://graphhopper.com/api/1").rstrip("/")
    params: list[tuple[str, str]] = [
        ("q", query),
        ("limit", "1"),
        ("locale", "fr"),
        ("key", api_key),
    ]
    country_code = str(address.get("countryCode") or "").strip().lower()
    if country_code:
        params.append(("countrycode", country_code))

    url = f"{base_url}/geocode?{urlencode(params, doseq=True)}"
    request = Request(url, method="GET")

    try:
        with urlopen(request, timeout=30) as response:
            payload = json.loads(response.read().decode("utf-8"))
            hit = ((payload.get("hits") or [None])[0]) or None
            point = (hit or {}).get("point") or {}
            lat = point.get("lat")
            lon = point.get("lng")
            if lat is None or lon is None:
                return address

            enriched = deepcopy(address)
            enriched["coordinates"] = {
                "lat": lat,
                "lon": lon,
            }
            return enriched
    except HTTPError:
        return address
    except URLError:
        return address


def enrich_order_coordinates(order: dict[str, Any]) -> bool:
    changed = False

    if order.get("pickupAddress") and not has_coordinates(order.get("pickupAddress")):
        pickup_address = graphhopper_geocode(order.get("pickupAddress"))
        if has_coordinates(pickup_address):
            order["pickupAddress"] = pickup_address
            changed = True

    if order.get("dropoffAddress") and not has_coordinates(order.get("dropoffAddress")):
        dropoff_address = graphhopper_geocode(order.get("dropoffAddress"))
        if has_coordinates(dropoff_address):
            order["dropoffAddress"] = dropoff_address
            changed = True

    return changed


def map_activity_kind(activity_type: str) -> str:
    if activity_type == "pickupShipment":
        return "pickup"
    if activity_type == "break":
        return "break"
    return "delivery"


def stop_order_ids(stop: dict[str, Any] | None) -> list[str]:
    if not stop:
        return []

    order_ids = [str(order_id) for order_id in (stop.get("orderIds") or []) if order_id]
    primary = stop.get("orderId")
    if primary:
        primary = str(primary)
        if primary not in order_ids:
            order_ids.insert(0, primary)
    return order_ids


def same_activity_location(left: dict[str, Any], right: dict[str, Any]) -> bool:
    if left.get("location_id") and right.get("location_id") and left.get("location_id") == right.get("location_id"):
        return True

    left_address = left.get("address") or {}
    right_address = right.get("address") or {}
    left_lat = left_address.get("lat")
    left_lon = left_address.get("lon")
    right_lat = right_address.get("lat")
    right_lon = right_address.get("lon")
    if None in {left_lat, left_lon, right_lat, right_lon}:
        return False

    return round(float(left_lat), 6) == round(float(right_lat), 6) and round(float(left_lon), 6) == round(float(right_lon), 6)


def hydrate_graphhopper_routes(
    plan_id: str,
    solution: dict[str, Any],
    shifts: list[dict[str, Any]],
    orders: list[dict[str, Any]],
    common_pickup: dict[str, Any] | None = None,
) -> list[dict[str, Any]]:
    order_map = {order["id"]: order for order in orders}
    routes = []

    for route in solution.get("solution", {}).get("routes", []):
        shift = next((candidate for candidate in shifts if candidate["id"] == route.get("vehicle_id")), None)
        if not shift:
            raise ValueError(f"Unknown shift returned by GraphHopper: {route.get('vehicle_id')}")

        route_id = create_id("route")
        stops = []
        activities = route.get("activities", [])
        start_activity = next((activity for activity in activities if activity.get("type") == "start"), None)
        route_order_ids = []
        seen_route_order_ids = set()
        for activity in activities:
            activity_order_id = activity.get("id")
            if activity_order_id and activity_order_id not in seen_route_order_ids:
                seen_route_order_ids.add(activity_order_id)
                route_order_ids.append(activity_order_id)

        if common_pickup and route_order_ids:
            first_real_activity = next((activity for activity in activities if activity.get("type") not in {"start", "end"}), None)
            pickup_arrival = None
            pickup_departure = None
            if start_activity and start_activity.get("end_time") is not None:
                pickup_arrival = datetime.fromtimestamp(start_activity["end_time"], tz=timezone.utc).astimezone().isoformat()
            if first_real_activity and first_real_activity.get("arr_time") is not None:
                pickup_departure = datetime.fromtimestamp(first_real_activity["arr_time"], tz=timezone.utc).astimezone().isoformat()

            stops.append(
                {
                    "id": f"{route_id}_stop_1",
                    "orderId": route_order_ids[0],
                    "orderIds": route_order_ids,
                    "sequence": 1,
                    "kind": "pickup",
                    "address": deepcopy(common_pickup["address"]),
                    "plannedArrivalAt": pickup_arrival,
                    "plannedDepartureAt": pickup_departure or pickup_arrival,
                    "status": "pending",
                }
            )
        activity_index = 0
        while activity_index < len(activities):
            activity = activities[activity_index]
            activity_type = activity.get("type")
            if activity_type in {"start", "end"}:
                activity_index += 1
                continue

            if activity_type == "pickupShipment":
                pickup_group = [activity]
                next_index = activity_index + 1
                while next_index < len(activities):
                    candidate = activities[next_index]
                    if candidate.get("type") != "pickupShipment" or not same_activity_location(activity, candidate):
                        break
                    pickup_group.append(candidate)
                    next_index += 1

                grouped_orders = [order_map.get(item.get("id")) for item in pickup_group if order_map.get(item.get("id"))]
                primary_order = grouped_orders[0] if grouped_orders else None
                order_ids = [order["id"] for order in grouped_orders]
                address = {
                    "label": activity.get("location_id", "planned pickup"),
                    "street1": "Unknown",
                    "city": "Unknown",
                    "postalCode": "Unknown",
                    "countryCode": "XX",
                    "coordinates": {
                        "lat": (activity.get("address") or {}).get("lat"),
                        "lon": (activity.get("address") or {}).get("lon"),
                    },
                }

                if primary_order and primary_order.get("pickupAddress"):
                    address = deepcopy(primary_order["pickupAddress"])

                first_pickup = pickup_group[0]
                last_pickup = pickup_group[-1]
                stops.append(
                    {
                        "id": f"{route_id}_stop_{len(stops) + 1}",
                        "orderId": order_ids[0] if order_ids else first_pickup.get("id"),
                        "orderIds": order_ids,
                        "sequence": len(stops) + 1,
                        "kind": "pickup",
                        "address": address,
                        "plannedArrivalAt": datetime.fromtimestamp(first_pickup["arr_time"], tz=timezone.utc).astimezone().isoformat()
                        if first_pickup.get("arr_time") is not None
                        else None,
                        "plannedDepartureAt": datetime.fromtimestamp(last_pickup["end_time"], tz=timezone.utc).astimezone().isoformat()
                        if last_pickup.get("end_time") is not None
                        else None,
                        "status": "pending",
                    }
                )
                activity_index = next_index
                continue

            order = order_map.get(activity.get("id"))
            kind = map_activity_kind(activity_type or "delivery")
            address = {
                "label": activity.get("location_id", "planned stop"),
                "street1": "Unknown",
                "city": "Unknown",
                "postalCode": "Unknown",
                "countryCode": "XX",
                "coordinates": {
                    "lat": (activity.get("address") or {}).get("lat"),
                    "lon": (activity.get("address") or {}).get("lon"),
                },
            }

            if order:
                if kind == "pickup" and order.get("pickupAddress"):
                    address = deepcopy(order["pickupAddress"])
                elif order.get("dropoffAddress"):
                    address = deepcopy(order["dropoffAddress"])

            stops.append(
                {
                    "id": f"{route_id}_stop_{len(stops) + 1}",
                    "orderId": order.get("id") if order else activity.get("id"),
                    "orderIds": [order["id"]] if order else ([activity.get("id")] if activity.get("id") else []),
                    "sequence": len(stops) + 1,
                    "kind": kind,
                    "address": address,
                    "plannedArrivalAt": datetime.fromtimestamp(activity["arr_time"], tz=timezone.utc).astimezone().isoformat()
                    if activity.get("arr_time") is not None
                    else None,
                    "plannedDepartureAt": datetime.fromtimestamp(activity["end_time"], tz=timezone.utc).astimezone().isoformat()
                    if activity.get("end_time") is not None
                    else None,
                    "status": "pending",
                }
            )
            activity_index += 1

        routes.append(
            {
                "id": route_id,
                "tenantId": (route_order_ids and order_map.get(route_order_ids[0], {}).get("tenantId")) or shift.get("tenantId") or DEMO_TENANT_ID,
                "companyId": (route_order_ids and order_map.get(route_order_ids[0], {}).get("companyId")) or shift.get("companyId") or DEMO_TENANT_ID,
                "planId": plan_id,
                "shiftId": shift["id"],
                "driverId": shift["driverId"],
                "vehicleId": shift["vehicleId"],
                "status": "ready",
                "source": "graphhopper",
                "orderIds": route_order_ids,
                "pickupGroupIds": sorted(
                    {
                        str(order_map[order_id].get("pickupGroupId"))
                        for order_id in route_order_ids
                        if order_id in order_map and order_map[order_id].get("pickupGroupId")
                    }
                ),
                "totalDistanceMeters": int(route.get("distance", 0) or 0),
                "totalDurationSeconds": int(route.get("completion_time", 0) or 0),
                "stops": stops,
            }
        )

    return routes


def build_address(label: str, street1: str, city: str, postal_code: str, country_code: str, lat: float, lon: float) -> dict[str, Any]:
    return {
        "label": label,
        "street1": street1,
        "city": city,
        "postalCode": postal_code,
        "countryCode": country_code,
        "coordinates": {
            "lat": lat,
            "lon": lon,
        },
    }


def build_demo_db(replace: bool = True) -> dict[str, Any]:
    base = empty_db() if replace else read_db()
    if not replace and any(hub.get("id") == "hub_paris_central" for hub in base["hubs"]):
        return base

    timestamp = now_iso()
    base["pricingConfig"] = deepcopy(base.get("pricingConfig") or default_pricing_config())
    base["hubs"] = [
        {
            "id": "hub_paris_central",
            "label": "Paris Central Hub",
            "city": "Paris",
            "address": "12 Rue du Depot, 75011 Paris",
            "coordinates": {"lat": 48.8619, "lon": 2.3765},
            "createdAt": timestamp,
            "updatedAt": timestamp,
        }
    ]
    base["vehicleTypes"] = [
        {
            "id": "vehicletype_van",
            "label": "Van",
            "vehicleClass": "van",
            "routingProfile": "car",
            "capacity": {"parcels": 120, "weightKg": 600, "volumeDm3": 6000},
            "createdAt": timestamp,
            "updatedAt": timestamp,
        },
        {
            "id": "vehicletype_bike",
            "label": "Cargo Bike",
            "vehicleClass": "bike",
            "routingProfile": "bike",
            "capacity": {"parcels": 25, "weightKg": 80, "volumeDm3": 900},
            "createdAt": timestamp,
            "updatedAt": timestamp,
        },
    ]
    base["vehicles"] = [
        {
            "id": "vehicle_van_1",
            "label": "Van 1",
            "hubId": "hub_paris_central",
            "vehicleTypeId": "vehicletype_van",
            "createdAt": timestamp,
            "updatedAt": timestamp,
        },
        {
            "id": "vehicle_bike_1",
            "label": "Bike 1",
            "hubId": "hub_paris_central",
            "vehicleTypeId": "vehicletype_bike",
            "createdAt": timestamp,
            "updatedAt": timestamp,
        },
    ]
    base["carrierCompanies"] = [
        {
            "id": "carrier_naaval_partners",
            "name": "Naaval Partners",
            "legalName": "Naaval Partners SAS",
            "email": "ops@naavalpartners.com",
            "phone": "+33100000000",
            "createdAt": timestamp,
            "updatedAt": timestamp,
        }
    ]
    base["drivers"] = [
        {
            "id": "driver_amina",
            "name": "Amina Laurent",
            "firstName": "Amina",
            "lastName": "Laurent",
            "email": "amina@naavalpartners.com",
            "phone": "+33600000001",
            "skills": ["fragile"],
            "vehicleType": "van_3m3",
            "carrierCompanyId": "carrier_naaval_partners",
            "vehiclePhotoUrls": [],
            "status": "active",
            "createdAt": timestamp,
            "updatedAt": timestamp,
        },
        {
            "id": "driver_noah",
            "name": "Noah Bernard",
            "firstName": "Noah",
            "lastName": "Bernard",
            "email": "noah@naavalpartners.com",
            "phone": "+33600000002",
            "skills": ["cold_chain", "bike"],
            "vehicleType": "bike",
            "carrierCompanyId": "carrier_naaval_partners",
            "vehiclePhotoUrls": [],
            "status": "active",
            "createdAt": timestamp,
            "updatedAt": timestamp,
        },
    ]
    base["opsUsers"] = [
        {
            "id": "ops_user_pierre",
            "firstName": "Pierre",
            "lastName": "Ops",
            "email": "pierre@naaval.app",
            "role": "ops_admin",
            "team": "Operations",
            "status": "active",
            "createdAt": timestamp,
            "updatedAt": timestamp,
        }
    ]
    base["customers"] = [
        {
            "id": "customer_naaval_retail",
            "companyName": "Naaval Retail",
            "headquartersAddress": "18 Rue du Commerce, 75015 Paris",
            "vatNumber": "FR12345678901",
            "companyPhone": "+33199999999",
            "companyEmail": "finance@naavalretail.com",
            "contactFirstName": "Claire",
            "contactLastName": "Martin",
            "contactPhone": "+33699999999",
            "contactEmail": "claire@naavalretail.com",
            "revenueRange": "2m-10m",
            "companySize": "mid_market",
            "createdAt": timestamp,
            "updatedAt": timestamp,
        }
    ]
    base["quotes"] = []
    base["recurringRoutes"] = []
    base["shifts"] = [
        {
            "id": "shift_amina_am",
            "driverId": "driver_amina",
            "vehicleId": "vehicle_van_1",
            "vehicleTypeId": "vehicletype_van",
            "startAt": today_at(8, 0),
            "endAt": today_at(16, 0),
            "startCoordinates": {"lat": 48.8619, "lon": 2.3765},
            "endCoordinates": {"lat": 48.8619, "lon": 2.3765},
            "skills": ["fragile"],
            "status": "planned",
            "createdAt": timestamp,
            "updatedAt": timestamp,
        },
        {
            "id": "shift_noah_am",
            "driverId": "driver_noah",
            "vehicleId": "vehicle_bike_1",
            "vehicleTypeId": "vehicletype_bike",
            "startAt": today_at(8, 30),
            "endAt": today_at(15, 30),
            "startCoordinates": {"lat": 48.8619, "lon": 2.3765},
            "endCoordinates": {"lat": 48.8619, "lon": 2.3765},
            "skills": ["cold_chain", "bike"],
            "status": "planned",
            "createdAt": timestamp,
            "updatedAt": timestamp,
        },
    ]

    demo_orders = [
        {
            "id": "order_demo_1",
            "merchantId": "merchant_demo",
            "hubId": "hub_paris_central",
            "kind": "delivery",
            "reference": "NAAV-001",
            "pickupAddress": build_address("Paris Central Hub", "12 Rue du Depot", "Paris", "75011", "FR", 48.8619, 2.3765),
            "dropoffAddress": build_address("Avenue Louise 231, 1050 Ixelles", "Avenue Louise 231", "Ixelles", "1050", "BE", 50.8247, 4.3654),
            "serviceDurationSeconds": 240,
            "parcelCount": 3,
            "weightKg": 12,
            "volumeDm3": 60,
            "requiredSkills": [],
            "timeWindows": [{"start": today_at(8, 45), "end": today_at(10, 0)}],
            "priority": 1,
            "notes": "Left with concierge after signature",
            "status": "completed",
            "createdAt": timestamp,
            "updatedAt": timestamp,
        },
        {
            "id": "order_demo_2",
            "merchantId": "merchant_demo",
            "hubId": "hub_paris_central",
            "kind": "delivery",
            "reference": "NAAV-002",
            "pickupAddress": build_address("Rue du Bailli 19, 1050 Ixelles", "Rue du Bailli 19", "Ixelles", "1050", "BE", 50.8241, 4.3577),
            "dropoffAddress": build_address("Rue Defacqz 34, 1060 Saint-Gilles", "Rue Defacqz 34", "Saint-Gilles", "1060", "BE", 50.8261, 4.3525),
            "serviceDurationSeconds": 300,
            "parcelCount": 2,
            "weightKg": 8,
            "volumeDm3": 35,
            "requiredSkills": [],
            "timeWindows": [{"start": today_at(9, 30), "end": today_at(11, 0)}],
            "priority": 2,
            "notes": "Courier is 4 minutes ahead of ETA",
            "status": "in_progress",
            "createdAt": timestamp,
            "updatedAt": timestamp,
        },
        {
            "id": "order_demo_3",
            "merchantId": "merchant_demo",
            "hubId": "hub_paris_central",
            "kind": "delivery",
            "reference": "NAAV-003",
            "pickupAddress": build_address("Paris Central Hub", "12 Rue du Depot", "Paris", "75011", "FR", 48.8619, 2.3765),
            "dropoffAddress": build_address("Chaussee d'Alsemberg 81, 1190 Forest", "Chaussee d'Alsemberg 81", "Forest", "1190", "BE", 50.8178, 4.3345),
            "serviceDurationSeconds": 300,
            "parcelCount": 1,
            "weightKg": 5,
            "volumeDm3": 18,
            "requiredSkills": [],
            "timeWindows": [{"start": today_at(9, 50), "end": today_at(11, 15)}],
            "priority": 3,
            "notes": "High-priority customer reroute requested",
            "status": "ready",
            "createdAt": timestamp,
            "updatedAt": timestamp,
        },
        {
            "id": "order_demo_4",
            "merchantId": "merchant_demo",
            "hubId": "hub_paris_central",
            "kind": "delivery",
            "reference": "NAAV-004",
            "pickupAddress": build_address("Rue de Namur 45, 1000 Bruxelles", "Rue de Namur 45", "Bruxelles", "1000", "BE", 50.8388, 4.3602),
            "dropoffAddress": build_address("Boulevard de Waterloo 12, 1000 Bruxelles", "Boulevard de Waterloo 12", "Bruxelles", "1000", "BE", 50.8381, 4.3558),
            "serviceDurationSeconds": 240,
            "parcelCount": 4,
            "weightKg": 18,
            "volumeDm3": 90,
            "requiredSkills": ["fragile"],
            "timeWindows": [{"start": today_at(11, 15), "end": today_at(13, 0)}],
            "priority": 1,
            "notes": "Fragile skincare products",
            "status": "planned",
            "createdAt": timestamp,
            "updatedAt": timestamp,
        },
        {
            "id": "order_demo_5",
            "merchantId": "merchant_demo",
            "hubId": "hub_paris_central",
            "kind": "delivery",
            "reference": "NAAV-005",
            "pickupAddress": build_address("Rue du Trone 64, 1050 Ixelles", "Rue du Trone 64", "Ixelles", "1050", "BE", 50.8384, 4.3724),
            "dropoffAddress": build_address("Place Flagey 7, 1050 Ixelles", "Place Flagey 7", "Ixelles", "1050", "BE", 50.8275, 4.3722),
            "serviceDurationSeconds": 180,
            "parcelCount": 2,
            "weightKg": 7,
            "volumeDm3": 28,
            "requiredSkills": ["cold_chain"],
            "timeWindows": [{"start": today_at(12, 20), "end": today_at(14, 0)}],
            "priority": 2,
            "notes": "Cargo bike eligible",
            "status": "planned",
            "createdAt": timestamp,
            "updatedAt": timestamp,
        },
        {
            "id": "order_demo_6",
            "merchantId": "merchant_demo",
            "hubId": "hub_paris_central",
            "kind": "pickup_delivery",
            "reference": "NAAV-006",
            "pickupAddress": build_address("Rue Oberkampf 9, Paris 11", "Rue Oberkampf 9", "Paris", "75011", "FR", 48.8654, 2.3781),
            "dropoffAddress": build_address("Rue des Dames 12, Paris 17", "Rue des Dames 12", "Paris", "75017", "FR", 48.8830, 2.3232),
            "serviceDurationSeconds": 300,
            "parcelCount": 1,
            "weightKg": 5,
            "volumeDm3": 18,
            "requiredSkills": [],
            "timeWindows": [{"start": today_at(14, 0), "end": today_at(16, 30)}],
            "priority": 2,
            "notes": "Pickup then direct drop",
            "status": "ready",
            "createdAt": timestamp,
            "updatedAt": timestamp,
        },
    ]
    base["orders"] = demo_orders
    base["planningJobs"] = []
    base["routes"] = [
        {
            "id": "route_demo_1",
            "planId": "plan_demo_a",
            "shiftId": "shift_amina_am",
            "driverId": "driver_amina",
            "vehicleId": "vehicle_van_1",
            "status": "completed",
            "totalDistanceMeters": 16400,
            "totalDurationSeconds": 2800,
            "stops": [
                {
                    "id": "route_demo_1_stop_1",
                    "orderId": "order_demo_1",
                    "sequence": 1,
                    "kind": "delivery",
                    "address": demo_orders[0]["dropoffAddress"],
                    "plannedArrivalAt": today_at(8, 45),
                    "plannedDepartureAt": today_at(9, 5),
                    "status": "served",
                }
            ],
        },
        {
            "id": "route_demo_2",
            "planId": "plan_demo_b",
            "shiftId": "shift_amina_am",
            "driverId": "driver_amina",
            "vehicleId": "vehicle_van_1",
            "status": "in_progress",
            "totalDistanceMeters": 11200,
            "totalDurationSeconds": 2100,
            "stops": [
                {
                    "id": "route_demo_2_stop_1",
                    "orderId": "order_demo_2",
                    "sequence": 1,
                    "kind": "delivery",
                    "address": demo_orders[1]["dropoffAddress"],
                    "plannedArrivalAt": today_at(9, 30),
                    "plannedDepartureAt": today_at(9, 55),
                    "status": "arrived",
                }
            ],
        },
    ]
    base["heartbeats"] = []
    base["proofs"] = []
    base["inboxMessages"] = [
        {
            "id": "msg_demo_driver_1",
            "audience": "drivers",
            "threadId": "driver_amina",
            "author": "Naaval Ops",
            "body": "Route demo_2 is active. Keep the proof flow updated at each stop.",
            "senderType": "ops",
            "senderId": "ops_user_pierre",
            "createdAt": timestamp,
            "time": "09h15",
        },
        {
            "id": "msg_demo_driver_2",
            "audience": "drivers",
            "threadId": "driver_amina",
            "author": "Amina Laurent",
            "body": "Understood. I am on my way to the next stop.",
            "senderType": "driver",
            "senderId": "driver_amina",
            "createdAt": timestamp,
            "time": "09h18",
        },
        {
            "id": "msg_demo_customer_1",
            "audience": "customers",
            "threadId": "customer_naaval_retail",
            "author": "Claire Martin",
            "body": "Can you confirm the ETA for the current mission?",
            "senderType": "customer",
            "senderId": "customer_naaval_retail",
            "createdAt": timestamp,
            "time": "09h10",
        },
    ]
    base["events"] = []
    append_event(base, "demo.seeded", "system", "demo", {"replace": replace})
    return base


def parse_json_body(handler: BaseHTTPRequestHandler) -> dict[str, Any]:
    length = int(handler.headers.get("Content-Length", "0"))
    if length == 0:
        return {}
    raw = handler.rfile.read(length).decode("utf-8")
    if not raw.strip():
        return {}
    return json.loads(raw)


def send_json(handler: BaseHTTPRequestHandler, status: int, payload: dict[str, Any]) -> None:
    raw = json.dumps(payload, indent=2).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(raw)))
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
    handler.end_headers()
    handler.wfile.write(raw)


def send_no_content(handler: BaseHTTPRequestHandler, status: int = HTTPStatus.NO_CONTENT) -> None:
    handler.send_response(status)
    handler.send_header("Access-Control-Allow-Origin", "*")
    handler.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
    handler.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
    handler.end_headers()


def json_error(handler: BaseHTTPRequestHandler, status: int, code: str, message: str) -> None:
    send_json(handler, status, {"error": {"code": code, "message": message}})


def query_params(handler: BaseHTTPRequestHandler) -> dict[str, str]:
    parsed = urlparse(handler.path)
    pairs = parse_qs(parsed.query)
    return {key: values[-1] for key, values in pairs.items()}


def request_path(handler: BaseHTTPRequestHandler) -> str:
    return urlparse(handler.path).path


def filter_collection(items: list[dict[str, Any]], filters: dict[str, str], allowed_keys: list[str]) -> list[dict[str, Any]]:
    filtered = items
    for key in allowed_keys:
        value = filters.get(key)
        if value:
            filtered = [item for item in filtered if str(item.get(key)) == value]
    return filtered


def build_session_payload(session: dict[str, Any], actor: dict[str, Any], tenant: dict[str, Any] | None) -> dict[str, Any]:
    first_name = actor.get("firstName") or actor.get("contactFirstName") or ""
    last_name = actor.get("lastName") or actor.get("contactLastName") or ""
    return {
        "token": session["token"],
        "actorType": session["actorType"],
        "userId": session.get("userId"),
        "customerId": session.get("customerId"),
        "driverId": session.get("driverId"),
        "tenantId": session.get("tenantId"),
        "companyId": session.get("companyId"),
        "role": session.get("role"),
        "email": actor.get("email") or actor.get("contactEmail") or actor.get("companyEmail"),
        "firstName": first_name,
        "lastName": last_name,
        "name": " ".join(part for part in [first_name, last_name] if part).strip() or actor.get("companyName") or actor.get("name") or "Naaval User",
        "source": session.get("source", "password"),
        "tenant": deepcopy(tenant) if tenant else None,
        "tenantContext": resolve_tenant_context(tenant),
    }


def get_authorization_token(handler: BaseHTTPRequestHandler) -> str | None:
    authorization = handler.headers.get("Authorization", "").strip()
    if authorization.lower().startswith("bearer "):
        return authorization.split(" ", 1)[1].strip() or None
    direct = handler.headers.get("X-Naaval-Session", "").strip()
    return direct or None


def resolve_auth_session(db: dict[str, Any], handler: BaseHTTPRequestHandler) -> dict[str, Any] | None:
    token = get_authorization_token(handler)
    if not token:
        return None

    session = next((item for item in db.get("authSessions", []) if item.get("token") == token), None)
    if not session:
        return None

    actor_type = session.get("actorType")
    actor = None
    if actor_type == "ops_user":
        actor = next((item for item in db["opsUsers"] if item.get("id") == session.get("userId")), None)
    elif actor_type == "customer":
        actor = next((item for item in db["customers"] if item.get("id") == session.get("customerId")), None)
    elif actor_type == "driver":
        actor = next((item for item in db["drivers"] if item.get("id") == session.get("driverId")), None)

    if not actor:
        return None

    tenant = next((item for item in db["tenants"] if item.get("id") == session.get("tenantId")), None)
    return {
        "session": session,
        "actorType": actor_type,
        "actor": actor,
        "tenant": tenant,
        "tenantId": session.get("tenantId"),
        "companyId": session.get("companyId"),
        "role": session.get("role"),
    }


def require_auth(handler: BaseHTTPRequestHandler, db: dict[str, Any], allowed_actor_types: tuple[str, ...] = ("ops_user", "customer", "driver")) -> dict[str, Any] | None:
    auth = resolve_auth_session(db, handler)
    if not auth:
        json_error(handler, HTTPStatus.UNAUTHORIZED, "unauthorized", "Authentication is required")
        return None
    if allowed_actor_types and auth.get("actorType") not in allowed_actor_types:
        json_error(handler, HTTPStatus.FORBIDDEN, "forbidden", "This account cannot access this resource")
        return None
    return auth


def is_platform_admin_auth(auth: dict[str, Any] | None) -> bool:
    return bool(auth and auth.get("actorType") == "ops_user" and is_platform_role(auth.get("role")))


def scoped_items(items: list[dict[str, Any]], auth: dict[str, Any] | None, collection_name: str) -> list[dict[str, Any]]:
    if not auth or is_platform_admin_auth(auth):
        return items

    tenant_id = str(auth.get("tenantId") or "")
    scoped = [item for item in items if str(item.get("tenantId") or item.get("companyId") or "") == tenant_id]

    if auth.get("actorType") == "customer":
        customer_id = str(auth["actor"].get("id"))
        if collection_name == "customers":
            return [item for item in scoped if str(item.get("id")) == customer_id]
        if collection_name == "quotes":
            return [item for item in scoped if str(item.get("customerId")) == customer_id]
        if collection_name == "orders":
            return [item for item in scoped if str(item.get("customerId") or "") == customer_id]
        if collection_name == "recurringRoutes":
            return [item for item in scoped if str(item.get("customerId") or "") == customer_id]
        return scoped

    if auth.get("actorType") == "driver":
        driver_id = str(auth["actor"].get("id"))
        if collection_name == "drivers":
            return [item for item in scoped if str(item.get("id")) == driver_id]
        if collection_name == "shifts":
            return [item for item in scoped if str(item.get("driverId")) == driver_id]
        if collection_name == "routes":
            return [item for item in scoped if str(item.get("driverId")) == driver_id]
        return scoped

    return scoped


def scoped_pricing_config(db: dict[str, Any], auth: dict[str, Any] | None) -> dict[str, Any]:
    if not auth:
        return deepcopy(db.get("pricingConfig") or default_pricing_config())
    tenant_id = str(auth.get("tenantId") or DEMO_TENANT_ID)
    config = db.get("tenantPricingConfigs", {}).get(tenant_id)
    return deepcopy(config or db.get("pricingConfig") or default_pricing_config())


def create_auth_session(
    db: dict[str, Any],
    *,
    actor_type: str,
    actor: dict[str, Any],
    tenant_id: str,
    role: str,
    source: str = "password",
) -> dict[str, Any]:
    session = {
        "id": create_id("session"),
        "token": uuid.uuid4().hex,
        "actorType": actor_type,
        "userId": actor.get("id") if actor_type == "ops_user" else None,
        "customerId": actor.get("id") if actor_type == "customer" else None,
        "driverId": actor.get("id") if actor_type == "driver" else None,
        "tenantId": tenant_id,
        "companyId": tenant_id,
        "role": role,
        "source": source,
        "createdAt": now_iso(),
        "updatedAt": now_iso(),
    }
    db["authSessions"] = [item for item in db.get("authSessions", []) if item.get("token") != session["token"]]
    db["authSessions"].insert(0, session)
    return session


def find_tenant(db: dict[str, Any], tenant_id: str | None) -> dict[str, Any] | None:
    if not tenant_id:
        return None
    return next((item for item in db.get("tenants", []) if item.get("id") == tenant_id), None)


def ensure_platform_admin_access(handler: BaseHTTPRequestHandler, auth: dict[str, Any] | None) -> bool:
    if not is_platform_admin_auth(auth):
        json_error(handler, HTTPStatus.FORBIDDEN, "forbidden", "Naaval admin access is required")
        return False
    return True


def entity_belongs_to_auth(entity: dict[str, Any], auth: dict[str, Any] | None) -> bool:
    if not auth or is_platform_admin_auth(auth):
        return True
    return str(entity.get("tenantId") or entity.get("companyId") or "") == str(auth.get("tenantId") or "")


def resolve_target_tenant_id(auth: dict[str, Any], body: dict[str, Any], default_for_platform: str | None = None) -> str:
    requested = str(body.get("tenantId") or body.get("companyId") or "").strip()
    if is_platform_admin_auth(auth):
        if requested:
            return requested
        return default_for_platform or str(auth.get("tenantId") or PLATFORM_TENANT_ID)
    return str(auth.get("tenantId") or DEMO_TENANT_ID)


def require_company_admin_access(handler: BaseHTTPRequestHandler, auth: dict[str, Any] | None) -> bool:
    if not auth or auth.get("actorType") != "ops_user":
        json_error(handler, HTTPStatus.FORBIDDEN, "forbidden", "Ops access is required")
        return False
    if is_platform_admin_auth(auth):
        return True
    if str(auth.get("role") or "") != "company_admin":
        json_error(handler, HTTPStatus.FORBIDDEN, "forbidden", "Company admin access is required")
        return False
    return True


def allowed_role_values_for_creator(auth: dict[str, Any]) -> set[str]:
    if is_platform_admin_auth(auth):
        return {"super_admin", "naaval_admin", "company_admin", "company_user"}
    return {"company_admin", "company_user"}


def sanitize_ops_user_role(handler: BaseHTTPRequestHandler, auth: dict[str, Any], role: str) -> str | None:
    normalized = str(role or "company_user").strip() or "company_user"
    allowed = allowed_role_values_for_creator(auth)
    if normalized not in allowed:
        json_error(handler, HTTPStatus.FORBIDDEN, "forbidden", "You cannot assign this role")
        return None
    return normalized


def serialize_tenant_record(db: dict[str, Any], tenant: dict[str, Any]) -> dict[str, Any]:
    tenant_id = tenant["id"]
    tenant_context = resolve_tenant_context(tenant)
    return {
        **deepcopy(tenant),
        "tenantContext": tenant_context,
        "opsUsersCount": len([item for item in db["opsUsers"] if str(item.get("tenantId")) == tenant_id]),
        "driversCount": len([item for item in db["drivers"] if str(item.get("tenantId")) == tenant_id]),
        "ordersCount": len([item for item in db["orders"] if str(item.get("tenantId")) == tenant_id]),
        "routesCount": len([item for item in db["routes"] if str(item.get("tenantId")) == tenant_id]),
    }


def normalize_order_input(body: dict[str, Any]) -> dict[str, Any]:
    if not body.get("merchantId"):
        raise ValueError("merchantId is required")
    if not body.get("reference"):
        raise ValueError("reference is required")
    dropoff = deepcopy(body.get("dropoffAddress") or {})
    if not dropoff.get("label") or not dropoff.get("street1"):
        raise ValueError("dropoffAddress with label and street1 is required")
    pickup_address = deepcopy(body.get("pickupAddress"))

    if pickup_address:
        pickup_address = graphhopper_geocode(pickup_address)
    dropoff = graphhopper_geocode(dropoff)

    timestamp = now_iso()
    return {
        "id": body.get("id") or create_id("ord"),
        "tenantId": body.get("tenantId") or body.get("companyId") or DEMO_TENANT_ID,
        "companyId": body.get("companyId") or body.get("tenantId") or DEMO_TENANT_ID,
        "merchantId": body["merchantId"],
        "customerId": body.get("customerId"),
        "hubId": body.get("hubId"),
        "kind": body.get("kind", "delivery"),
        "reference": body["reference"],
        "pickupAddress": pickup_address,
        "dropoffAddress": dropoff,
        "parcelSize": body.get("parcelSize") or dropoff.get("parcelSize") or (pickup_address or {}).get("parcelSize") or "M",
        "serviceDurationSeconds": int(body.get("serviceDurationSeconds", 300)),
        "pickupServiceDurationSeconds": int(body.get("pickupServiceDurationSeconds", body.get("serviceDurationSeconds", 300))),
        "parcelCount": int(body.get("parcelCount", 1)),
        "weightKg": float(body.get("weightKg", 0)),
        "volumeDm3": float(body.get("volumeDm3", 0)),
        "requiredSkills": list(body.get("requiredSkills", [])),
        "timeWindows": list(body.get("timeWindows", [])),
        "priority": int(body.get("priority", 0)),
        "pickupGroupId": body.get("pickupGroupId"),
        "sourceBatchId": body.get("sourceBatchId"),
        "notes": body.get("notes", ""),
        "source": body.get("source", "ops"),
        "sourceLabel": body.get("sourceLabel", "Ops"),
        "status": body.get("status", "ready"),
        "statusMessage": body.get("statusMessage"),
        "statusReasonCode": body.get("statusReasonCode"),
        "statusReasonLabel": body.get("statusReasonLabel"),
        "statusReason": body.get("statusReason"),
        "lastProofId": body.get("lastProofId"),
        "lastProofOutcomeCode": body.get("lastProofOutcomeCode"),
        "lastProofOutcomeLabel": body.get("lastProofOutcomeLabel"),
        "lastProofPhotoUrls": list(body.get("lastProofPhotoUrls", [])),
        "lastProofNote": body.get("lastProofNote"),
        "lastProofDeliveredAt": body.get("lastProofDeliveredAt"),
        "lastKnownPosition": deepcopy(body.get("lastKnownPosition")),
        "lastKnownPositionAt": body.get("lastKnownPositionAt"),
        "lastKnownPositionLabel": body.get("lastKnownPositionLabel"),
        "createdAt": timestamp,
        "updatedAt": timestamp,
    }


def create_company_tenant(
    db: dict[str, Any],
    *,
    company_name: str,
    plan_id: str = DEFAULT_SIGNUP_PLAN_ID,
    status: str = "active",
) -> dict[str, Any]:
    timestamp = now_iso()
    base_slug = slugify(company_name, "company")
    candidate_slug = base_slug
    suffix = 2
    existing_slugs = {str(item.get("slug") or "") for item in db.get("tenants", [])}
    while candidate_slug in existing_slugs:
        candidate_slug = f"{base_slug}-{suffix}"
        suffix += 1

    tenant = {
        "id": create_id("tenant"),
        "companyId": None,
        "slug": candidate_slug,
        "companyName": company_name,
        "status": status,
        "planId": plan_id,
        "enabledModules": [],
        "disabledModules": [],
        "enabledAlgorithms": [],
        "disabledAlgorithms": [],
        "usageOverrides": {},
        "moduleOverrides": {},
        "algorithmOverrides": {},
        "createdAt": timestamp,
        "updatedAt": timestamp,
    }
    tenant["companyId"] = tenant["id"]
    db["tenants"].insert(0, tenant)
    db["tenantPricingConfigs"][tenant["id"]] = deepcopy(db.get("pricingConfig") or default_pricing_config())
    append_event(db, "tenant.created", "tenant", tenant["id"], {"companyName": company_name, "planId": plan_id})
    return tenant


def create_default_company_hub(db: dict[str, Any], tenant: dict[str, Any]) -> dict[str, Any]:
    timestamp = now_iso()
    hub = {
        "id": create_id("hub"),
        "tenantId": tenant["id"],
        "companyId": tenant["id"],
        "label": f"{tenant['companyName']} Main Hub",
        "city": "",
        "address": "",
        "coordinates": {"lat": 48.8566, "lon": 2.3522},
        "createdAt": timestamp,
        "updatedAt": timestamp,
    }
    db["hubs"].insert(0, hub)
    append_event(db, "hub.created", "hub", hub["id"], {"tenantId": tenant["id"]})
    return hub


VRP_PICKUP_TRUE_VALUES = {"yes", "y", "true", "1", "pickup"}
VRP_PICKUP_FALSE_VALUES = {"", "no", "n", "false", "0", "drop", "delivery"}


def normalize_vrp_pickup_flag(value: Any) -> str | None:
    normalized = str(value or "").strip().lower()
    if normalized in VRP_PICKUP_TRUE_VALUES:
        return "yes"
    if normalized in VRP_PICKUP_FALSE_VALUES:
        return "no"
    return None


def parse_vrp_boolean(value: Any) -> bool:
    return str(value or "").strip().lower() in {"yes", "y", "true", "1"}


def combine_vrp_date_time(plan_date: str, value: Any) -> str | None:
    raw = str(value or "").strip()
    if not raw:
        return None

    normalized = raw.replace("Z", "+00:00")
    try:
        parsed = datetime.fromisoformat(normalized)
        if parsed.tzinfo is None:
            parsed = parsed.replace(tzinfo=datetime.now().astimezone().tzinfo)
        return parsed.astimezone().isoformat()
    except ValueError:
        pass

    simple_time = normalized.replace("h", ":")
    if re.fullmatch(r"\d{1,2}:\d{2}", simple_time):
        hours, minutes = [int(part) for part in simple_time.split(":", 1)]
        day = datetime.fromisoformat(plan_date)
        return day.replace(hour=hours, minute=minutes, second=0, microsecond=0, tzinfo=datetime.now().astimezone().tzinfo).isoformat()

    return None


def build_optimizer_fallback_pickup_address(raw_address: str, label: str | None = None) -> dict[str, Any] | None:
    raw = str(raw_address or "").strip()
    if not raw:
        return None

    parts = [part.strip() for part in raw.split(",") if part.strip()]
    street1 = parts[0] if parts else raw
    city_segment = parts[1] if len(parts) > 1 else ""
    postal_match = re.search(r"\b\d{4,5}\b", city_segment)
    postal_code = postal_match.group(0) if postal_match else ""
    city = city_segment.replace(postal_code, "").strip() if city_segment else ""

    return {
        "label": label or street1,
        "street1": street1,
        "city": city or "Paris",
        "postalCode": postal_code or "75011",
        "countryCode": "FR",
    }


def build_vrp_address_from_row(row: dict[str, Any], fallback_country_code: str = "FR") -> dict[str, Any] | None:
    address_text = str(row.get("address", "")).strip()
    if not address_text:
        return None

    label_parts = [
        str(row.get("company", "")).strip(),
        " ".join(
            [
                str(row.get("firstName", "")).strip(),
                str(row.get("lastName", "")).strip(),
            ]
        ).strip(),
    ]
    label = next((part for part in label_parts if part), address_text)
    city = str(row.get("city", "")).strip()
    postal_code = str(row.get("postalCode", "")).strip()
    country_code = str(row.get("countryCode", "")).strip().upper() or fallback_country_code
    phone = str(row.get("phone", "")).strip()
    email = str(row.get("email", "")).strip()
    package_size = str(row.get("packageSize", "")).strip() or "M"
    comment = str(row.get("comment", "")).strip()
    lat_raw = str(row.get("lat", "")).strip()
    lon_raw = str(row.get("lon", "")).strip()

    coordinates = None
    try:
        if lat_raw and lon_raw:
            coordinates = {
                "lat": float(lat_raw),
                "lon": float(lon_raw),
            }
    except ValueError:
        coordinates = None

    return {
        "label": label,
        "street1": address_text,
        "city": city,
        "postalCode": postal_code,
        "countryCode": country_code,
        "contactName": " ".join(
            [str(row.get("firstName", "")).strip(), str(row.get("lastName", "")).strip()]
        ).strip(),
        "phone": phone,
        "email": email,
        "parcelSize": package_size,
        "comment": comment,
        "coordinates": coordinates,
    }


def merge_vrp_order_with_existing_order(existing_order: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    merged = deepcopy(existing_order)
    merged.update(payload)
    normalized = normalize_order_input(merged)
    normalized["id"] = existing_order["id"]
    normalized["createdAt"] = existing_order.get("createdAt", normalized.get("createdAt"))
    normalized["source"] = existing_order.get("source", normalized.get("source"))
    normalized["sourceLabel"] = existing_order.get("sourceLabel", normalized.get("sourceLabel"))
    normalized["lastProofId"] = existing_order.get("lastProofId")
    normalized["lastProofOutcomeCode"] = existing_order.get("lastProofOutcomeCode")
    normalized["lastProofOutcomeLabel"] = existing_order.get("lastProofOutcomeLabel")
    normalized["lastProofPhotoUrls"] = existing_order.get("lastProofPhotoUrls", [])
    normalized["lastProofNote"] = existing_order.get("lastProofNote")
    normalized["lastProofDeliveredAt"] = existing_order.get("lastProofDeliveredAt")
    normalized["lastKnownPosition"] = existing_order.get("lastKnownPosition")
    normalized["lastKnownPositionAt"] = existing_order.get("lastKnownPositionAt")
    normalized["lastKnownPositionLabel"] = existing_order.get("lastKnownPositionLabel")
    return normalized


def build_orders_from_vrp_draft_rows(
    db: dict[str, Any],
    rows: list[dict[str, Any]],
    plan_date: str,
    hub_id: str,
    optimizer_setup: dict[str, Any] | None,
    source_label: str,
) -> tuple[list[dict[str, Any]], list[str]]:
    errors: list[str] = []
    built_orders: list[dict[str, Any]] = []
    group_counter = 0
    optimizer_setup = optimizer_setup or {}
    fallback_pickup = build_optimizer_fallback_pickup_address(
        optimizer_setup.get("pickupAddress"),
        optimizer_setup.get("customer") or "Default pickup",
    )
    current_pickup = deepcopy(fallback_pickup)
    current_group_id = None
    default_handling_minutes = max(1, int(optimizer_setup.get("handlingMinutes", 10) or 10))
    default_pickup_landing_minutes = max(1, int(optimizer_setup.get("pickupLandingMinutes", 15) or 15))
    default_size = str(optimizer_setup.get("parcelSize") or "M").strip() or "M"
    source_batch_id = create_id("vrp_batch")

    for index, candidate in enumerate(rows):
        row_number = int(candidate.get("rowNumber") or index + 2)
        normalized_flag = normalize_vrp_pickup_flag(candidate.get("pickup"))
        if normalized_flag is None:
            errors.append(f"Line {row_number}: pickup must be yes or no")
            continue

        row = {
            "pickup": normalized_flag,
            "address": str(candidate.get("address", "")).strip(),
            "company": str(candidate.get("company", "")).strip(),
            "firstName": str(candidate.get("firstName", "")).strip(),
            "lastName": str(candidate.get("lastName", "")).strip(),
            "phone": str(candidate.get("phone", "")).strip(),
            "email": str(candidate.get("email", "")).strip(),
            "comment": str(candidate.get("comment", "")).strip(),
            "packageSize": str(candidate.get("packageSize", "")).strip() or default_size,
            "parcelCount": str(candidate.get("parcelCount", "")).strip(),
            "weightKg": str(candidate.get("weightKg", "")).strip(),
            "volumeDm3": str(candidate.get("volumeDm3", "")).strip(),
            "timeWindowStart": str(candidate.get("timeWindowStart", "")).strip(),
            "timeWindowEnd": str(candidate.get("timeWindowEnd", "")).strip(),
            "coldChain": str(candidate.get("coldChain", "")).strip(),
            "fragile": str(candidate.get("fragile", "")).strip(),
            "returnFlag": str(candidate.get("returnFlag", "")).strip(),
            "referenceNumber": str(candidate.get("referenceNumber", "")).strip(),
            "postalCode": str(candidate.get("postalCode", "")).strip(),
            "city": str(candidate.get("city", "")).strip(),
            "countryCode": str(candidate.get("countryCode", "")).strip(),
            "lat": str(candidate.get("lat", "")).strip(),
            "lon": str(candidate.get("lon", "")).strip(),
            "linkedOrderId": str(candidate.get("linkedOrderId", "")).strip(),
        }

        if normalized_flag == "yes":
            pickup_address = build_vrp_address_from_row(row)
            if not pickup_address:
                errors.append(f"Line {row_number}: pickup address is required when pickup = yes")
                current_pickup = None
                current_group_id = None
                continue
            group_counter += 1
            current_group_id = str(candidate.get("pickupGroupId") or f"pickup_group_{group_counter}")
            current_pickup = pickup_address
            continue

        if not current_pickup:
            errors.append(f"Line {row_number}: a drop row requires a pickup row before it, or a default pickup in the setup")
            continue

        dropoff_address = build_vrp_address_from_row(row)
        if not dropoff_address:
            errors.append(f"Line {row_number}: drop address is required")
            continue

        existing_order = None
        if row["linkedOrderId"]:
            existing_order = next((item for item in db["orders"] if item["id"] == row["linkedOrderId"]), None)
            if not existing_order:
                errors.append(f"Line {row_number}: linked order {row['linkedOrderId']} was not found")
                continue

        merchant_label = row["company"] or str(optimizer_setup.get("customer") or "").strip() or (existing_order or {}).get("merchantId") or "merchant_demo"
        merchant_id = re.sub(r"[^a-z0-9]+", "_", merchant_label.strip().lower()).strip("_") or "merchant_demo"
        window_start = combine_vrp_date_time(plan_date, row["timeWindowStart"])
        window_end = combine_vrp_date_time(plan_date, row["timeWindowEnd"])
        time_windows = []
        if row["timeWindowStart"] or row["timeWindowEnd"]:
            if not window_start or not window_end:
                errors.append(f"Line {row_number}: invalid time window format")
                continue
            time_windows.append({"start": window_start, "end": window_end})

        required_skills = []
        if parse_vrp_boolean(row["coldChain"]):
            required_skills.append("cold_chain")

        payload = {
            "id": existing_order["id"] if existing_order else None,
            "merchantId": merchant_id,
            "customerId": (existing_order or {}).get("customerId"),
            "hubId": hub_id,
            "kind": "return" if parse_vrp_boolean(row["returnFlag"]) else "pickup_delivery",
            "reference": row["referenceNumber"] or f"VRP-{plan_date.replace('-', '')}-{len(built_orders) + 1:03d}",
            "pickupAddress": deepcopy(current_pickup),
            "dropoffAddress": dropoff_address,
            "parcelSize": row["packageSize"] or default_size,
            "serviceDurationSeconds": default_handling_minutes * 60,
            "pickupServiceDurationSeconds": default_pickup_landing_minutes * 60,
            "parcelCount": int(float(row["parcelCount"])) if row["parcelCount"] else 1,
            "weightKg": float(row["weightKg"]) if row["weightKg"] else 0,
            "volumeDm3": float(row["volumeDm3"]) if row["volumeDm3"] else 0,
            "requiredSkills": required_skills,
            "timeWindows": time_windows,
            "notes": row["comment"],
            "source": "ops" if existing_order else "vrp_csv",
            "sourceLabel": source_label,
            "status": (existing_order or {}).get("status", "ready"),
            "priority": 0,
            "pickupGroupId": current_group_id,
            "sourceBatchId": source_batch_id,
        }

        try:
            normalized_order = (
                merge_vrp_order_with_existing_order(existing_order, payload)
                if existing_order
                else normalize_order_input(payload)
            )
        except ValueError as error:
            errors.append(f"Line {row_number}: {error}")
            continue

        built_orders.append(normalized_order)

    return built_orders, errors


def override_shift_operating_window(shift: dict[str, Any], plan_date: str, start_time: str | None, end_time: str | None) -> dict[str, Any]:
    override = deepcopy(shift)
    local_timezone = datetime.now().astimezone().tzinfo

    if start_time and re.fullmatch(r"\d{2}:\d{2}", str(start_time)):
        hours, minutes = [int(part) for part in str(start_time).split(":", 1)]
        override["startAt"] = datetime.fromisoformat(plan_date).replace(
            hour=hours,
            minute=minutes,
            second=0,
            microsecond=0,
            tzinfo=local_timezone,
        ).isoformat()

    if end_time and re.fullmatch(r"\d{2}:\d{2}", str(end_time)):
        hours, minutes = [int(part) for part in str(end_time).split(":", 1)]
        override["endAt"] = datetime.fromisoformat(plan_date).replace(
            hour=hours,
            minute=minutes,
            second=0,
            microsecond=0,
            tzinfo=local_timezone,
        ).isoformat()

    return override


def normalize_recurring_route_input(body: dict[str, Any]) -> dict[str, Any]:
    if not body.get("label"):
        raise ValueError("label is required")
    if not body.get("pickupAddress"):
        raise ValueError("pickupAddress is required")
    if not body.get("dropoffAddresses"):
        raise ValueError("dropoffAddresses is required")
    if not body.get("recurringDays"):
        raise ValueError("recurringDays is required")

    timestamp = now_iso()
    return {
        "id": body.get("id") or create_id("rr"),
        "reference": body.get("reference") or body.get("label"),
        "label": body["label"],
        "source": body.get("source", "manual"),
        "recurringDays": list(body.get("recurringDays", [])),
        "frequency": body.get("frequency", "Weekdays"),
        "pickupTime": body.get("pickupTime", "08:00"),
        "windowLabel": body.get("windowLabel", "08h00 pickup"),
        "nextRunLabel": body.get("nextRunLabel", "Next run pending"),
        "hubId": body.get("hubId"),
        "hubLabel": body.get("hubLabel", ""),
        "merchantId": body.get("merchantId", "merchant_demo"),
        "kind": body.get("kind", "delivery"),
        "pricingAlgorithmId": body.get("pricingAlgorithmId", "basic"),
        "pickupAddress": body.get("pickupAddress"),
        "dropoffAddresses": list(body.get("dropoffAddresses", [])),
        "driverName": body.get("driverName", "Unassigned"),
        "vehicleLabel": body.get("vehicleLabel", "Pending assignment"),
        "stopCount": int(body.get("stopCount", len(body.get("dropoffAddresses", [])))),
        "customerCount": int(body.get("customerCount", len(body.get("dropoffAddresses", [])))),
        "status": body.get("status", "planned"),
        "tags": list(body.get("tags", [])),
        "note": body.get("note", ""),
        "orders": list(body.get("orders", [])),
        "createdAt": body.get("createdAt", timestamp),
        "updatedAt": timestamp,
    }


def find_driver(db: dict[str, Any], driver_id: str) -> dict[str, Any] | None:
    return next((driver for driver in db["drivers"] if driver["id"] == driver_id), None)


def find_first_shift_for_driver(db: dict[str, Any], driver_id: str) -> dict[str, Any] | None:
    shifts = [shift for shift in db["shifts"] if shift.get("driverId") == driver_id]
    shifts.sort(key=lambda shift: shift.get("startAt", ""))
    return shifts[0] if shifts else None


def assign_order_to_driver(db: dict[str, Any], order_id: str, driver_id: str) -> tuple[dict[str, Any], dict[str, Any]]:
    order = next((item for item in db["orders"] if item["id"] == order_id), None)
    if not order:
        raise LookupError("Order not found")

    driver = find_driver(db, driver_id)
    if not driver:
        raise LookupError("Driver not found")

    route = next((item for item in db["routes"] if any(order_id in stop_order_ids(stop) for stop in item.get("stops", []))), None)
    shift = find_first_shift_for_driver(db, driver_id)

    if route:
        route["driverId"] = driver_id
        route["shiftId"] = shift["id"] if shift else route.get("shiftId")
        route["vehicleId"] = shift["vehicleId"] if shift else route.get("vehicleId")
        route["updatedAt"] = now_iso()
    else:
        route_id = create_id("route")
        route_start = datetime.fromisoformat(shift["startAt"]).astimezone() if shift and shift.get("startAt") else datetime.now().astimezone()
        current_time = route_start
        sequence = 1
        stops: list[dict[str, Any]] = []

        if order.get("kind") in {"pickup_delivery", "return"} and order.get("pickupAddress"):
            pickup_arrival = current_time + timedelta(minutes=10)
            current_time = pickup_arrival + timedelta(seconds=int(order.get("serviceDurationSeconds", 300)))
            stops.append(create_route_stop(route_id, order, "pickup", sequence, pickup_arrival.isoformat(), current_time.isoformat()))
            sequence += 1

        delivery_arrival = current_time + timedelta(minutes=15)
        current_time = delivery_arrival + timedelta(seconds=int(order.get("serviceDurationSeconds", 300)))
        stops.append(create_route_stop(route_id, order, "delivery", sequence, delivery_arrival.isoformat(), current_time.isoformat()))

        route = {
            "id": route_id,
            "tenantId": order.get("tenantId") or driver.get("tenantId") or DEMO_TENANT_ID,
            "companyId": order.get("companyId") or driver.get("companyId") or DEMO_TENANT_ID,
            "planId": create_id("manual_plan"),
            "shiftId": shift["id"] if shift else None,
            "driverId": driver_id,
            "vehicleId": shift["vehicleId"] if shift else None,
            "status": "ready",
            "source": "manual_assignment",
            "totalDistanceMeters": len(stops) * 3800,
            "totalDurationSeconds": int((current_time - route_start).total_seconds()),
            "stops": stops,
            "createdAt": now_iso(),
            "updatedAt": now_iso(),
        }
        db["routes"].insert(0, route)

    if order.get("status") not in {"completed", "in_progress", "dispatched"}:
        order["status"] = "planned"
    order["updatedAt"] = now_iso()

    append_event(db, "order.driver_assigned", "order", order_id, {"driverId": driver_id, "routeId": route["id"]})
    return order, route


def create_route_stop(route_id: str, order: dict[str, Any], kind: str, sequence: int, arrival_at: str, departure_at: str) -> dict[str, Any]:
    address = order.get("pickupAddress") if kind == "pickup" else order.get("dropoffAddress")
    return {
        "id": f"{route_id}_stop_{sequence}",
        "orderId": order["id"],
        "orderIds": [order["id"]],
        "sequence": sequence,
        "kind": kind,
        "address": address,
        "plannedArrivalAt": arrival_at,
        "plannedDepartureAt": departure_at,
        "status": "pending",
    }


PROOF_OUTCOME_LABELS = {
    "pickup_handed_over_to_tsp": "Handed Over to TSP",
    "pickup_failed": "Failed Pickup",
    "pickup_refused_by_tsp": "Refused by TSP",
    "delivery_order_delivered": "Order Delivered",
    "delivery_failed": "Failed",
    "delivery_refused_by_customer": "Refused by Customer",
}

PROOF_REASON_LABELS = {
    "customer_absent": "Customer absent",
    "damaged": "Damaged goods",
    "access_issue": "Access issue",
    "site_closed": "Site closed",
    "wrong_address": "Wrong address",
    "tsp_absent": "TSP unavailable",
    "tsp_refusal": "TSP refused",
    "customer_refusal": "Customer refused",
    "quality_issue": "Quality issue",
    "other": "Other",
    "rejected": "Refused",
}

PICKUP_PROOF_OUTCOMES = {
    "pickup_handed_over_to_tsp",
    "pickup_failed",
    "pickup_refused_by_tsp",
}

DELIVERY_PROOF_OUTCOMES = {
    "delivery_order_delivered",
    "delivery_failed",
    "delivery_refused_by_customer",
}

SUCCESS_PROOF_OUTCOMES = {"pickup_handed_over_to_tsp", "delivery_order_delivered"}
REFUSED_PROOF_OUTCOMES = {"pickup_refused_by_tsp", "delivery_refused_by_customer"}
FAILED_PROOF_OUTCOMES = {"pickup_failed", "delivery_failed"}


def label_for_proof_outcome(code: str | None) -> str | None:
    if not code:
        return None
    return PROOF_OUTCOME_LABELS.get(code, code.replace("_", " ").title())


def label_for_reason_code(code: str | None) -> str | None:
    if not code:
        return None
    return PROOF_REASON_LABELS.get(code, code.replace("_", " ").title())


def is_success_proof_outcome(code: str | None) -> bool:
    return code in SUCCESS_PROOF_OUTCOMES


def is_refused_proof_outcome(code: str | None) -> bool:
    return code in REFUSED_PROOF_OUTCOMES


def infer_default_proof_outcome(kind: str | None, failure_reason_code: str | None) -> str:
    if kind == "pickup":
        return "pickup_handed_over_to_tsp" if not failure_reason_code else "pickup_failed"
    return "delivery_order_delivered" if not failure_reason_code else "delivery_failed"


def validate_proof_outcome(kind: str | None, proof_outcome_code: str | None) -> str:
    if not proof_outcome_code:
        raise ValueError("proofOutcomeCode is required")

    allowed = PICKUP_PROOF_OUTCOMES if kind == "pickup" else DELIVERY_PROOF_OUTCOMES
    if proof_outcome_code not in allowed:
        raise ValueError(f"proofOutcomeCode is invalid for a {kind or 'delivery'} stop")
    return proof_outcome_code


def apply_live_position_to_order(order: dict[str, Any], latitude: float | None, longitude: float | None, occurred_at: str | None, location_label: str | None = None) -> None:
    if latitude is None or longitude is None:
        return
    order["lastKnownPosition"] = {"lat": latitude, "lon": longitude}
    order["lastKnownPositionAt"] = occurred_at or now_iso()
    if location_label:
        order["lastKnownPositionLabel"] = location_label


def apply_live_position_to_route_orders(
    db: dict[str, Any],
    route: dict[str, Any] | None,
    latitude: float | None,
    longitude: float | None,
    occurred_at: str | None,
    location_label: str | None = None,
) -> None:
    if not route or latitude is None or longitude is None:
        return

    order_ids = {order_id for stop in route.get("stops", []) for order_id in stop_order_ids(stop)}
    for order in db["orders"]:
        if order["id"] in order_ids:
            apply_live_position_to_order(order, latitude, longitude, occurred_at, location_label)
            order["updatedAt"] = now_iso()


def update_order_execution(
    order: dict[str, Any],
    *,
    status: str,
    status_message: str | None = None,
    reason_code: str | None = None,
    reason_note: str | None = None,
    proof: dict[str, Any] | None = None,
) -> None:
    order["status"] = status
    order["statusMessage"] = status_message or label_for_proof_outcome(status) or status.replace("_", " ").title()
    order["statusReasonCode"] = reason_code
    order["statusReasonLabel"] = label_for_reason_code(reason_code)
    order["statusReason"] = reason_note or None
    if proof:
        order["lastProofId"] = proof["id"]
        order["lastProofOutcomeCode"] = proof.get("proofOutcomeCode")
        order["lastProofOutcomeLabel"] = proof.get("proofOutcomeLabel")
        order["lastProofPhotoUrls"] = list(proof.get("photoUrls", []))
        order["lastProofNote"] = proof.get("note")
        order["lastProofDeliveredAt"] = proof.get("deliveredAt")
    order["updatedAt"] = now_iso()


def update_order_from_stop_event(order: dict[str, Any], stop: dict[str, Any], status: str, note: str | None = None) -> None:
    if status == "arrived":
        if stop.get("kind") == "pickup":
            update_order_execution(order, status="en_route_pickup", status_message="Driver arrived for pickup")
        else:
            update_order_execution(order, status="in_progress", status_message="Driver arrived for delivery")
        return

    if status == "served" and stop.get("kind") == "pickup":
        update_order_execution(order, status="pickup_handed_over_to_tsp", status_message="Handed Over to TSP")
        return

    if status == "served":
        update_order_execution(order, status="delivery_order_delivered", status_message="Order Delivered")
        return

    if status in {"failed", "skipped"}:
        failure_status = "pickup_failed" if stop.get("kind") == "pickup" else "delivery_failed"
        failure_message = "Failed Pickup" if stop.get("kind") == "pickup" else "Failed"
        update_order_execution(order, status=failure_status, status_message=failure_message, reason_note=note)

def build_mock_routes(plan_id: str, orders: list[dict[str, Any]], shifts: list[dict[str, Any]]) -> list[dict[str, Any]]:
    buckets = [{"shift": shift, "orders": []} for shift in shifts]
    def order_sort_key(order: dict[str, Any]) -> str:
        time_windows = order.get("timeWindows") or []
        if time_windows and isinstance(time_windows[0], dict) and time_windows[0].get("start"):
            return str(time_windows[0]["start"])
        return str(order.get("createdAt", ""))

    ordered_orders = sorted(orders, key=order_sort_key)

    for index, order in enumerate(ordered_orders):
        if buckets:
            buckets[index % len(buckets)]["orders"].append(order)

    routes = []
    for bucket in buckets:
        if not bucket["orders"]:
            continue
        route_id = create_id("route")
        shift = bucket["shift"]
        current_time = datetime.fromisoformat(shift["startAt"]).astimezone()
        sequence = 1
        stops = []
        pickup_keys = {address_identity_key(order.get("pickupAddress")) for order in bucket["orders"] if order.get("pickupAddress")}
        common_pickup = bucket["orders"][0].get("pickupAddress") if len(pickup_keys) == 1 and bucket["orders"][0].get("pickupAddress") else None
        if common_pickup:
            pickup_arrival = current_time + timedelta(minutes=10)
            pickup_duration_seconds = sum(int(order.get("serviceDurationSeconds", 300) or 300) for order in bucket["orders"])
            current_time = pickup_arrival + timedelta(seconds=pickup_duration_seconds)
            grouped_order_ids = [order["id"] for order in bucket["orders"]]
            stops.append(
                {
                    "id": f"{route_id}_stop_{sequence}",
                    "orderId": grouped_order_ids[0],
                    "orderIds": grouped_order_ids,
                    "sequence": sequence,
                    "kind": "pickup",
                    "address": deepcopy(common_pickup),
                    "plannedArrivalAt": pickup_arrival.isoformat(),
                    "plannedDepartureAt": current_time.isoformat(),
                    "status": "pending",
                }
            )
            sequence += 1

        for order in bucket["orders"]:
            if not common_pickup and order.get("pickupAddress"):
                pickup_arrival = current_time + timedelta(minutes=10)
                current_time = pickup_arrival + timedelta(seconds=int(order.get("serviceDurationSeconds", 300)))
                stops.append(create_route_stop(route_id, order, "pickup", sequence, pickup_arrival.isoformat(), current_time.isoformat()))
                sequence += 1

            delivery_arrival = current_time + timedelta(minutes=15)
            current_time = delivery_arrival + timedelta(seconds=int(order.get("serviceDurationSeconds", 300)))
            stops.append(create_route_stop(route_id, order, "delivery", sequence, delivery_arrival.isoformat(), current_time.isoformat()))
            sequence += 1

        routes.append(
            {
                "id": route_id,
                "tenantId": bucket["orders"][0].get("tenantId") or shift.get("tenantId") or DEMO_TENANT_ID,
                "companyId": bucket["orders"][0].get("companyId") or shift.get("companyId") or DEMO_TENANT_ID,
                "planId": plan_id,
                "shiftId": shift["id"],
                "driverId": shift["driverId"],
                "vehicleId": shift["vehicleId"],
                "status": "ready",
                "source": "python_mock",
                "orderIds": [order["id"] for order in bucket["orders"]],
                "pickupGroupIds": sorted(
                    {
                        str(order.get("pickupGroupId"))
                        for order in bucket["orders"]
                        if order.get("pickupGroupId")
                    }
                ),
                "totalDistanceMeters": len(stops) * 4300,
                "totalDurationSeconds": int((current_time - datetime.fromisoformat(shift["startAt"]).astimezone()).total_seconds()),
                "stops": stops,
            }
        )

    return routes


def find_route(db: dict[str, Any], route_id: str) -> dict[str, Any] | None:
    for route in db["routes"]:
        if route["id"] == route_id:
            return route
    return None


def find_stop(db: dict[str, Any], stop_id: str) -> tuple[dict[str, Any], dict[str, Any]] | None:
    for route in db["routes"]:
        for stop in route.get("stops", []):
            if stop["id"] == stop_id:
                return route, stop
    return None


def update_route_lifecycle(route: dict[str, Any]) -> None:
    has_started = any(stop.get("status") in {"arrived", "served", "failed", "skipped"} for stop in route.get("stops", []))
    has_pending = any(stop.get("status") in {"pending", "arrived"} for stop in route.get("stops", []))
    if has_started and route.get("status") not in {"completed", "cancelled"}:
        route["status"] = "in_progress"
    if route.get("stops") and not has_pending:
        route["status"] = "completed"
        route["completedAt"] = now_iso()


def build_carrier_view(db: dict[str, Any], route: dict[str, Any]) -> dict[str, Any]:
    next_stop = next((stop for stop in route.get("stops", []) if stop.get("status") == "pending"), None)
    order_ids = [order_id for stop in route.get("stops", []) for order_id in stop_order_ids(stop)]
    orders = [deepcopy(order) for order in db["orders"] if order["id"] in order_ids]
    driver = next((item for item in db["drivers"] if item["id"] == route.get("driverId")), None)
    shift = next((item for item in db["shifts"] if item["id"] == route.get("shiftId")), None)
    proofs = [deepcopy(proof) for proof in db["proofs"] if proof.get("routeId") == route.get("id")]
    heartbeats = [deepcopy(heartbeat) for heartbeat in db["heartbeats"] if heartbeat.get("routeId") == route.get("id")]
    return {
        "route": deepcopy(route),
        "driver": deepcopy(driver),
        "shift": deepcopy(shift),
        "orders": orders,
        "proofs": proofs,
        "lastHeartbeat": heartbeats[0] if heartbeats else None,
        "nextStop": deepcopy(next_stop),
        "pendingStops": sum(1 for stop in route.get("stops", []) if stop.get("status") == "pending"),
        "completedStops": sum(1 for stop in route.get("stops", []) if stop.get("status") in {"served", "failed", "skipped"}),
        "totalStops": len(route.get("stops", [])),
    }


@dataclass
class StaticFile:
    path: Path
    content_type: str


class NaavalHandler(BaseHTTPRequestHandler):
    server_version = "NaavalDevServer/0.1"

    def do_OPTIONS(self) -> None:
        send_no_content(self)

    def redirect(self, location: str) -> None:
        self.send_response(HTTPStatus.MOVED_PERMANENTLY)
        self.send_header("Location", location)
        self.end_headers()

    def do_GET(self) -> None:
        path = request_path(self)

        if path == "/ops":
            self.redirect("/ops/")
            return

        if path == "/portal":
            self.redirect("/portal/")
            return

        if path == "/carrier":
            self.redirect("/carrier/")
            return

        if path.startswith("/health"):
            return send_json(
                self,
                HTTPStatus.OK,
                {
                    "status": "ok",
                    "service": "naaval-dev-server",
                    "dbPath": str(DB_PATH),
                    "solver": "graphhopper-enabled" if RUNTIME_CONFIG.get("graphhopper_api_key") else "python-local",
                    "multiTenant": True,
                },
            )

        if path == "/auth/me":
            db = read_db()
            auth = require_auth(self, db)
            if not auth:
                return
            return send_json(self, HTTPStatus.OK, build_session_payload(auth["session"], auth["actor"], auth["tenant"]))

        if path == "/tenant/context":
            db = read_db()
            auth = require_auth(self, db)
            if not auth:
                return
            return send_json(
                self,
                HTTPStatus.OK,
                {
                    "tenant": deepcopy(auth["tenant"]),
                    "tenantContext": resolve_tenant_context(auth["tenant"]),
                    "modulesCatalog": module_catalog(),
                    "algorithmsCatalog": algorithm_catalog(),
                    "plansCatalog": list(saas_plan_catalog().values()),
                },
            )

        if path == "/admin/tenants":
            db = read_db()
            auth = require_auth(self, db, ("ops_user",))
            if not auth:
                return
            if not ensure_platform_admin_access(self, auth):
                return
            tenants = sorted(db["tenants"], key=lambda item: str(item.get("companyName", "")).lower())
            return send_json(
                self,
                HTTPStatus.OK,
                {
                    "items": [serialize_tenant_record(db, tenant) for tenant in tenants if tenant.get("id") != PLATFORM_TENANT_ID],
                    "total": len([tenant for tenant in tenants if tenant.get("id") != PLATFORM_TENANT_ID]),
                },
            )

        if path == "/orders":
            db = read_db()
            auth = require_auth(self, db)
            if not auth:
                return
            items = filter_collection(scoped_items(db["orders"], auth, "orders"), query_params(self), ["status", "merchantId", "hubId", "customerId", "source"])
            return send_json(self, HTTPStatus.OK, {"items": items, "total": len(items)})

        if path == "/pricing/config":
            db = read_db()
            auth = require_auth(self, db, ("ops_user",))
            if not auth:
                return
            return send_json(self, HTTPStatus.OK, {"config": scoped_pricing_config(db, auth)})

        if path.startswith("/orders/"):
            db = read_db()
            auth = require_auth(self, db)
            if not auth:
                return
            order_id = path.split("/", 2)[2]
            order = next((item for item in scoped_items(db["orders"], auth, "orders") if item["id"] == order_id), None)
            if not order:
                return json_error(self, HTTPStatus.NOT_FOUND, "not_found", "Order not found")
            return send_json(self, HTTPStatus.OK, order)

        if path in {"/fleet/hubs", "/fleet/drivers", "/fleet/shifts", "/fleet/vehicles", "/fleet/vehicle-types", "/fleet/carrier-companies"}:
            db = read_db()
            auth = require_auth(self, db)
            if not auth:
                return
            key = {
                "/fleet/hubs": "hubs",
                "/fleet/drivers": "drivers",
                "/fleet/shifts": "shifts",
                "/fleet/vehicles": "vehicles",
                "/fleet/vehicle-types": "vehicleTypes",
                "/fleet/carrier-companies": "carrierCompanies",
            }[path]
            items = scoped_items(db[key], auth, key)
            return send_json(self, HTTPStatus.OK, {"items": items, "total": len(items)})

        if path == "/admin/users":
            db = read_db()
            auth = require_auth(self, db, ("ops_user",))
            if not auth:
                return
            items = db["opsUsers"] if is_platform_admin_auth(auth) else scoped_items(db["opsUsers"], auth, "opsUsers")
            return send_json(self, HTTPStatus.OK, {"items": items, "total": len(items)})

        if path == "/customers":
            db = read_db()
            auth = require_auth(self, db, ("ops_user", "customer"))
            if not auth:
                return
            items = scoped_items(db["customers"], auth, "customers")
            return send_json(self, HTTPStatus.OK, {"items": items, "total": len(items)})

        if path == "/quotes":
            db = read_db()
            auth = require_auth(self, db, ("ops_user", "customer"))
            if not auth:
                return
            items = scoped_items(db["quotes"], auth, "quotes")
            return send_json(self, HTTPStatus.OK, {"items": items, "total": len(items)})

        if path == "/inbox/messages":
            db = read_db()
            auth = require_auth(self, db)
            if not auth:
                return
            items = filter_collection(scoped_items(db["inboxMessages"], auth, "inboxMessages"), query_params(self), ["audience", "threadId", "senderType", "senderId"])
            items = sorted(items, key=lambda item: item.get("createdAt", ""))
            return send_json(self, HTTPStatus.OK, {"items": items, "total": len(items)})

        if path == "/recurring-routes":
            db = read_db()
            auth = require_auth(self, db, ("ops_user", "customer"))
            if not auth:
                return
            items = filter_collection(scoped_items(db["recurringRoutes"], auth, "recurringRoutes"), query_params(self), ["status", "merchantId", "customerId", "source"])
            return send_json(self, HTTPStatus.OK, {"items": items, "total": len(items)})

        if path == "/fleet/overview":
            db = read_db()
            auth = require_auth(self, db, ("ops_user",))
            if not auth:
                return
            hubs = scoped_items(db["hubs"], auth, "hubs")
            vehicle_types = scoped_items(db["vehicleTypes"], auth, "vehicleTypes")
            vehicles = scoped_items(db["vehicles"], auth, "vehicles")
            drivers = scoped_items(db["drivers"], auth, "drivers")
            shifts = scoped_items(db["shifts"], auth, "shifts")
            return send_json(
                self,
                HTTPStatus.OK,
                {
                    "hubs": len(hubs),
                    "vehicleTypes": len(vehicle_types),
                    "vehicles": len(vehicles),
                    "drivers": len(drivers),
                    "shifts": len(shifts),
                },
            )

        if path == "/routes":
            db = read_db()
            auth = require_auth(self, db)
            if not auth:
                return
            items = filter_collection(scoped_items(db["routes"], auth, "routes"), query_params(self), ["status", "driverId", "planId"])
            return send_json(self, HTTPStatus.OK, {"items": items, "total": len(items)})

        if path == "/planning/jobs":
            db = read_db()
            auth = require_auth(self, db, ("ops_user",))
            if not auth:
                return
            items = sorted(
                scoped_items(db["planningJobs"], auth, "planningJobs"),
                key=lambda item: item.get("createdAt", ""),
                reverse=True,
            )
            return send_json(self, HTTPStatus.OK, {"items": items, "total": len(items)})

        if path.startswith("/routes/"):
            db = read_db()
            auth = require_auth(self, db)
            if not auth:
                return
            route_id = path.split("/", 2)[2]
            if route_id.endswith("/geometry"):
                route_id = route_id.removesuffix("/geometry")
                route = find_route(db, route_id)
                if not route or not entity_belongs_to_auth(route, auth):
                    return json_error(self, HTTPStatus.NOT_FOUND, "not_found", "Route not found")
                shift = next((item for item in db["shifts"] if item["id"] == route.get("shiftId")), None)
                points = [
                    {
                        "lat": coordinates["lat"],
                        "lon": coordinates["lon"],
                    }
                    for stop in route.get("stops", [])
                    for coordinates in [((stop.get("address") or {}).get("coordinates") or {})]
                    if coordinates.get("lat") is not None and coordinates.get("lon") is not None
                ]

                if RUNTIME_CONFIG.get("graphhopper_api_key") and len(points) >= 2:
                    try:
                        geometry = graphhopper_route_geometry(points, route_profile_for_shift(shift))
                        db["graphhopperUsage"] = {
                            **deepcopy(db.get("graphhopperUsage") or {}),
                            **geometry.get("usage", {}),
                        }
                        write_db(db)
                        return send_json(
                            self,
                            HTTPStatus.OK,
                            {
                                "routeId": route_id,
                                "source": geometry["source"],
                                "coordinates": geometry["coordinates"],
                            },
                        )
                    except Exception as error:
                        return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", str(error))

                return send_json(
                    self,
                    HTTPStatus.OK,
                    {
                        "routeId": route_id,
                        "source": "fallback",
                        "coordinates": points,
                    },
                )
            route = find_route(db, route_id)
            if not route or not entity_belongs_to_auth(route, auth):
                return json_error(self, HTTPStatus.NOT_FOUND, "not_found", "Route not found")
            return send_json(self, HTTPStatus.OK, route)

        if path.startswith("/planning/jobs/"):
            db = read_db()
            auth = require_auth(self, db, ("ops_user",))
            if not auth:
                return
            job_id = path.split("/", 3)[3]
            job = next((item for item in scoped_items(db["planningJobs"], auth, "planningJobs") if item["id"] == job_id), None)
            if not job:
                return json_error(self, HTTPStatus.NOT_FOUND, "not_found", "Planning job not found")
            return send_json(self, HTTPStatus.OK, job)

        if path.startswith("/plans/"):
            db = read_db()
            auth = require_auth(self, db, ("ops_user",))
            if not auth:
                return
            plan_id = path.split("/", 2)[2]
            plan = next((item for item in scoped_items(db["planningJobs"], auth, "planningJobs") if item["id"] == plan_id), None)
            if not plan:
                return json_error(self, HTTPStatus.NOT_FOUND, "not_found", "Plan not found")
            return send_json(
                self,
                HTTPStatus.OK,
                {
                    "plan": plan,
                    "routes": [route for route in scoped_items(db["routes"], auth, "routes") if route.get("planId") == plan_id],
                    "orders": [order for order in scoped_items(db["orders"], auth, "orders") if order["id"] in plan.get("orderIds", [])],
                },
            )

        if path == "/graphhopper/usage":
            db = read_db()
            auth = require_auth(self, db, ("ops_user",))
            if not auth:
                return
            usage = deepcopy(db.get("graphhopperUsage") or {})
            usage["enabled"] = bool(RUNTIME_CONFIG.get("graphhopper_api_key"))
            return send_json(self, HTTPStatus.OK, usage)

        if path == "/carrier/routes":
            params = query_params(self)
            driver_id = params.get("driverId")
            if not driver_id:
                return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", "driverId is required")
            db = read_db()
            routes = [build_carrier_view(db, route) for route in db["routes"] if route.get("driverId") == driver_id]
            return send_json(self, HTTPStatus.OK, {"items": routes, "total": len(routes)})

        if path.startswith("/carrier/routes/"):
            db = read_db()
            route_id = path.split("/", 3)[3]
            route = find_route(db, route_id)
            if not route:
                return json_error(self, HTTPStatus.NOT_FOUND, "not_found", "Route not found")
            return send_json(self, HTTPStatus.OK, build_carrier_view(db, route))

        if path == "/events":
            db = read_db()
            params = query_params(self)
            items = db["events"]
            if params.get("entityType"):
                items = [event for event in items if event.get("entityType") == params["entityType"]]
            if params.get("entityId"):
                items = [event for event in items if event.get("entityId") == params["entityId"]]
            return send_json(self, HTTPStatus.OK, {"items": items, "total": len(items)})

        static_file = self.resolve_static_path(path)
        if static_file:
            return self.serve_static_file(static_file)

        json_error(self, HTTPStatus.NOT_FOUND, "not_found", "Resource not found")

    def do_POST(self) -> None:
        path = request_path(self)
        try:
            body = parse_json_body(self)
        except json.JSONDecodeError:
            return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", "Invalid JSON body")

        try:
            if path == "/dev/seed-demo":
                replace = bool(body.get("replace", False))
                db = build_demo_db(replace=replace)
                write_db(db)
                return send_json(self, HTTPStatus.CREATED, {"ok": True, "message": "Demo data seeded", "dbPath": str(DB_PATH)})

            if path == "/auth/login":
                db = read_db()
                email = str(body.get("email", "")).strip().lower()
                password = str(body.get("password", "")).strip()
                if not email or not password:
                    return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", "email and password are required")
                user = next((item for item in db["opsUsers"] if str(item.get("email", "")).strip().lower() == email), None)
                if not user or str(user.get("status", "active")) != "active":
                    return json_error(self, HTTPStatus.UNAUTHORIZED, "unauthorized", "Invalid credentials")
                expected_password = str(user.get("temporaryPassword", "")).strip() or "demo"
                if password != expected_password:
                    return json_error(self, HTTPStatus.UNAUTHORIZED, "unauthorized", "Invalid credentials")
                tenant = find_tenant(db, user.get("tenantId"))
                session = create_auth_session(
                    db,
                    actor_type="ops_user",
                    actor=user,
                    tenant_id=str(user.get("tenantId") or DEMO_TENANT_ID),
                    role=str(user.get("role") or "company_user"),
                    source="password",
                )
                write_db(db)
                return send_json(self, HTTPStatus.OK, build_session_payload(session, user, tenant))

            if path == "/auth/google-ops":
                db = read_db()
                email = str(body.get("email", "")).strip().lower()
                if not email:
                    return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", "email is required")
                user = next((item for item in db["opsUsers"] if str(item.get("email", "")).strip().lower() == email), None)
                if not user or str(user.get("status", "active")) != "active":
                    return json_error(self, HTTPStatus.UNAUTHORIZED, "unauthorized", "This Google account is not registered as an ops user yet")
                tenant = find_tenant(db, user.get("tenantId"))
                session = create_auth_session(
                    db,
                    actor_type="ops_user",
                    actor=user,
                    tenant_id=str(user.get("tenantId") or DEMO_TENANT_ID),
                    role=str(user.get("role") or "company_user"),
                    source="google",
                )
                write_db(db)
                return send_json(self, HTTPStatus.OK, build_session_payload(session, user, tenant))

            if path == "/auth/customer-login":
                db = read_db()
                email = str(body.get("email", "")).strip().lower()
                if not email:
                    return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", "email is required")
                customer = next(
                    (
                        item
                        for item in db["customers"]
                        if email in {
                            str(item.get("companyEmail", "")).strip().lower(),
                            str(item.get("contactEmail", "")).strip().lower(),
                        }
                    ),
                    None,
                )
                if not customer:
                    return json_error(self, HTTPStatus.UNAUTHORIZED, "unauthorized", "No customer account matches this email yet")
                tenant = find_tenant(db, customer.get("tenantId"))
                session = create_auth_session(
                    db,
                    actor_type="customer",
                    actor=customer,
                    tenant_id=str(customer.get("tenantId") or DEMO_TENANT_ID),
                    role="customer_user",
                    source="email",
                )
                write_db(db)
                return send_json(self, HTTPStatus.OK, build_session_payload(session, customer, tenant))

            if path == "/auth/signup/company":
                db = read_db()
                first_name = str(body.get("firstName", "")).strip()
                last_name = str(body.get("lastName", "")).strip()
                company_name = str(body.get("company", "") or body.get("companyName", "")).strip()
                email = str(body.get("email", "")).strip().lower()
                password = str(body.get("password", "")).strip() or "demo"
                phone = str(body.get("phone", "")).strip()
                if not first_name or not last_name or not company_name or not email:
                    return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", "firstName, lastName, company and email are required")
                if any(str(item.get("email", "")).strip().lower() == email for item in db["opsUsers"]):
                    return json_error(self, HTTPStatus.CONFLICT, "conflict", "An account with this email already exists")

                tenant = create_company_tenant(db, company_name=company_name, plan_id=str(body.get("planId") or DEFAULT_SIGNUP_PLAN_ID))
                tenant["signupMeta"] = {
                    "volume": str(body.get("volume", "")).strip(),
                    "message": str(body.get("message", "")).strip(),
                    "phone": phone,
                    "createdByEmail": email,
                }
                tenant["updatedAt"] = now_iso()
                create_default_company_hub(db, tenant)
                timestamp = now_iso()
                user = {
                    "id": create_id("ops_user"),
                    "tenantId": tenant["id"],
                    "companyId": tenant["id"],
                    "firstName": first_name,
                    "lastName": last_name,
                    "email": email,
                    "phone": phone,
                    "role": "company_admin",
                    "team": company_name,
                    "temporaryPassword": password,
                    "status": "active",
                    "createdAt": timestamp,
                    "updatedAt": timestamp,
                }
                db["opsUsers"].insert(0, user)
                append_event(db, "ops_user.created", "ops_user", user["id"], {"tenantId": tenant["id"], "email": email})
                session = create_auth_session(
                    db,
                    actor_type="ops_user",
                    actor=user,
                    tenant_id=tenant["id"],
                    role="company_admin",
                    source="signup",
                )
                write_db(db)
                return send_json(
                    self,
                    HTTPStatus.CREATED,
                    {
                        **build_session_payload(session, user, tenant),
                        "redirectPath": "/ops/",
                        "planId": tenant["planId"],
                    },
                )

            if path == "/orders":
                db = read_db()
                auth = require_auth(self, db, ("ops_user", "customer"))
                if not auth:
                    return
                payload = deepcopy(body)
                payload["tenantId"] = auth["tenantId"]
                payload["companyId"] = auth["companyId"]
                order = normalize_order_input(payload)
                db["orders"].insert(0, order)
                append_event(db, "order.created", "order", order["id"], {"reference": order["reference"]})
                write_db(db)
                return send_json(self, HTTPStatus.CREATED, order)

            if path == "/orders/import":
                db = read_db()
                auth = require_auth(self, db, ("ops_user",))
                if not auth:
                    return
                merchant_id = body.get("merchantId")
                orders = body.get("orders")
                if not merchant_id or not isinstance(orders, list):
                    return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", "merchantId and orders[] are required")
                imported = []
                for candidate in orders:
                    candidate["merchantId"] = merchant_id
                    candidate["tenantId"] = auth["tenantId"]
                    candidate["companyId"] = auth["companyId"]
                    order = normalize_order_input(candidate)
                    db["orders"].append(order)
                    imported.append(order)
                    append_event(db, "order.imported", "order", order["id"], {"reference": order["reference"]})
                write_db(db)
                return send_json(self, HTTPStatus.ACCEPTED, {"imported": len(imported), "items": imported})

            if path == "/pricing/config":
                if not isinstance(body, dict):
                    return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", "pricing config payload must be an object")
                db = read_db()
                auth = require_auth(self, db, ("ops_user",))
                if not auth:
                    return
                tenant_id = resolve_target_tenant_id(auth, body, default_for_platform=PLATFORM_TENANT_ID)
                config_payload = deepcopy(body)
                config_payload.pop("tenantId", None)
                config_payload.pop("companyId", None)
                config_payload.pop("applyGlobally", None)
                if is_platform_admin_auth(auth) and bool(body.get("applyGlobally")):
                    db["pricingConfig"] = deepcopy(config_payload)
                db["tenantPricingConfigs"][tenant_id] = deepcopy(config_payload)
                append_event(db, "pricing.config_updated", "pricing", tenant_id, {"updatedAt": now_iso(), "tenantId": tenant_id})
                write_db(db)
                return send_json(self, HTTPStatus.OK, {"config": deepcopy(db["tenantPricingConfigs"][tenant_id]), "tenantId": tenant_id})

            if path.startswith("/orders/") and path.endswith("/assignment"):
                order_id = path.split("/")[2]
                driver_id = body.get("driverId")
                if not driver_id:
                    return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", "driverId is required")
                db = read_db()
                auth = require_auth(self, db, ("ops_user",))
                if not auth:
                    return
                order = next((item for item in db["orders"] if item["id"] == order_id), None)
                driver = next((item for item in db["drivers"] if item["id"] == driver_id), None)
                if not order or not entity_belongs_to_auth(order, auth):
                    return json_error(self, HTTPStatus.NOT_FOUND, "not_found", "Order not found")
                if not driver or not entity_belongs_to_auth(driver, auth):
                    return json_error(self, HTTPStatus.NOT_FOUND, "not_found", "Driver not found")
                try:
                    order, route = assign_order_to_driver(db, order_id, driver_id)
                except LookupError as error:
                    return json_error(self, HTTPStatus.NOT_FOUND, "not_found", str(error))
                write_db(db)
                return send_json(self, HTTPStatus.OK, {"order": order, "route": route})

            if path in {"/fleet/hubs", "/fleet/drivers", "/fleet/shifts", "/fleet/vehicles", "/fleet/vehicle-types", "/fleet/carrier-companies"}:
                db = read_db()
                auth = require_auth(self, db, ("ops_user",))
                if not auth:
                    return
                if not require_company_admin_access(self, auth):
                    return
                key = {
                    "/fleet/hubs": "hubs",
                    "/fleet/drivers": "drivers",
                    "/fleet/shifts": "shifts",
                    "/fleet/vehicles": "vehicles",
                    "/fleet/vehicle-types": "vehicleTypes",
                    "/fleet/carrier-companies": "carrierCompanies",
                }[path]
                entity_type = "carrier_company" if key == "carrierCompanies" else key[:-1] if key.endswith("s") else key
                timestamp = now_iso()
                entity = deepcopy(body)
                entity["id"] = entity.get("id") or create_id(entity_type)
                tenant_id = resolve_target_tenant_id(auth, body, default_for_platform=DEMO_TENANT_ID)
                entity["tenantId"] = tenant_id
                entity["companyId"] = tenant_id
                entity.setdefault("createdAt", timestamp)
                entity["updatedAt"] = timestamp
                if key == "drivers":
                    entity.setdefault("skills", [])
                    entity.setdefault("status", "active")
                if key == "shifts":
                    entity.setdefault("skills", [])
                    entity.setdefault("status", "planned")
                    if entity.get("driverId"):
                        driver = next((item for item in db["drivers"] if item["id"] == entity.get("driverId")), None)
                        if not driver or str(driver.get("tenantId")) != tenant_id:
                            return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", "driverId must belong to the same company")
                if key == "vehicleTypes":
                    entity.setdefault("vehicleClass", "van")
                    entity.setdefault("routingProfile", "car")
                    entity.setdefault("capacity", {"parcels": 0, "weightKg": 0, "volumeDm3": 0})
                db[key].insert(0, entity)
                append_event(db, f"{entity_type}.created", entity_type, entity["id"], entity)
                write_db(db)
                return send_json(self, HTTPStatus.CREATED, entity)

            if path == "/admin/users":
                db = read_db()
                auth = require_auth(self, db, ("ops_user",))
                if not auth:
                    return
                if not require_company_admin_access(self, auth):
                    return
                timestamp = now_iso()
                email = str(body.get("email", "")).strip().lower()
                if not email:
                    return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", "email is required")
                if any(str(item.get("email", "")).strip().lower() == email for item in db["opsUsers"]):
                    return json_error(self, HTTPStatus.CONFLICT, "conflict", "An ops user with this email already exists")
                role = sanitize_ops_user_role(self, auth, body.get("role", "company_user"))
                if not role:
                    return
                tenant_id = resolve_target_tenant_id(
                    auth,
                    body,
                    default_for_platform=PLATFORM_TENANT_ID if role in {"super_admin", "naaval_admin"} else DEMO_TENANT_ID,
                )
                entity = {
                    "id": body.get("id") or create_id("ops_user"),
                    "tenantId": tenant_id,
                    "companyId": tenant_id,
                    "firstName": body.get("firstName", ""),
                    "lastName": body.get("lastName", ""),
                    "email": email,
                    "role": role,
                    "team": body.get("team", "Operations"),
                    "temporaryPassword": body.get("temporaryPassword", "") or "demo",
                    "status": body.get("status", "active"),
                    "createdAt": timestamp,
                    "updatedAt": timestamp,
                }
                if not entity["firstName"] or not entity["lastName"] or not entity["email"]:
                    return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", "firstName, lastName and email are required")
                db["opsUsers"].insert(0, entity)
                append_event(db, "ops_user.created", "ops_user", entity["id"], entity)
                write_db(db)
                return send_json(self, HTTPStatus.CREATED, entity)

            if path == "/customers":
                db = read_db()
                auth = require_auth(self, db, ("ops_user",))
                if not auth:
                    return
                timestamp = now_iso()
                tenant_id = resolve_target_tenant_id(auth, body, default_for_platform=DEMO_TENANT_ID)
                entity = {
                    "id": body.get("id") or create_id("customer"),
                    "tenantId": tenant_id,
                    "companyId": tenant_id,
                    "companyName": body.get("companyName", ""),
                    "headquartersAddress": body.get("headquartersAddress", ""),
                    "vatNumber": body.get("vatNumber", ""),
                    "companyPhone": body.get("companyPhone", ""),
                    "companyEmail": body.get("companyEmail", ""),
                    "contactFirstName": body.get("contactFirstName", ""),
                    "contactLastName": body.get("contactLastName", ""),
                    "contactPhone": body.get("contactPhone", ""),
                    "contactEmail": body.get("contactEmail", ""),
                    "revenueRange": body.get("revenueRange", ""),
                    "companySize": body.get("companySize", "smb"),
                    "pricingAlgorithmId": body.get("pricingAlgorithmId", "basic"),
                    "createdAt": timestamp,
                    "updatedAt": timestamp,
                }
                if not entity["companyName"] or not entity["headquartersAddress"]:
                    return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", "companyName and headquartersAddress are required")
                db["customers"].insert(0, entity)
                append_event(db, "customer.created", "customer", entity["id"], entity)
                write_db(db)
                return send_json(self, HTTPStatus.CREATED, entity)

            if path == "/quotes":
                db = read_db()
                auth = require_auth(self, db, ("ops_user", "customer"))
                if not auth:
                    return
                timestamp = now_iso()
                tenant_id = resolve_target_tenant_id(auth, body, default_for_platform=DEMO_TENANT_ID)
                if auth.get("actorType") == "customer":
                    body["customerId"] = auth["actor"].get("id")
                entity = {
                    "id": body.get("id") or create_id("quote"),
                    "tenantId": tenant_id,
                    "companyId": tenant_id,
                    "customerId": body.get("customerId"),
                    "source": body.get("source", "basic"),
                    "sourceLabel": body.get("sourceLabel", "Basic Algo"),
                    "description": body.get("description", ""),
                    "amount": float(body.get("amount", 0)),
                    "currency": body.get("currency", "EUR"),
                    "dateKey": body.get("dateKey", now_iso()[:10]),
                    "companySnapshot": body.get("companySnapshot", {}),
                    "createdAt": timestamp,
                    "updatedAt": timestamp,
                }
                if not entity["customerId"]:
                    return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", "customerId is required")
                if auth.get("actorType") != "customer":
                    customer = next((item for item in db["customers"] if item["id"] == entity["customerId"]), None)
                    if not customer or not entity_belongs_to_auth(customer, auth):
                        return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", "customerId must belong to your company")
                db["quotes"].insert(0, entity)
                append_event(db, "quote.created", "quote", entity["id"], entity)
                write_db(db)
                return send_json(self, HTTPStatus.CREATED, entity)

            if path == "/inbox/messages":
                db = read_db()
                auth = require_auth(self, db)
                if not auth:
                    return
                timestamp = body.get("createdAt", now_iso())
                entity = {
                    "id": body.get("id") or create_id("msg"),
                    "tenantId": auth["tenantId"],
                    "companyId": auth["companyId"],
                    "audience": body.get("audience"),
                    "threadId": body.get("threadId"),
                    "author": body.get("author")
                    or auth["actor"].get("name")
                    or " ".join(part for part in [auth["actor"].get("firstName"), auth["actor"].get("lastName")] if part).strip()
                    or auth["actor"].get("companyName")
                    or "Naaval",
                    "body": body.get("body", "").strip(),
                    "senderType": body.get("senderType", auth["actorType"]),
                    "senderId": body.get("senderId") or auth["actor"].get("id"),
                    "createdAt": timestamp,
                    "time": body.get("time"),
                }
                if not entity["audience"] or not entity["threadId"] or not entity["body"]:
                    return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", "audience, threadId and body are required")
                db["inboxMessages"].append(entity)
                append_event(db, "inbox.message_created", "inbox_message", entity["id"], {"audience": entity["audience"], "threadId": entity["threadId"]})
                write_db(db)
                return send_json(self, HTTPStatus.CREATED, entity)

            if path == "/recurring-routes":
                db = read_db()
                auth = require_auth(self, db, ("ops_user", "customer"))
                if not auth:
                    return
                timestamp = now_iso()
                entity = deepcopy(body)
                entity["id"] = entity.get("id") or create_id("rr")
                entity["tenantId"] = resolve_target_tenant_id(auth, body, default_for_platform=DEMO_TENANT_ID)
                entity["companyId"] = entity["tenantId"]
                entity.setdefault("source", "manual")
                entity.setdefault("status", "planned")
                entity.setdefault("customerId", auth["actor"].get("id") if auth.get("actorType") == "customer" else body.get("customerId"))
                entity.setdefault("recurringDays", [])
                entity.setdefault("orders", [])
                entity.setdefault("tags", [])
                entity.setdefault("createdAt", timestamp)
                entity["updatedAt"] = timestamp
                if not entity.get("merchantId"):
                    return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", "merchantId is required")
                if not entity.get("pickupAddress"):
                    return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", "pickupAddress is required")
                if not entity.get("orders"):
                    return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", "orders[] is required")
                db["recurringRoutes"].insert(0, entity)
                append_event(db, "recurring_route.created", "recurring_route", entity["id"], entity)
                write_db(db)
                return send_json(self, HTTPStatus.CREATED, entity)

            if path == "/planning/optimize":
                hub_id = body.get("hubId")
                plan_date = body.get("planDate")
                order_ids = body.get("orderIds")
                shift_ids = body.get("driverShiftIds")
                if not hub_id or not plan_date or not isinstance(order_ids, list) or not isinstance(shift_ids, list):
                    return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", "hubId, planDate, orderIds[] and driverShiftIds[] are required")
                db = read_db()
                auth = require_auth(self, db, ("ops_user",))
                if not auth:
                    return
                orders = [order for order in scoped_items(db["orders"], auth, "orders") if order["id"] in order_ids]
                start_time = body.get("startTime") or (body.get("optimizerSetup") or {}).get("startTime")
                end_time = body.get("endTime") or (body.get("optimizerSetup") or {}).get("endTime")
                shifts = [
                    override_shift_operating_window(materialize_shift_for_plan_date(shift, plan_date), plan_date, start_time, end_time)
                    for shift in scoped_items(db["shifts"], auth, "shifts")
                    if shift["id"] in shift_ids
                ]
                vehicle_types = [
                    vehicle_type
                    for vehicle_type in scoped_items(db["vehicleTypes"], auth, "vehicleTypes")
                    if any(shift.get("vehicleTypeId") == vehicle_type.get("id") for shift in shifts)
                ]
                if not orders:
                    return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", "No orders found for orderIds")
                if not shifts:
                    return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", "No shifts found for driverShiftIds")
                if not vehicle_types:
                    return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", "No vehicle types found for the selected shifts")

                coordinates_changed = False
                unresolved_locations: list[str] = []
                for order in orders:
                    coordinates_changed = enrich_order_coordinates(order) or coordinates_changed
                    if order.get("kind") in {"pickup_delivery", "return"} and not has_coordinates(order.get("pickupAddress")):
                        unresolved_locations.append(f"{order.get('reference', order['id'])}:pickup")
                    if not has_coordinates(order.get("dropoffAddress")):
                        unresolved_locations.append(f"{order.get('reference', order['id'])}:dropoff")

                if coordinates_changed:
                    write_db(db)

                if unresolved_locations:
                    return json_error(
                        self,
                        HTTPStatus.BAD_REQUEST,
                        "bad_request",
                        "Coordinates are still missing after geocoding for "
                        + ", ".join(unresolved_locations[:5])
                        + ("..." if len(unresolved_locations) > 5 else ""),
                    )

                plan_id = create_id("plan")
                requested_solver = body.get("solver") or RUNTIME_CONFIG.get("planning_solver", "auto")
                solver = (
                    "graphhopper"
                    if requested_solver == "graphhopper"
                    else "python_mock"
                    if requested_solver == "mock"
                    else "graphhopper"
                    if RUNTIME_CONFIG.get("graphhopper_api_key")
                    else "python_mock"
                )

                objective_preset = body.get("objectivePreset", "balanced")
                solver_note = None
                unassigned_job_ids: list[str] = []

                try:
                    if solver == "graphhopper":
                        problem, common_pickup = build_graphhopper_problem(orders, shifts, vehicle_types, objective_preset)
                        graphhopper_result = graphhopper_request("/vrp", problem)
                        solution = graphhopper_result["data"]
                        routes = hydrate_graphhopper_routes(plan_id, solution, shifts, orders, common_pickup=common_pickup)
                        raw_unassigned = (solution.get("solution", {}) or {}).get("unassigned", {}) if isinstance(solution, dict) else {}
                        if isinstance(raw_unassigned, dict):
                            unassigned_job_ids = [
                                str(job_id)
                                for job_id in [
                                    *(raw_unassigned.get("services") or []),
                                    *(raw_unassigned.get("shipments") or []),
                                ]
                                if job_id
                            ]
                        db["graphhopperUsage"] = {
                            **deepcopy(db.get("graphhopperUsage") or {}),
                            **graphhopper_result["usage"],
                        }
                    else:
                        routes = build_mock_routes(plan_id, orders, shifts)
                except Exception as error:
                    message = str(error)
                    if solver == "graphhopper" and "Too many vehicles for Route Optimization API" in message:
                        solver = "python_mock"
                        solver_note = "GraphHopper allows 1 vehicle on the current plan. Naaval local planner was used instead."
                        routes = build_mock_routes(plan_id, orders, shifts)
                    elif solver == "graphhopper" and "Too many locations for Route Optimization API" in message:
                        solver = "python_mock"
                        solver_note = "GraphHopper location limit was reached on the current plan. Naaval local planner was used instead."
                        routes = build_mock_routes(plan_id, orders, shifts)
                    else:
                        return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", message)

                job = {
                    "id": plan_id,
                    "tenantId": auth["tenantId"],
                    "companyId": auth["companyId"],
                    "hubId": hub_id,
                    "planDate": plan_date,
                    "orderIds": order_ids,
                    "driverShiftIds": shift_ids,
                    "objectivePreset": objective_preset,
                    "solver": solver,
                    "solverNote": solver_note,
                    "status": "finished",
                    "routeIds": [route["id"] for route in routes],
                    "unassignedJobIds": unassigned_job_ids,
                    "optimizerSetup": deepcopy(body.get("optimizerSetup") or {}),
                    "createdAt": now_iso(),
                    "updatedAt": now_iso(),
                    "completedAt": now_iso(),
                }
                db["planningJobs"].insert(0, job)
                db["routes"] = [route for route in db["routes"] if route.get("planId") != plan_id] + routes
                for order in db["orders"]:
                    if order["id"] in order_ids and order.get("status") not in {"completed", "in_progress"}:
                        order["status"] = "planned"
                        order["updatedAt"] = now_iso()
                append_event(db, "planning.finished", "plan", plan_id, {"routeCount": len(routes), "solver": solver})
                write_db(db)
                return send_json(
                    self,
                    HTTPStatus.ACCEPTED,
                    {
                        "planningJobId": plan_id,
                        "status": "finished",
                        "solver": solver,
                        "note": solver_note,
                        "routeIds": [route["id"] for route in routes],
                        "orderIds": order_ids,
                        "unassignedJobIds": unassigned_job_ids,
                    },
                )

            if path == "/planning/optimize-draft":
                hub_id = body.get("hubId")
                plan_date = body.get("planDate")
                shift_ids = body.get("driverShiftIds")
                rows = body.get("rows")
                if not hub_id or not plan_date or not isinstance(shift_ids, list) or not isinstance(rows, list):
                    return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", "hubId, planDate, driverShiftIds[] and rows[] are required")

                db = read_db()
                auth = require_auth(self, db, ("ops_user",))
                if not auth:
                    return
                start_time = body.get("startTime") or (body.get("optimizerSetup") or {}).get("startTime")
                end_time = body.get("endTime") or (body.get("optimizerSetup") or {}).get("endTime")
                shifts = [
                    override_shift_operating_window(materialize_shift_for_plan_date(shift, plan_date), plan_date, start_time, end_time)
                    for shift in scoped_items(db["shifts"], auth, "shifts")
                    if shift["id"] in shift_ids
                ]
                vehicle_types = [
                    vehicle_type
                    for vehicle_type in scoped_items(db["vehicleTypes"], auth, "vehicleTypes")
                    if any(shift.get("vehicleTypeId") == vehicle_type.get("id") for shift in shifts)
                ]
                if not shifts:
                    return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", "No shifts found for driverShiftIds")
                if not vehicle_types:
                    return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", "No vehicle types found for the selected shifts")

                optimizer_setup = deepcopy(body.get("optimizerSetup") or {})
                draft_source = str(body.get("source") or "csv").strip() or "csv"
                orders, draft_errors = build_orders_from_vrp_draft_rows(
                    db,
                    rows,
                    plan_date,
                    hub_id,
                    optimizer_setup,
                    "VRP Selected Orders" if draft_source == "orders" else "VRP CSV Import",
                )
                if draft_errors:
                    return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", "; ".join(draft_errors[:8]))
                if not orders:
                    return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", "No operational drops were created from the imported data")
                for order in orders:
                    order["tenantId"] = auth["tenantId"]
                    order["companyId"] = auth["companyId"]

                coordinates_changed = False
                unresolved_locations: list[str] = []
                for order in orders:
                    coordinates_changed = enrich_order_coordinates(order) or coordinates_changed
                    if order.get("kind") in {"pickup_delivery", "return"} and not has_coordinates(order.get("pickupAddress")):
                        unresolved_locations.append(f"{order.get('reference', order['id'])}:pickup")
                    if not has_coordinates(order.get("dropoffAddress")):
                        unresolved_locations.append(f"{order.get('reference', order['id'])}:dropoff")

                if unresolved_locations:
                    return json_error(
                        self,
                        HTTPStatus.BAD_REQUEST,
                        "bad_request",
                        "Coordinates are still missing after geocoding for "
                        + ", ".join(unresolved_locations[:5])
                        + ("..." if len(unresolved_locations) > 5 else ""),
                    )

                plan_id = create_id("plan")
                requested_solver = body.get("solver") or RUNTIME_CONFIG.get("planning_solver", "auto")
                solver = (
                    "graphhopper"
                    if requested_solver == "graphhopper"
                    else "python_mock"
                    if requested_solver == "mock"
                    else "graphhopper"
                    if RUNTIME_CONFIG.get("graphhopper_api_key")
                    else "python_mock"
                )
                objective_preset = body.get("objectivePreset", "balanced")
                solver_note = None
                unassigned_job_ids: list[str] = []

                try:
                    if solver == "graphhopper":
                        problem, common_pickup = build_graphhopper_problem(orders, shifts, vehicle_types, objective_preset)
                        graphhopper_result = graphhopper_request("/vrp", problem)
                        solution = graphhopper_result["data"]
                        routes = hydrate_graphhopper_routes(plan_id, solution, shifts, orders, common_pickup=common_pickup)
                        raw_unassigned = (solution.get("solution", {}) or {}).get("unassigned", {}) if isinstance(solution, dict) else {}
                        if isinstance(raw_unassigned, dict):
                            unassigned_job_ids = [
                                str(job_id)
                                for job_id in [
                                    *(raw_unassigned.get("services") or []),
                                    *(raw_unassigned.get("shipments") or []),
                                ]
                                if job_id
                            ]
                        db["graphhopperUsage"] = {
                            **deepcopy(db.get("graphhopperUsage") or {}),
                            **graphhopper_result["usage"],
                        }
                    else:
                        routes = build_mock_routes(plan_id, orders, shifts)
                except Exception as error:
                    message = str(error)
                    if solver == "graphhopper" and "Too many vehicles for Route Optimization API" in message:
                        solver = "python_mock"
                        solver_note = "GraphHopper allows 1 vehicle on the current plan. Naaval local planner was used instead."
                        routes = build_mock_routes(plan_id, orders, shifts)
                    elif solver == "graphhopper" and "Too many locations for Route Optimization API" in message:
                        solver = "python_mock"
                        solver_note = "GraphHopper location limit was reached on the current plan. Naaval local planner was used instead."
                        routes = build_mock_routes(plan_id, orders, shifts)
                    else:
                        return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", message)

                existing_order_ids = {item["id"] for item in db["orders"]}
                persisted_order_ids = []
                for order in orders:
                    persisted_order_ids.append(order["id"])
                    if order["id"] in existing_order_ids:
                        db["orders"] = [order if item["id"] == order["id"] else item for item in db["orders"]]
                    else:
                        db["orders"].append(order)

                job = {
                    "id": plan_id,
                    "tenantId": auth["tenantId"],
                    "companyId": auth["companyId"],
                    "hubId": hub_id,
                    "planDate": plan_date,
                    "orderIds": persisted_order_ids,
                    "driverShiftIds": shift_ids,
                    "objectivePreset": objective_preset,
                    "solver": solver,
                    "solverNote": solver_note,
                    "status": "finished",
                    "routeIds": [route["id"] for route in routes],
                    "unassignedJobIds": unassigned_job_ids,
                    "optimizerSetup": optimizer_setup,
                    "draftSource": draft_source,
                    "createdAt": now_iso(),
                    "updatedAt": now_iso(),
                    "completedAt": now_iso(),
                }
                db["planningJobs"].insert(0, job)
                db["routes"] = [route for route in db["routes"] if route.get("planId") != plan_id] + routes
                for order in db["orders"]:
                    if order["id"] in persisted_order_ids and order.get("status") not in {"completed", "in_progress"}:
                        order["status"] = "planned"
                        order["updatedAt"] = now_iso()
                append_event(db, "planning.finished", "plan", plan_id, {"routeCount": len(routes), "solver": solver, "draftSource": draft_source})
                write_db(db)
                return send_json(
                    self,
                    HTTPStatus.ACCEPTED,
                    {
                        "planningJobId": plan_id,
                        "status": "finished",
                        "solver": solver,
                        "note": solver_note,
                        "routeIds": [route["id"] for route in routes],
                        "orderIds": persisted_order_ids,
                        "unassignedJobIds": unassigned_job_ids,
                    },
                )

            if path.startswith("/routes/") and path.endswith("/dispatch"):
                route_id = path.split("/")[2]
                db = read_db()
                auth = require_auth(self, db, ("ops_user",))
                if not auth:
                    return
                route = find_route(db, route_id)
                if not route or not entity_belongs_to_auth(route, auth):
                    return json_error(self, HTTPStatus.NOT_FOUND, "not_found", "Route not found")
                driver_id = body.get("driverId") or route.get("driverId")
                if not driver_id:
                    return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", "driverId is required to dispatch the route")
                driver = next((item for item in db["drivers"] if item["id"] == driver_id), None)
                if not driver or not entity_belongs_to_auth(driver, auth):
                    return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", "driverId must belong to your company")
                route["driverId"] = driver_id
                route["status"] = "dispatched"
                route["dispatchedAt"] = now_iso()
                route["updatedAt"] = now_iso()
                for stop in route.get("stops", []):
                    for order_id in stop_order_ids(stop):
                        order = next((item for item in db["orders"] if item["id"] == order_id), None)
                        if order:
                            order["status"] = "dispatched"
                            order["updatedAt"] = now_iso()
                append_event(db, "route.dispatched", "route", route["id"], {"driverId": driver_id})
                write_db(db)
                return send_json(self, HTTPStatus.OK, route)

            if path == "/carrier/check-ins":
                required = ["driverId", "routeId", "latitude", "longitude"]
                if any(body.get(field) is None for field in required):
                    return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", "driverId, routeId, latitude and longitude are required")
                db = read_db()
                route = find_route(db, body["routeId"])
                heartbeat = {
                    "id": create_id("hb"),
                    "tenantId": route.get("tenantId") if route else None,
                    "companyId": route.get("companyId") if route else None,
                    "driverId": body["driverId"],
                    "routeId": body["routeId"],
                    "latitude": body["latitude"],
                    "longitude": body["longitude"],
                    "occurredAt": body.get("occurredAt", now_iso()),
                }
                db["heartbeats"].insert(0, heartbeat)
                if route:
                    route["lastKnownPosition"] = {"lat": heartbeat["latitude"], "lon": heartbeat["longitude"]}
                    route["lastHeartbeatAt"] = heartbeat["occurredAt"]
                    if body.get("locationLabel"):
                        route["lastKnownPositionLabel"] = body.get("locationLabel")
                    apply_live_position_to_route_orders(
                        db,
                        route,
                        heartbeat["latitude"],
                        heartbeat["longitude"],
                        heartbeat["occurredAt"],
                        body.get("locationLabel"),
                    )
                append_event(db, "carrier.heartbeat", "route", heartbeat["routeId"], heartbeat)
                write_db(db)
                return send_json(self, HTTPStatus.ACCEPTED, heartbeat)

            if path.startswith("/carrier/routes/") and path.endswith("/start"):
                route_id = path.split("/")[3]
                db = read_db()
                route = find_route(db, route_id)
                if not route:
                    return json_error(self, HTTPStatus.NOT_FOUND, "not_found", "Route not found")
                route["status"] = "in_progress"
                route["startedAt"] = body.get("startedAt", now_iso())
                route["updatedAt"] = now_iso()
                first_pending_stop = next((stop for stop in route.get("stops", []) if stop.get("status") == "pending"), None)
                if first_pending_stop:
                    for order_id in stop_order_ids(first_pending_stop):
                        order = next((item for item in db["orders"] if item["id"] == order_id), None)
                        if order and order.get("status") not in {"completed", "failed", "cancelled"}:
                            if first_pending_stop.get("kind") == "pickup":
                                update_order_execution(order, status="en_route_pickup", status_message="Driver en route to pickup")
                            else:
                                update_order_execution(order, status="in_progress", status_message="Driver en route to delivery")
                append_event(db, "carrier.route_started", "route", route_id, {"driverId": route.get("driverId")})
                write_db(db)
                return send_json(self, HTTPStatus.OK, build_carrier_view(db, route))

            if path.startswith("/carrier/stops/") and path.endswith("/status"):
                stop_id = path.split("/")[3]
                status = body.get("status")
                if status not in {"pending", "arrived", "served", "failed", "skipped"}:
                    return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", "status must be one of pending, arrived, served, failed, skipped")
                db = read_db()
                found = find_stop(db, stop_id)
                if not found:
                    return json_error(self, HTTPStatus.NOT_FOUND, "not_found", "Stop not found")
                route, stop = found
                stop["status"] = status
                stop["note"] = body.get("note")
                stop["updatedAt"] = now_iso()
                for order_id in stop_order_ids(stop):
                    order = next((item for item in db["orders"] if item["id"] == order_id), None)
                    if order:
                        update_order_from_stop_event(order, stop, status, body.get("note"))
                update_route_lifecycle(route)
                append_event(db, "stop.status_changed", "stop", stop["id"], {"routeId": route["id"], "status": status})
                write_db(db)
                return send_json(self, HTTPStatus.OK, {"route": route, "stop": stop})

            if path.startswith("/carrier/stops/") and path.endswith("/proof"):
                stop_id = path.split("/")[3]
                if not body.get("deliveredAt"):
                    return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", "deliveredAt is required")
                db = read_db()
                found = find_stop(db, stop_id)
                if not found:
                    return json_error(self, HTTPStatus.NOT_FOUND, "not_found", "Stop not found")
                route, stop = found
                proof_outcome_code = body.get("proofOutcomeCode") or infer_default_proof_outcome(stop.get("kind"), body.get("failureReasonCode"))
                try:
                    proof_outcome_code = validate_proof_outcome(stop.get("kind"), proof_outcome_code)
                except ValueError as error:
                    return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", str(error))

                photo_urls = body.get("photoUrls", [])
                note = (body.get("note") or "").strip() or None
                failure_reason_code = body.get("failureReasonCode")

                if is_refused_proof_outcome(proof_outcome_code):
                    if not photo_urls:
                        return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", "A refusal requires at least one photo")
                    if not note:
                        return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", "A refusal requires a comment")

                if proof_outcome_code in FAILED_PROOF_OUTCOMES and not note:
                    return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", "A failed pickup or delivery requires a reason in comment")

                proof = {
                    "id": create_id("pod"),
                    "tenantId": route.get("tenantId"),
                    "companyId": route.get("companyId"),
                    "stopId": stop["id"],
                    "routeId": route["id"],
                    "orderId": stop_order_ids(stop)[0] if stop_order_ids(stop) else stop.get("orderId"),
                    "orderIds": stop_order_ids(stop),
                    "deliveredAt": body["deliveredAt"],
                    "recipientName": body.get("recipientName"),
                    "otpCode": body.get("otpCode"),
                    "signatureImageUrl": body.get("signatureImageUrl"),
                    "photoUrls": photo_urls,
                    "latitude": body.get("latitude"),
                    "longitude": body.get("longitude"),
                    "locationLabel": body.get("locationLabel"),
                    "failureReasonCode": failure_reason_code,
                    "failureReasonLabel": label_for_reason_code(failure_reason_code),
                    "proofOutcomeCode": proof_outcome_code,
                    "proofOutcomeLabel": label_for_proof_outcome(proof_outcome_code),
                    "note": note,
                    "createdAt": now_iso(),
                }
                db["proofs"].insert(0, proof)
                stop["status"] = "served" if is_success_proof_outcome(proof_outcome_code) else "failed"
                stop["proofId"] = proof["id"]
                stop["proofOutcomeCode"] = proof_outcome_code
                stop["proofOutcomeLabel"] = proof["proofOutcomeLabel"]
                stop["reasonCode"] = failure_reason_code
                stop["reasonLabel"] = proof["failureReasonLabel"]
                stop["note"] = note
                stop["updatedAt"] = now_iso()
                if proof.get("latitude") is not None and proof.get("longitude") is not None:
                    route["lastKnownPosition"] = {"lat": proof["latitude"], "lon": proof["longitude"]}
                    route["lastHeartbeatAt"] = proof["deliveredAt"]
                    if proof.get("locationLabel"):
                        route["lastKnownPositionLabel"] = proof["locationLabel"]
                    apply_live_position_to_route_orders(
                        db,
                        route,
                        proof["latitude"],
                        proof["longitude"],
                        proof["deliveredAt"],
                        proof.get("locationLabel"),
                    )
                for order_id in stop_order_ids(stop):
                    order = next((item for item in db["orders"] if item["id"] == order_id), None)
                    if order:
                        update_order_execution(
                            order,
                            status=proof_outcome_code,
                            status_message=proof["proofOutcomeLabel"],
                            reason_code=failure_reason_code,
                            reason_note=note,
                            proof=proof,
                        )
                        apply_live_position_to_order(
                            order,
                            proof.get("latitude"),
                            proof.get("longitude"),
                            proof.get("deliveredAt"),
                            proof.get("locationLabel"),
                        )
                update_route_lifecycle(route)
                append_event(db, "proof.submitted", "proof", proof["id"], {"routeId": route["id"], "stopId": stop["id"]})
                write_db(db)
                return send_json(self, HTTPStatus.CREATED, proof)

            return json_error(self, HTTPStatus.NOT_FOUND, "not_found", "Resource not found")
        except ValueError as error:
            return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", str(error))
        except Exception as error:  # pragma: no cover - defensive path
            return json_error(self, HTTPStatus.INTERNAL_SERVER_ERROR, "internal_error", str(error))

    def do_PATCH(self) -> None:
        path = request_path(self)
        try:
            body = parse_json_body(self)
        except json.JSONDecodeError:
            return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", "Invalid JSON body")

        try:
            if path == "/pricing/config":
                if not isinstance(body, dict):
                    return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", "pricing config payload must be an object")
                db = read_db()
                auth = require_auth(self, db, ("ops_user",))
                if not auth:
                    return
                tenant_id = resolve_target_tenant_id(auth, body, default_for_platform=PLATFORM_TENANT_ID)
                config_payload = deepcopy(body)
                config_payload.pop("tenantId", None)
                config_payload.pop("companyId", None)
                config_payload.pop("applyGlobally", None)
                if is_platform_admin_auth(auth) and bool(body.get("applyGlobally")):
                    db["pricingConfig"] = deepcopy(config_payload)
                db["tenantPricingConfigs"][tenant_id] = deepcopy(config_payload)
                append_event(db, "pricing.config_updated", "pricing", tenant_id, {"updatedAt": now_iso(), "tenantId": tenant_id})
                write_db(db)
                return send_json(self, HTTPStatus.OK, {"config": deepcopy(db["tenantPricingConfigs"][tenant_id]), "tenantId": tenant_id})

            if path.startswith("/orders/") and path.endswith("/assignment"):
                order_id = path.split("/")[2]
                driver_id = body.get("driverId")
                if not driver_id:
                    return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", "driverId is required")
                db = read_db()
                auth = require_auth(self, db, ("ops_user",))
                if not auth:
                    return
                order = next((item for item in db["orders"] if item["id"] == order_id), None)
                driver = next((item for item in db["drivers"] if item["id"] == driver_id), None)
                if not order or not entity_belongs_to_auth(order, auth):
                    return json_error(self, HTTPStatus.NOT_FOUND, "not_found", "Order not found")
                if not driver or not entity_belongs_to_auth(driver, auth):
                    return json_error(self, HTTPStatus.NOT_FOUND, "not_found", "Driver not found")
                try:
                    order, route = assign_order_to_driver(db, order_id, driver_id)
                except LookupError as error:
                    return json_error(self, HTTPStatus.NOT_FOUND, "not_found", str(error))
                write_db(db)
                return send_json(self, HTTPStatus.OK, {"order": order, "route": route})

            if path.startswith("/orders/"):
                order_id = path.split("/")[2]
                db = read_db()
                auth = require_auth(self, db, ("ops_user",))
                if not auth:
                    return
                order_index = next((index for index, item in enumerate(db["orders"]) if item["id"] == order_id), None)
                if order_index is None:
                    return json_error(self, HTTPStatus.NOT_FOUND, "not_found", "Order not found")
                if not entity_belongs_to_auth(db["orders"][order_index], auth):
                    return json_error(self, HTTPStatus.NOT_FOUND, "not_found", "Order not found")

                existing_order = deepcopy(db["orders"][order_index])
                merged_order = deepcopy(existing_order)
                merged_order.update(deepcopy(body))
                merged_order["id"] = order_id
                merged_order["tenantId"] = existing_order.get("tenantId")
                merged_order["companyId"] = existing_order.get("companyId")
                normalized_order = normalize_order_input(merged_order)
                normalized_order["createdAt"] = existing_order.get("createdAt", normalized_order.get("createdAt"))
                normalized_order["updatedAt"] = now_iso()
                db["orders"][order_index] = normalized_order
                append_event(db, "order.updated", "order", order_id, {"updatedAt": normalized_order["updatedAt"]})
                write_db(db)
                return send_json(self, HTTPStatus.OK, normalized_order)

            if path.startswith("/customers/"):
                customer_id = path.split("/")[2]
                db = read_db()
                auth = require_auth(self, db, ("ops_user",))
                if not auth:
                    return
                customer = next((item for item in db["customers"] if item["id"] == customer_id), None)
                if customer is None:
                    return json_error(self, HTTPStatus.NOT_FOUND, "not_found", "Customer not found")
                if not entity_belongs_to_auth(customer, auth):
                    return json_error(self, HTTPStatus.NOT_FOUND, "not_found", "Customer not found")
                customer.update(deepcopy(body))
                customer["id"] = customer_id
                customer["tenantId"] = customer.get("tenantId") or auth["tenantId"]
                customer["companyId"] = customer.get("companyId") or auth["companyId"]
                customer["updatedAt"] = now_iso()
                append_event(db, "customer.updated", "customer", customer_id, {"updatedAt": customer["updatedAt"]})
                write_db(db)
                return send_json(self, HTTPStatus.OK, customer)

            if path.startswith("/fleet/drivers/"):
                driver_id = path.split("/")[3]
                db = read_db()
                auth = require_auth(self, db, ("ops_user",))
                if not auth:
                    return
                driver = next((item for item in db["drivers"] if item["id"] == driver_id), None)
                if driver is None:
                    return json_error(self, HTTPStatus.NOT_FOUND, "not_found", "Driver not found")
                if not entity_belongs_to_auth(driver, auth):
                    return json_error(self, HTTPStatus.NOT_FOUND, "not_found", "Driver not found")
                driver.update(deepcopy(body))
                driver["id"] = driver_id
                driver["tenantId"] = driver.get("tenantId") or auth["tenantId"]
                driver["companyId"] = driver.get("companyId") or auth["companyId"]
                driver["updatedAt"] = now_iso()
                append_event(db, "driver.updated", "driver", driver_id, {"updatedAt": driver["updatedAt"]})
                write_db(db)
                return send_json(self, HTTPStatus.OK, driver)

            if path.startswith("/admin/tenants/"):
                tenant_id = path.split("/")[3]
                db = read_db()
                auth = require_auth(self, db, ("ops_user",))
                if not auth:
                    return
                if not ensure_platform_admin_access(self, auth):
                    return
                tenant = find_tenant(db, tenant_id)
                if not tenant:
                    return json_error(self, HTTPStatus.NOT_FOUND, "not_found", "Tenant not found")
                if tenant_id == PLATFORM_TENANT_ID:
                    return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", "The internal Naaval tenant cannot be modified from this endpoint")

                if body.get("companyName") is not None:
                    tenant["companyName"] = str(body.get("companyName") or tenant.get("companyName") or "").strip() or tenant.get("companyName")
                if body.get("displayName") is not None:
                    tenant["displayName"] = str(body.get("displayName") or tenant.get("displayName") or "").strip() or tenant.get("displayName")
                if body.get("planId"):
                    tenant["planId"] = str(body.get("planId")).strip() or tenant.get("planId")
                if body.get("status"):
                    tenant["status"] = str(body.get("status")).strip() or tenant.get("status")
                if isinstance(body.get("moduleOverrides"), dict):
                    tenant["moduleOverrides"] = deepcopy(body["moduleOverrides"])
                if isinstance(body.get("algorithmOverrides"), dict):
                    tenant["algorithmOverrides"] = deepcopy(body["algorithmOverrides"])
                if isinstance(body.get("usageOverrides"), dict):
                    tenant["usageOverrides"] = deepcopy(body["usageOverrides"])
                if isinstance(body.get("featureFlags"), dict):
                    tenant["featureFlags"] = deepcopy(body["featureFlags"])
                tenant["updatedAt"] = now_iso()
                append_event(db, "tenant.updated", "tenant", tenant_id, {"updatedAt": tenant["updatedAt"], "planId": tenant.get("planId")})
                write_db(db)
                return send_json(self, HTTPStatus.OK, serialize_tenant_record(db, tenant))

            if path.startswith("/admin/users/"):
                user_id = path.split("/")[3]
                db = read_db()
                auth = require_auth(self, db, ("ops_user",))
                if not auth:
                    return
                if not require_company_admin_access(self, auth):
                    return
                user = next((item for item in db["opsUsers"] if item["id"] == user_id), None)
                if user is None:
                    return json_error(self, HTTPStatus.NOT_FOUND, "not_found", "Ops user not found")
                if not entity_belongs_to_auth(user, auth) and not is_platform_admin_auth(auth):
                    return json_error(self, HTTPStatus.NOT_FOUND, "not_found", "Ops user not found")

                next_email = str(body.get("email", user.get("email", ""))).strip().lower()
                if not next_email:
                    return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", "email is required")
                if any(
                    str(item.get("email", "")).strip().lower() == next_email and item.get("id") != user_id
                    for item in db["opsUsers"]
                ):
                    return json_error(self, HTTPStatus.CONFLICT, "conflict", "An ops user with this email already exists")
                role = sanitize_ops_user_role(self, auth, body.get("role", user.get("role", "company_user")))
                if not role:
                    return

                user["firstName"] = str(body.get("firstName", user.get("firstName", ""))).strip()
                user["lastName"] = str(body.get("lastName", user.get("lastName", ""))).strip()
                user["email"] = next_email
                user["role"] = role
                user["team"] = str(body.get("team", user.get("team", "Operations"))).strip() or "Operations"
                user["temporaryPassword"] = str(body.get("temporaryPassword", user.get("temporaryPassword", "demo"))).strip() or "demo"
                user["status"] = body.get("status", user.get("status", "active"))
                if is_platform_admin_auth(auth):
                    user["tenantId"] = resolve_target_tenant_id(
                        auth,
                        body,
                        default_for_platform=PLATFORM_TENANT_ID if role in {"super_admin", "naaval_admin"} else str(user.get("tenantId") or DEMO_TENANT_ID),
                    )
                    user["companyId"] = user["tenantId"]
                user["updatedAt"] = now_iso()

                if not user["firstName"] or not user["lastName"]:
                    return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", "firstName and lastName are required")

                append_event(db, "ops_user.updated", "ops_user", user_id, {"updatedAt": user["updatedAt"]})
                write_db(db)
                return send_json(self, HTTPStatus.OK, user)

            return json_error(self, HTTPStatus.NOT_FOUND, "not_found", "Resource not found")
        except ValueError as error:
            return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", str(error))
        except Exception as error:  # pragma: no cover - defensive path
            return json_error(self, HTTPStatus.INTERNAL_SERVER_ERROR, "internal_error", str(error))

    def do_DELETE(self) -> None:
        path = request_path(self)

        try:
            if path.startswith("/admin/users/"):
                user_id = path.split("/")[3]
                db = read_db()
                auth = require_auth(self, db, ("ops_user",))
                if not auth:
                    return
                if not require_company_admin_access(self, auth):
                    return
                user = next((item for item in db["opsUsers"] if item["id"] == user_id), None)
                if not user:
                    return json_error(self, HTTPStatus.NOT_FOUND, "not_found", "Ops user not found")
                if not entity_belongs_to_auth(user, auth) and not is_platform_admin_auth(auth):
                    return json_error(self, HTTPStatus.NOT_FOUND, "not_found", "Ops user not found")
                if user.get("id") == auth["actor"].get("id"):
                    return json_error(self, HTTPStatus.BAD_REQUEST, "bad_request", "You cannot delete your own account from this session")
                db["opsUsers"] = [item for item in db["opsUsers"] if item["id"] != user_id]
                append_event(db, "ops_user.deleted", "ops_user", user_id, {"deletedAt": now_iso()})
                write_db(db)
                return send_json(self, HTTPStatus.OK, {"deleted": True, "id": user_id})

            if path.startswith("/recurring-routes/"):
                route_id = path.split("/")[2]
                db = read_db()
                auth = require_auth(self, db, ("ops_user", "customer"))
                if not auth:
                    return
                route = next((item for item in db["recurringRoutes"] if item.get("id") == route_id), None)
                if not route:
                    return json_error(self, HTTPStatus.NOT_FOUND, "not_found", "Recurring route not found")
                if not entity_belongs_to_auth(route, auth):
                    return json_error(self, HTTPStatus.NOT_FOUND, "not_found", "Recurring route not found")
                if auth.get("actorType") == "customer" and str(route.get("customerId") or "") != str(auth["actor"].get("id") or ""):
                    return json_error(self, HTTPStatus.NOT_FOUND, "not_found", "Recurring route not found")
                db["recurringRoutes"] = [item for item in db["recurringRoutes"] if item.get("id") != route_id]
                append_event(db, "recurring_route.deleted", "recurring_route", route_id, {"deletedAt": now_iso()})
                write_db(db)
                return send_json(self, HTTPStatus.OK, {"deleted": True, "id": route_id})

            return json_error(self, HTTPStatus.NOT_FOUND, "not_found", "Resource not found")
        except Exception as error:  # pragma: no cover - defensive path
            return json_error(self, HTTPStatus.INTERNAL_SERVER_ERROR, "internal_error", str(error))

    def serve_static_file(self, static_file: StaticFile) -> None:
        raw = static_file.path.read_bytes()
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", static_file.content_type)
        self.send_header("Content-Length", str(len(raw)))
        suffix = static_file.path.suffix.lower()
        if static_file.path.name == "sw.js":
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
            self.send_header("Service-Worker-Allowed", "/carrier/")
        elif suffix in {".html", ".js", ".css", ".webmanifest"}:
            self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.end_headers()
        self.wfile.write(raw)

    def resolve_static_path(self, path: str) -> StaticFile | None:
        base_dir = MARKETING_FRONTEND_DIR
        relative_path = path.lstrip("/")

        if path == "/ops" or path == "/ops/":
            base_dir = OPS_FRONTEND_DIR
            relative_path = "index.html"
        elif path.startswith("/ops/"):
            base_dir = OPS_FRONTEND_DIR
            relative_path = path.removeprefix("/ops/").lstrip("/")
        elif path == "/portal" or path == "/portal/":
            base_dir = PORTAL_FRONTEND_DIR
            relative_path = "index.html"
        elif path.startswith("/portal/"):
            base_dir = PORTAL_FRONTEND_DIR
            relative_path = path.removeprefix("/portal/").lstrip("/")
        elif path == "/carrier" or path == "/carrier/":
            base_dir = CARRIER_FRONTEND_DIR
            relative_path = "index.html"
        elif path in {"/carrier/install", "/carrier/install/"}:
            base_dir = CARRIER_FRONTEND_DIR
            relative_path = "install.html"
        elif path.startswith("/carrier/"):
            base_dir = CARRIER_FRONTEND_DIR
            relative_path = path.removeprefix("/carrier/").lstrip("/")
        elif path in {"/", ""}:
            relative_path = "index.html"

        candidate = base_dir / relative_path
        if not candidate.exists() or candidate.is_dir():
            return None
        try:
            candidate.resolve().relative_to(base_dir.resolve())
        except ValueError:
            return None
        content_type = mimetypes.guess_type(str(candidate))[0] or "application/octet-stream"
        return StaticFile(candidate, content_type)

    def log_message(self, format: str, *args: Any) -> None:
        print(f"[naaval] {self.address_string()} - {format % args}")


def main() -> None:
    parser = argparse.ArgumentParser(description="Serve the Naaval ops-web prototype and local API.")
    parser.add_argument("--host", default="127.0.0.1", help="Host interface to bind to.")
    parser.add_argument("--port", type=int, default=8787, help="Port to serve on.")
    parser.add_argument("--seed-demo", action="store_true", help="Seed demo data before starting.")
    args = parser.parse_args()

    ensure_db()
    if args.seed_demo:
        write_db(build_demo_db(replace=False))

    server = ThreadingHTTPServer((args.host, args.port), NaavalHandler)
    print(f"Naaval dev server running on http://{args.host}:{args.port}")
    print(f"Ops Frontend: {OPS_FRONTEND_DIR}")
    print(f"Portal Frontend: {PORTAL_FRONTEND_DIR}")
    print(f"Carrier Frontend: {CARRIER_FRONTEND_DIR}")
    print(f"Data file: {DB_PATH}")
    server.serve_forever()


if __name__ == "__main__":
    main()
