import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(currentDir, "../../data");
const dbPath = path.join(dataDir, "db.json");

function createDefaultPricingConfig() {
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

function createEmptyDb() {
  return {
    hubs: [],
    vehicleTypes: [],
    vehicles: [],
    carrierCompanies: [],
    drivers: [],
    opsUsers: [],
    shifts: [],
    customers: [],
    quotes: [],
    orders: [],
    planningJobs: [],
    routes: [],
    heartbeats: [],
    proofs: [],
    events: [],
    pricingConfig: createDefaultPricingConfig()
  };
}

function ensureDbFile() {
  fs.mkdirSync(dataDir, { recursive: true });

  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify(createEmptyDb(), null, 2));
  }
}

export function readDb() {
  ensureDbFile();
  const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
  const baseline = createEmptyDb();
  for (const [key, value] of Object.entries(baseline)) {
    if (!(key in db)) {
      db[key] = value;
    }
  }
  if (!db.pricingConfig) {
    db.pricingConfig = createDefaultPricingConfig();
  }
  return db;
}

export function writeDb(db) {
  ensureDbFile();
  const temporaryPath = `${dbPath}.tmp`;
  fs.writeFileSync(temporaryPath, JSON.stringify(db, null, 2));
  fs.renameSync(temporaryPath, dbPath);
}

export function updateDb(mutator) {
  const db = readDb();
  const nextDb = mutator(db) ?? db;
  writeDb(nextDb);
  return nextDb;
}

export function resolveDbPath() {
  ensureDbFile();
  return dbPath;
}
