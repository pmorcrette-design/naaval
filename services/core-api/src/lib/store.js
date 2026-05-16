import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createDefaultPricingConfig, createEmptyDb, normalizeDb } from "./saas.js";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const configuredDbPath = process.env.NAAVAL_DB_PATH ? path.resolve(process.env.NAAVAL_DB_PATH) : null;
const dataDir = configuredDbPath ? path.dirname(configuredDbPath) : path.resolve(currentDir, "../../data");
const dbPath = configuredDbPath ?? path.join(dataDir, "db.json");

function ensureDbFile() {
  fs.mkdirSync(dataDir, { recursive: true });

  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify(createEmptyDb(), null, 2));
  }
}

export function readDb() {
  ensureDbFile();
  const raw = fs.readFileSync(dbPath, "utf8").trim();
  const db = raw ? JSON.parse(raw) : createEmptyDb();
  return normalizeDb(db);
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
