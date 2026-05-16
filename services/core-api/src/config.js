import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(currentDir, "../../..");
const envPaths = [path.join(rootDir, ".env.local"), path.join(rootDir, ".env")];

function loadLocalEnv() {
  const values = {};

  for (const envPath of envPaths) {
    if (!fs.existsSync(envPath)) {
      continue;
    }

    for (const rawLine of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#") || !line.includes("=")) {
        continue;
      }

      const [key, ...rest] = line.split("=");
      const value = rest.join("=").trim().replace(/^['"]|['"]$/g, "");
      values[key.trim()] = value;
    }
  }

  return values;
}

export function loadConfig() {
  const localEnv = loadLocalEnv();
  const getValue = (key, fallback = "") => process.env[key] ?? localEnv[key] ?? fallback;

  return {
    host: getValue("HOST", "0.0.0.0"),
    port: Number.parseInt(getValue("PORT", "3001"), 10),
    nodeEnv: getValue("NODE_ENV", "development"),
    graphhopperApiKey: getValue("GRAPHHOPPER_API_KEY", ""),
    graphhopperBaseUrl: getValue("GRAPHHOPPER_BASE_URL", "https://graphhopper.com/api/1"),
    defaultSolver: getValue("PLANNING_SOLVER", "auto"),
    authSecret:
      getValue("NAAVAL_AUTH_SECRET", "") ||
      getValue("NAAVAL_GOOGLE_CLIENT_SECRET", "") ||
      getValue("GRAPHHOPPER_API_KEY", "") ||
      getValue("NAAVAL_GOOGLE_CLIENT_ID", "") ||
      "naaval-demo-auth-secret",
    googleClientId: getValue("NAAVAL_GOOGLE_CLIENT_ID", ""),
    googleClientSecret: getValue("NAAVAL_GOOGLE_CLIENT_SECRET", "")
  };
}
