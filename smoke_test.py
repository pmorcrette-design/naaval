#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.request


def request_json(method: str, url: str, payload: dict | None = None) -> dict:
    data = None
    headers = {}
    if payload is not None:
        data = json.dumps(payload).encode("utf-8")
        headers["Content-Type"] = "application/json"

    request = urllib.request.Request(url, data=data, headers=headers, method=method)
    with urllib.request.urlopen(request, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


def assert_true(condition: bool, message: str) -> None:
    if not condition:
        raise AssertionError(message)


def main() -> int:
    parser = argparse.ArgumentParser(description="Run a smoke test against the Naaval local server.")
    parser.add_argument("--base-url", default="http://127.0.0.1:8787", help="Base URL of the running Naaval local server.")
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")
    timestamp = int(time.time())
    order_reference = f"NAAV-SMOKE-{timestamp}"
    driver_name = f"Smoke Driver {timestamp}"

    try:
        health = request_json("GET", f"{base_url}/health")
        print(f"[ok] health -> {health['service']} ({health['solver']})")

        seeded = request_json("POST", f"{base_url}/dev/seed-demo", {"replace": False})
        print(f"[ok] seed-demo -> {seeded['message']}")

        pricing_before = request_json("GET", f"{base_url}/pricing/config")
        assert_true("config" in pricing_before, "pricing config payload is missing")
        print("[ok] pricing config fetched")

        drivers_before = request_json("GET", f"{base_url}/fleet/drivers")
        shifts = request_json("GET", f"{base_url}/fleet/shifts")
        orders_before = request_json("GET", f"{base_url}/orders")
        print(f"[info] drivers before: {drivers_before['total']}, shifts: {shifts['total']}, orders before: {orders_before['total']}")

        created_driver = request_json(
            "POST",
            f"{base_url}/fleet/drivers",
            {
                "name": driver_name,
                "phone": "+33699990000",
                "skills": ["fragile"],
            },
        )
        assert_true(created_driver["name"] == driver_name, "driver creation returned an unexpected name")
        print(f"[ok] created driver -> {created_driver['id']}")

        created_order = request_json(
            "POST",
            f"{base_url}/orders",
            {
                "merchantId": "merchant_demo",
                "hubId": "hub_paris_central",
                "kind": "delivery",
                "reference": order_reference,
                "dropoffAddress": {
                    "label": "Smoke Customer",
                    "street1": "25 Rue du Test",
                    "city": "Paris",
                    "postalCode": "75011",
                    "countryCode": "FR",
                    "coordinates": {
                        "lat": 48.8671,
                        "lon": 2.3831,
                    },
                },
                "serviceDurationSeconds": 300,
                "parcelCount": 1,
                "weightKg": 4,
                "volumeDm3": 15,
                "requiredSkills": [],
                "timeWindows": [
                    {
                        "start": "2026-04-10T15:00:00+02:00",
                        "end": "2026-04-10T17:00:00+02:00",
                    }
                ],
                "notes": "Created during automated smoke test",
            },
        )
        assert_true(created_order["reference"] == order_reference, "order creation returned an unexpected reference")
        print(f"[ok] created order -> {created_order['id']}")

        updated_pricing = request_json(
            "POST",
            f"{base_url}/pricing/config",
            {
                **pricing_before["config"],
                "basic": {
                    **pricing_before["config"]["basic"],
                    "distanceRatePerKm": 0.75,
                },
            },
        )
        assert_true(updated_pricing["config"]["basic"]["distanceRatePerKm"] == 0.75, "pricing config update failed")
        print("[ok] pricing config updated")

        orders_after = request_json("GET", f"{base_url}/orders")
        assert_true(any(order["reference"] == order_reference for order in orders_after["items"]), "created order not found in order list")
        print(f"[ok] order list contains {order_reference}")

        assigned = request_json(
            "PATCH",
            f"{base_url}/orders/{created_order['id']}/assignment",
            {"driverId": created_driver["id"]},
        )
        assert_true(assigned["route"]["driverId"] == created_driver["id"], "driver assignment did not update the route")
        print(f"[ok] assigned driver -> {created_driver['id']}")

        ready_order_ids = [
            order["id"]
            for order in orders_after["items"]
            if order.get("status") in {"ready", "planned"}
        ]
        shift_ids = [shift["id"] for shift in shifts["items"]]
        assert_true(len(ready_order_ids) > 0, "no ready orders available for planning")
        assert_true(len(shift_ids) > 0, "no shifts available for planning")

        planning = request_json(
            "POST",
            f"{base_url}/planning/optimize",
            {
                "hubId": "hub_paris_central",
                "planDate": "2026-04-10",
                "orderIds": ready_order_ids,
                "driverShiftIds": shift_ids,
                "solver": "mock",
            },
        )
        plan_id = planning["planningJobId"]
        print(f"[ok] planning -> {plan_id}")

        plan = request_json("GET", f"{base_url}/plans/{plan_id}")
        assert_true(len(plan["routes"]) > 0, "planning returned no routes")
        print(f"[ok] plan routes -> {len(plan['routes'])}")

        ready_route = next((route for route in plan["routes"] if route.get("status") == "ready"), None)
        assert_true(ready_route is not None, "no ready route available to dispatch")

        dispatched = request_json(
            "POST",
            f"{base_url}/routes/{ready_route['id']}/dispatch",
            {"driverId": ready_route["driverId"]},
        )
        assert_true(dispatched["status"] == "dispatched", "route dispatch did not update the route status")
        print(f"[ok] dispatched route -> {dispatched['id']}")

        print("[done] Naaval smoke test completed successfully.")
        return 0
    except (AssertionError, urllib.error.URLError, urllib.error.HTTPError, KeyError, json.JSONDecodeError) as error:
        print(f"[failed] {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
