import type { FastifyInstance } from "fastify";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { healthStatusSchema, readyStatusSchema } from "@selectcars/shared";
import { getPool } from "@selectcars/db";

/**
 * Liveness (`/health`) and readiness (`/ready`) probes. Responses are validated and
 * serialized through the shared Zod contracts, so the API and its clients cannot drift.
 */
export async function healthRoutes(app: FastifyInstance): Promise<void> {
  const r = app.withTypeProvider<ZodTypeProvider>();

  r.get("/health", { schema: { response: { 200: healthStatusSchema } } }, async () => ({
    status: "ok" as const,
    service: "selectcars-api",
    uptimeSeconds: Math.round(process.uptime()),
  }));

  r.get(
    "/ready",
    { schema: { response: { 200: readyStatusSchema, 503: readyStatusSchema } } },
    async (_request, reply) => {
      let database: "up" | "down" = "up";
      try {
        await getPool().query("select 1");
      } catch (err) {
        database = "down";
        app.log.error({ err }, "readiness database check failed");
      }

      const ready = database === "up";
      reply.code(ready ? 200 : 503);
      return { status: ready ? ("ready" as const) : ("degraded" as const), checks: { database } };
    },
  );
}
