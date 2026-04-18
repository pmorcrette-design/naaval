import { appendEvent } from "../lib/events.js";
import { badRequest, readJsonBody, sendJson } from "../lib/http.js";
import { updateDb } from "../lib/store.js";

function createTimeWindow(baseDate, hour, minute, durationHours) {
  const start = new Date(baseDate);
  start.setHours(hour, minute, 0, 0);
  const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);

  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
}

function createShiftTime(baseDate, hour, minute) {
  const value = new Date(baseDate);
  value.setHours(hour, minute, 0, 0);
  return value.toISOString();
}

export function registerDemoRoutes(router) {
  router.post("/dev/seed-demo", async (request, response) => {
    const body = await readJsonBody(request);
    const replace = body.replace === true;
    const baseDate = body.planDate ? new Date(body.planDate) : new Date();

    if (Number.isNaN(baseDate.getTime())) {
      badRequest(response, "planDate must be a valid date");
      return;
    }

    updateDb((db) => {
      if (replace) {
        db.hubs = [];
        db.vehicleTypes = [];
        db.vehicles = [];
        db.carrierCompanies = [];
        db.drivers = [];
        db.opsUsers = [];
        db.customers = [];
        db.quotes = [];
        db.shifts = [];
        db.orders = [];
        db.planningJobs = [];
        db.routes = [];
        db.heartbeats = [];
        db.proofs = [];
        db.events = [];
      }

      db.pricingConfig = db.pricingConfig ?? {
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

      if (db.hubs.some((hub) => hub.id === "hub_paris_central")) {
        return db;
      }

      db.hubs.push({
        id: "hub_paris_central",
        label: "Paris Central Hub",
        city: "Paris",
        address: "12 Rue du Depot, 75011 Paris",
        coordinates: {
          lat: 48.8619,
          lon: 2.3765
        }
      });

      db.vehicleTypes.push(
        {
          id: "vehicletype_van",
          label: "Van",
          vehicleClass: "van",
          routingProfile: "car",
          capacity: {
            parcels: 120,
            weightKg: 600,
            volumeDm3: 6000
          }
        },
        {
          id: "vehicletype_bike",
          label: "Cargo Bike",
          vehicleClass: "bike",
          routingProfile: "bike",
          capacity: {
            parcels: 25,
            weightKg: 80,
            volumeDm3: 900
          }
        }
      );

      db.vehicles.push(
        {
          id: "vehicle_van_1",
          label: "Van 1",
          hubId: "hub_paris_central",
          vehicleTypeId: "vehicletype_van"
        },
        {
          id: "vehicle_bike_1",
          label: "Bike 1",
          hubId: "hub_paris_central",
          vehicleTypeId: "vehicletype_bike"
        }
      );

      db.carrierCompanies.push({
        id: "carrier_naaval_partners",
        name: "Naaval Partners",
        legalName: "Naaval Partners SAS",
        email: "ops@naavalpartners.com",
        phone: "+33100000000"
      });

      db.drivers.push(
        {
          id: "driver_amina",
          name: "Amina Laurent",
          firstName: "Amina",
          lastName: "Laurent",
          email: "amina@naavalpartners.com",
          phone: "+33600000001",
          skills: ["fragile"],
          vehicleType: "van_3m3",
          carrierCompanyId: "carrier_naaval_partners",
          vehiclePhotoUrls: [],
          status: "active"
        },
        {
          id: "driver_noah",
          name: "Noah Bernard",
          firstName: "Noah",
          lastName: "Bernard",
          email: "noah@naavalpartners.com",
          phone: "+33600000002",
          skills: ["cold_chain"],
          vehicleType: "bike",
          carrierCompanyId: "carrier_naaval_partners",
          vehiclePhotoUrls: [],
          status: "active"
        }
      );

      db.opsUsers.push({
        id: "ops_user_pierre",
        firstName: "Pierre",
        lastName: "Ops",
        email: "pierre@naaval.app",
        role: "ops_admin",
        team: "Operations",
        status: "active"
      });

      db.customers.push({
        id: "customer_naaval_retail",
        companyName: "Naaval Retail",
        headquartersAddress: "18 Rue du Commerce, 75015 Paris",
        vatNumber: "FR12345678901",
        companyPhone: "+33199999999",
        companyEmail: "finance@naavalretail.com",
        contactFirstName: "Claire",
        contactLastName: "Martin",
        contactPhone: "+33699999999",
        contactEmail: "claire@naavalretail.com",
        revenueRange: "2m-10m",
        companySize: "mid_market"
      });

      db.shifts.push(
        {
          id: "shift_amina_am",
          driverId: "driver_amina",
          vehicleId: "vehicle_van_1",
          vehicleTypeId: "vehicletype_van",
          startAt: createShiftTime(baseDate, 8, 0),
          endAt: createShiftTime(baseDate, 16, 0),
          startCoordinates: {
            lat: 48.8619,
            lon: 2.3765
          },
          endCoordinates: {
            lat: 48.8619,
            lon: 2.3765
          },
          skills: ["fragile"],
          status: "planned"
        },
        {
          id: "shift_noah_am",
          driverId: "driver_noah",
          vehicleId: "vehicle_bike_1",
          vehicleTypeId: "vehicletype_bike",
          startAt: createShiftTime(baseDate, 8, 30),
          endAt: createShiftTime(baseDate, 15, 30),
          startCoordinates: {
            lat: 48.8619,
            lon: 2.3765
          },
          endCoordinates: {
            lat: 48.8619,
            lon: 2.3765
          },
          skills: ["cold_chain"],
          status: "planned"
        }
      );

      db.orders.push(
        {
          id: "order_demo_1",
          merchantId: "merchant_demo",
          hubId: "hub_paris_central",
          kind: "delivery",
          reference: "SHIPPR-LIKE-001",
          dropoffAddress: {
            label: "Le Marais",
            street1: "18 Rue Vieille du Temple",
            city: "Paris",
            postalCode: "75004",
            countryCode: "FR",
            coordinates: {
              lat: 48.8578,
              lon: 2.3631
            }
          },
          serviceDurationSeconds: 240,
          parcelCount: 3,
          weightKg: 12,
          volumeDm3: 60,
          requiredSkills: [],
          timeWindows: [createTimeWindow(baseDate, 9, 0, 2)],
          priority: 1,
          notes: "Call on arrival",
          status: "ready",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: "order_demo_2",
          merchantId: "merchant_demo",
          hubId: "hub_paris_central",
          kind: "delivery",
          reference: "SHIPPR-LIKE-002",
          dropoffAddress: {
            label: "Bastille",
            street1: "7 Rue de la Roquette",
            city: "Paris",
            postalCode: "75011",
            countryCode: "FR",
            coordinates: {
              lat: 48.8532,
              lon: 2.3714
            }
          },
          serviceDurationSeconds: 300,
          parcelCount: 2,
          weightKg: 8,
          volumeDm3: 35,
          requiredSkills: ["fragile"],
          timeWindows: [createTimeWindow(baseDate, 10, 0, 2)],
          priority: 2,
          notes: "",
          status: "ready",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: "order_demo_3",
          merchantId: "merchant_demo",
          hubId: "hub_paris_central",
          kind: "delivery",
          reference: "SHIPPR-LIKE-003",
          dropoffAddress: {
            label: "Canal Saint-Martin",
            street1: "44 Quai de Jemmapes",
            city: "Paris",
            postalCode: "75010",
            countryCode: "FR",
            coordinates: {
              lat: 48.8722,
              lon: 2.3651
            }
          },
          serviceDurationSeconds: 180,
          parcelCount: 1,
          weightKg: 3,
          volumeDm3: 12,
          requiredSkills: [],
          timeWindows: [createTimeWindow(baseDate, 11, 0, 2)],
          priority: 1,
          notes: "",
          status: "ready",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: "order_demo_4",
          merchantId: "merchant_demo",
          hubId: "hub_paris_central",
          kind: "delivery",
          reference: "SHIPPR-LIKE-004",
          dropoffAddress: {
            label: "Republique",
            street1: "21 Avenue de la Republique",
            city: "Paris",
            postalCode: "75011",
            countryCode: "FR",
            coordinates: {
              lat: 48.8674,
              lon: 2.3639
            }
          },
          serviceDurationSeconds: 240,
          parcelCount: 4,
          weightKg: 18,
          volumeDm3: 90,
          requiredSkills: [],
          timeWindows: [createTimeWindow(baseDate, 13, 0, 2)],
          priority: 1,
          notes: "",
          status: "ready",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: "order_demo_5",
          merchantId: "merchant_demo",
          hubId: "hub_paris_central",
          kind: "delivery",
          reference: "SHIPPR-LIKE-005",
          dropoffAddress: {
            label: "Belleville",
            street1: "53 Rue de Belleville",
            city: "Paris",
            postalCode: "75019",
            countryCode: "FR",
            coordinates: {
              lat: 48.8725,
              lon: 2.3849
            }
          },
          serviceDurationSeconds: 360,
          parcelCount: 2,
          weightKg: 7,
          volumeDm3: 28,
          requiredSkills: ["cold_chain"],
          timeWindows: [createTimeWindow(baseDate, 14, 0, 2)],
          priority: 3,
          notes: "Keep chilled",
          status: "ready",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: "order_demo_6",
          merchantId: "merchant_demo",
          hubId: "hub_paris_central",
          kind: "pickup_delivery",
          reference: "SHIPPR-LIKE-006",
          pickupAddress: {
            label: "Merchant Pickup",
            street1: "9 Rue Oberkampf",
            city: "Paris",
            postalCode: "75011",
            countryCode: "FR",
            coordinates: {
              lat: 48.8654,
              lon: 2.3781
            }
          },
          dropoffAddress: {
            label: "Batignolles",
            street1: "12 Rue des Dames",
            city: "Paris",
            postalCode: "75017",
            countryCode: "FR",
            coordinates: {
              lat: 48.883,
              lon: 2.3232
            }
          },
          serviceDurationSeconds: 300,
          parcelCount: 1,
          weightKg: 5,
          volumeDm3: 18,
          requiredSkills: [],
          timeWindows: [createTimeWindow(baseDate, 12, 0, 3)],
          priority: 2,
          notes: "Pickup then direct drop",
          status: "ready",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      );

      appendEvent(db, {
        type: "demo.seeded",
        entityType: "system",
        entityId: "demo",
        payload: {
          replace,
          planDate: baseDate.toISOString()
        }
      });

      return db;
    });

    sendJson(response, 201, {
      ok: true,
      message: "Demo data seeded",
      hint: "Use POST /planning/optimize next"
    });
  });
}
