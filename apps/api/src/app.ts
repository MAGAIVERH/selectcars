import Fastify, { type FastifyInstance } from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import {
  serializerCompiler,
  validatorCompiler,
  hasZodFastifySchemaValidationErrors,
} from "fastify-type-provider-zod";
import { env } from "./env";
import authPlugin from "./plugins/auth";
import { healthRoutes } from "./routes/health";
import { meRoutes } from "./routes/me";
import { vehicleRoutes } from "./routes/vehicles";

/** Narrow an unknown thrown value to something carrying an HTTP status code. */
function hasStatusCode(error: unknown): error is { statusCode: number } {
  return (
    typeof error === "object" &&
    error !== null &&
    "statusCode" in error &&
    typeof (error as { statusCode: unknown }).statusCode === "number"
  );
}

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
      redact: ["req.headers.authorization", "req.headers.cookie"],
    },
  });

  // Validate requests and serialize responses through Zod schemas.
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  /**
   * Every failure leaves through here, shaped like `apiErrorSchema`. Internal errors are
   * logged in full but answered generically: stack traces and driver messages never
   * reach a client.
   */
  app.setErrorHandler((error, request, reply) => {
    if (hasZodFastifySchemaValidationErrors(error)) {
      reply.code(400).send({
        error: { code: "bad_request", message: "Request failed validation." },
      });
      return;
    }

    const status = hasStatusCode(error) ? error.statusCode : 500;
    if (status >= 500) {
      request.log.error({ err: error }, "unhandled error");
      reply.code(500).send({
        error: { code: "internal", message: "Something went wrong." },
      });
      return;
    }

    reply.code(status).send({
      error: {
        code: "bad_request",
        message: error instanceof Error ? error.message : "Request could not be processed.",
      },
    });
  });

  app.setNotFoundHandler((_request, reply) => {
    reply.code(404).send({
      error: { code: "not_found", message: "Route not found." },
    });
  });

  app.register(cors, { origin: env.APP_ORIGIN, credentials: true });
  app.register(helmet);
  app.register(authPlugin);

  app.register(healthRoutes);
  app.register(meRoutes);
  app.register(vehicleRoutes);

  return app;
}
