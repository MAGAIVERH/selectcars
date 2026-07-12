import { buildApp } from "./app";
import { env } from "./env";

const app = buildApp();

app
  .listen({ port: env.API_PORT, host: env.API_HOST })
  .then((address) => {
    app.log.info(`SELECTCARS API listening on ${address}`);
  })
  .catch((err) => {
    app.log.error(err);
    process.exit(1);
  });
