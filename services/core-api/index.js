process.env.NAAVAL_DB_PATH = process.env.NAAVAL_DB_PATH || "/tmp/naaval/db.json";

const [{ createApp }, { loadConfig }] = await Promise.all([import("./src/app.js"), import("./src/config.js")]);

const config = loadConfig();
const app = createApp(config);

export default async function handler(request, response) {
  await app.handle(request, response);
}
