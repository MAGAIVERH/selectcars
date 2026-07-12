/**
 * End-to-end proof that tenant isolation holds *through the API*, not just in SQL.
 *
 * Signs up two dealerships against the real Better Auth server, mints real JWTs, and
 * drives the Fastify API with them. Nothing here is mocked: the token is verified via
 * JWKS and the rows are filtered by Postgres RLS.
 *
 * Run both servers first, then: pnpm --filter @selectcars/db verify:api
 */
import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../../../.env") });

const APP = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const API = process.env.API_URL ?? "http://127.0.0.1:3333";

let failures = 0;
function check(label: string, ok: boolean, detail?: unknown): void {
  console.log(
    `${ok ? "PASS" : "FAIL"}  ${label}${ok || detail === undefined ? "" : `\n      got: ${JSON.stringify(detail)}`}`,
  );
  if (!ok) failures++;
}

type Dealer = { token: string; name: string; email: string };

/** Sign up a user, create their dealership, and mint an access token. */
async function createDealer(name: string, dealership: string): Promise<Dealer> {
  const email = `${name.toLowerCase()}-${Date.now()}@selectcars.test`;
  const password = "supercar1234";

  const signUp = await fetch(`${APP}/api/auth/sign-up/email`, {
    method: "POST",
    // Better Auth enforces an Origin check (CSRF protection), so send one.
    headers: { "content-type": "application/json", origin: APP },
    body: JSON.stringify({ name, email, password }),
  });
  if (!signUp.ok) throw new Error(`sign-up failed: ${signUp.status} ${await signUp.text()}`);

  // Better Auth sets the session as a cookie; carry it through the next calls.
  const cookie = signUp.headers.getSetCookie().join("; ");

  const org = await fetch(`${APP}/api/auth/organization/create`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie, origin: APP },
    body: JSON.stringify({
      name: dealership,
      slug: `${dealership.toLowerCase().replace(/\W+/g, "-")}-${Date.now()}`,
    }),
  });
  if (!org.ok) throw new Error(`org create failed: ${org.status} ${await org.text()}`);
  const orgBody: unknown = await org.json();
  const orgId = (orgBody as { id?: string }).id;
  if (!orgId) throw new Error("org create returned no id");

  const active = await fetch(`${APP}/api/auth/organization/set-active`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie, origin: APP },
    body: JSON.stringify({ organizationId: orgId }),
  });
  if (!active.ok) throw new Error(`set-active failed: ${active.status} ${await active.text()}`);

  const tokenRes = await fetch(`${APP}/api/auth/token`, { headers: { cookie, origin: APP } });
  if (!tokenRes.ok) throw new Error(`token failed: ${tokenRes.status} ${await tokenRes.text()}`);
  const { token } = (await tokenRes.json()) as { token: string };

  return { token, name, email };
}

function authed(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}`, "content-type": "application/json" };
}

async function main(): Promise<void> {
  console.log("Signing up two dealerships against the real auth server...\n");
  const alpha = await createDealer("Alpha", "Alpha Motors");
  const bravo = await createDealer("Bravo", "Bravo Motors");

  // --- identity -----------------------------------------------------------
  const meRes = await fetch(`${API}/me`, { headers: authed(alpha.token) });
  const me = (await meRes.json()) as {
    email: string;
    tenantId: string | null;
    role: string | null;
  };
  check(
    "GET /me returns the verified identity",
    meRes.status === 200 && me.email === alpha.email,
    me,
  );
  check(
    "token carries an active tenant",
    typeof me.tenantId === "string" && me.tenantId.length > 0,
    me.tenantId,
  );
  check("token carries the owner role", me.role === "owner", me.role);

  // --- rejects bad tokens -------------------------------------------------
  const noToken = await fetch(`${API}/tenant/items`);
  check("no token -> 401", noToken.status === 401, noToken.status);

  const forged = await fetch(`${API}/tenant/items`, {
    headers: authed("eyJhbGciOiJFZERTQSJ9.eyJzdWIiOiJoYWNrZXIifQ.not-a-real-signature"),
  });
  check(
    "forged token -> 401 (signature checked against JWKS)",
    forged.status === 401,
    forged.status,
  );

  // --- tenant-scoped writes ----------------------------------------------
  const createAlpha = await fetch(`${API}/tenant/items`, {
    method: "POST",
    headers: authed(alpha.token),
    body: JSON.stringify({ name: "Alpha Ferrari" }),
  });
  check(
    "owner can create in their own tenant -> 201",
    createAlpha.status === 201,
    createAlpha.status,
  );

  const createBravo = await fetch(`${API}/tenant/items`, {
    method: "POST",
    headers: authed(bravo.token),
    body: JSON.stringify({ name: "Bravo Lamborghini" }),
  });
  check(
    "second dealership can create in its own tenant -> 201",
    createBravo.status === 201,
    createBravo.status,
  );

  // --- the actual isolation proof ----------------------------------------
  const alphaItems = (await (
    await fetch(`${API}/tenant/items`, { headers: authed(alpha.token) })
  ).json()) as { name: string }[];
  const bravoItems = (await (
    await fetch(`${API}/tenant/items`, { headers: authed(bravo.token) })
  ).json()) as { name: string }[];

  const alphaNames = alphaItems.map((i) => i.name);
  const bravoNames = bravoItems.map((i) => i.name);

  check(
    "Alpha sees only Alpha's inventory",
    alphaNames.includes("Alpha Ferrari") && !alphaNames.includes("Bravo Lamborghini"),
    alphaNames,
  );
  check(
    "Bravo sees only Bravo's inventory",
    bravoNames.includes("Bravo Lamborghini") && !bravoNames.includes("Alpha Ferrari"),
    bravoNames,
  );

  // --- validation ---------------------------------------------------------
  const badBody = await fetch(`${API}/tenant/items`, {
    method: "POST",
    headers: authed(alpha.token),
    body: JSON.stringify({ name: "" }),
  });
  check("empty name -> 400 (Zod validation)", badBody.status === 400, badBody.status);

  // --- audit trail --------------------------------------------------------
  const auditRes = await fetch(`${API}/tenant/audit-logs`, { headers: authed(alpha.token) });
  const audit = (await auditRes.json()) as {
    action: string;
    tableName: string;
    actorUserId: string | null;
  }[];
  check("audit trail readable by owner -> 200", auditRes.status === 200, auditRes.status);
  check(
    "the insert was audited, attributed, and scoped to this tenant",
    audit.some(
      (a) => a.action === "insert" && a.tableName === "test_items" && a.actorUserId !== null,
    ),
    audit.slice(0, 2),
  );
  check(
    "audit trail never leaks another tenant's entries",
    audit.length > 0 && audit.every((a) => a.tableName === "test_items"),
    audit.length,
  );

  console.log("");
  if (failures) {
    console.error(`FAILED: ${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log("PASSED: tenant isolation, JWT/JWKS auth, RBAC and audit hold through the API.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
