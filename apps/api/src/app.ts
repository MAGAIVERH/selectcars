import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { serializerCompiler, validatorCompiler } from "fastify-type-provider-zod";
import { env } from "./env";
import { healthRoutes } from "./routes/health";

/** Build the Fastify instance with plugins, the Zod type provider, and routes. */
export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: {
      level: env.NODE_ENV === "production" ? "info" : "debug",
      transport:
        env.NODE_ENV === "development"
          ? {
              target: "pino-pretty",
              options: { translateTime: "HH:MM:ss", ignore: "pid,hostname" },
            }
          : undefined,
    },
  });

  // Validate requests and serialize responses through Zod schemas.
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.register(cors, { origin: env.APP_ORIGIN, credentials: true });
  app.register(helmet);

  app.register(healthRoutes);

  return app;
}
