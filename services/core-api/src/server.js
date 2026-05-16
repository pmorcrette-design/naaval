import http from "node:http";
import { createApp } from "./app.js";
import { loadConfig } from "./config.js";

const config = loadConfig();
const app = createApp(config);

const server = http.createServer(async (request, response) => {
  await app.handle(request, response);
});

server.listen(config.port, config.host, () => {
  console.log(`core-api listening on http://${config.host}:${config.port}`);
});
