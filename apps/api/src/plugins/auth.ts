import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";
import { createRemoteJWKSet, jwtVerify, errors as joseErrors } from "jose";
import {
  accessTokenClaimsSchema,
  type AuthenticatedUser,
  type DealershipRole,
} from "@selectcars/shared";
import { env } from "../env";

declare module "fastify" {
  interface FastifyRequest {
    /** Set by `authenticate`. Absent on public routes. */
    auth?: AuthenticatedUser;
  }
  interface FastifyInstance {
    /** Requires a valid access token. Use as an `onRequest` hook. */
    authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    /** Requires a valid token AND an active tenant, optionally with one of `roles`. */
    requireTenant: (
      roles?: readonly DealershipRole[],
    ) => (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

/**
 * Service-to-service authentication.
 *
 * The marketplace (Better Auth) is the identity issuer: it signs short-lived access
 * tokens with a private key and publishes the public half as a JWKS. This API verifies
 * tokens offline against that JWKS, so it holds no signing secret and cannot mint
 * tokens itself. `createRemoteJWKSet` caches the key set and refetches on key rotation.
 *
 * See docs/adr/002-service-auth-jwt-jwks.md.
 */
const authPlugin: FastifyPluginAsync = async (app) => {
  const jwks = createRemoteJWKSet(new URL(`${env.AUTH_ISSUER_URL}/api/auth/jwks`), {
    cacheMaxAge: 600_000, // 10 min
    cooldownDuration: 30_000, // do not hammer the issuer on unknown `kid`
  });

  app.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      await reply.code(401).send({
        error: { code: "unauthorized", message: "Missing bearer token." },
      });
      return;
    }

    const token = header.slice("Bearer ".length);
    try {
      const { payload } = await jwtVerify(token, jwks, {
        issuer: env.AUTH_ISSUER_URL,
        audience: env.AUTH_ISSUER_URL,
      });

      // The token is authentic, but its shape is still the issuer's promise. Validate it
      // against the shared contract so a claim drift fails loudly here, not deep in a query.
      const claims = accessTokenClaimsSchema.safeParse(payload);
      if (!claims.success) {
        request.log.warn({ issues: claims.error.issues }, "access token claims failed validation");
        await reply.code(401).send({
          error: { code: "unauthorized", message: "Malformed access token." },
        });
        return;
      }

      request.auth = {
        userId: claims.data.sub,
        email: claims.data.email,
        tenantId: claims.data.activeOrganizationId,
        role: claims.data.role,
      };
    } catch (err) {
      const expired = err instanceof joseErrors.JWTExpired;
      request.log.debug({ err }, "access token verification failed");
      await reply.code(401).send({
        error: {
          code: "unauthorized",
          message: expired ? "Access token expired." : "Invalid access token.",
        },
      });
    }
  });

  app.decorate("requireTenant", (roles?: readonly DealershipRole[]) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      await app.authenticate(request, reply);
      if (reply.sent) return;

      const auth = request.auth;
      if (!auth?.tenantId) {
        await reply.code(403).send({
          error: {
            code: "no_active_tenant",
            message: "No active dealership on this session.",
          },
        });
        return;
      }

      if (roles && (!auth.role || !roles.includes(auth.role))) {
        await reply.code(403).send({
          error: {
            code: "forbidden",
            message: "Your role does not allow this action.",
          },
        });
      }
    };
  });
};

// fastify-plugin: decorators must be visible to sibling plugins, not scoped to this one.
export default fp(authPlugin, { name: "auth" });
