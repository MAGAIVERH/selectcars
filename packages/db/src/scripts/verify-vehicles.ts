/**
 * End-to-end proof for the vehicles module.
 *
 * The critical property: the dealer path and the public path are different roles with
 * different privileges. A buyer must never see a draft, a sold car, or another
 * dealership's private inventory, even by asking for it directly.
 *
 * Run both servers first, then: pnpm --filter @selectcars/db verify:vehicles
 */
import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

loadEnv({ path: resolve(dirname(fileURLToPath(import.meta.url)), "../../../../.env") });

import { getPool } from "@selectcars/db";

const APP = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
const API = process.env.API_URL ?? "http://127.0.0.1:3333";

let failures = 0;
function check(label: string, ok: boolean, detail?: unknown): void {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) {
    if (detail !== undefined) console.log(`      got: ${JSON.stringify(detail)}`);
    failures++;
  }
}

type Dealer = { token: string; dealership: string; orgId: string; slug: string };

async function createDealer(name: string, dealership: string): Promise<Dealer> {
  const email = `${name.toLowerCase()}-${Date.now()}@selectcars.test`;
  const headers = { "content-type": "application/json", origin: APP };

  const signUp = await fetch(`${APP}/api/auth/sign-up/email`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name, email, password: "supercar1234" }),
  });
  if (!signUp.ok) throw new Error(`sign-up: ${await signUp.text()}`);
  const cookie = signUp.headers.getSetCookie().join("; ");

  // The dealer profile buyers see is created by a database trigger on this insert, so it
  // exists from here on without the sign-up flow doing anything about it.
  const slug = `${name.toLowerCase()}-${Date.now()}`;
  const org = await fetch(`${APP}/api/auth/organization/create`, {
    method: "POST",
    headers: { ...headers, cookie },
    body: JSON.stringify({ name: dealership, slug }),
  });
  if (!org.ok) throw new Error(`org: ${await org.text()}`);
  const { id } = (await org.json()) as { id: string };

  await fetch(`${APP}/api/auth/organization/set-active`, {
    method: "POST",
    headers: { ...headers, cookie },
    body: JSON.stringify({ organizationId: id }),
  });

  const tokenRes = await fetch(`${APP}/api/auth/token`, { headers: { cookie, origin: APP } });
  const { token } = (await tokenRes.json()) as { token: string };
  return { token, dealership, orgId: id, slug };
}

/**
 * Remove the throwaway dealerships this run created. Without this, their `active` listings
 * linger in the database and show up on the public marketplace, which reads live inventory.
 * The seeded SELECTCARS Showroom is never touched.
 */
async function cleanup(orgIds: string[]): Promise<void> {
  try {
    await getPool().query(`delete from public."organization" where id = any($1::text[])`, [orgIds]);
  } catch (err) {
    console.warn(`cleanup skipped: ${(err as Error).message}`);
  }
}

function authed(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}`, "content-type": "application/json" };
}

/**
 * Headers for a request with no body. Sending `content-type: application/json` without a
 * body makes Fastify reject it (rightly) as a malformed request, and a real client would
 * not do that either.
 */
function authedNoBody(token: string): Record<string, string> {
  return { authorization: `Bearer ${token}` };
}

type VehicleInput = Record<string, unknown>;

async function addVehicle(
  token: string,
  body: VehicleInput,
): Promise<{ status: number; id?: string; slug?: string }> {
  const res = await fetch(`${API}/vehicles`, {
    method: "POST",
    headers: authed(token),
    body: JSON.stringify(body),
  });
  if (res.status !== 201) return { status: res.status };
  const v = (await res.json()) as { id: string; slug: string };
  return { status: res.status, id: v.id, slug: v.slug };
}

async function main(): Promise<void> {
  const alpha = await createDealer("Alpha", "Alpha Motors");
  const bravo = await createDealer("Bravo", "Bravo Motors");

  // --- dealer CRUD --------------------------------------------------------
  const active = await addVehicle(alpha.token, {
    make: "Ferrari",
    model: "296 GTB",
    year: 2024,
    mileage: 1200,
    priceUsd: 389000,
    condition: "Used",
    bodyStyle: "Coupe",
    fuelType: "Hybrid",
    status: "active",
  });
  check("dealer creates an active vehicle -> 201", active.status === 201, active.status);

  const draft = await addVehicle(alpha.token, {
    make: "Porsche",
    model: "911 GT3",
    year: 2023,
    mileage: 5400,
    priceUsd: 245000,
    condition: "Used",
    bodyStyle: "Coupe",
    fuelType: "Gas",
    status: "draft",
  });
  check("dealer creates a draft -> 201", draft.status === 201, draft.status);

  const bravoCar = await addVehicle(bravo.token, {
    make: "Lamborghini",
    model: "Huracan",
    year: 2022,
    mileage: 8000,
    priceUsd: 275000,
    condition: "Used",
    bodyStyle: "Coupe",
    fuelType: "Gas",
    status: "active",
  });
  check(
    "second dealership creates its own vehicle -> 201",
    bravoCar.status === 201,
    bravoCar.status,
  );

  // --- validation ---------------------------------------------------------
  const badVin = await addVehicle(alpha.token, {
    vin: "IOQ00000000000000", // I, O, Q are never used in a VIN
    make: "Ford",
    model: "F-150",
    year: 2024,
    condition: "New",
    bodyStyle: "Truck",
    fuelType: "Gas",
  });
  check("invalid VIN rejected -> 400", badVin.status === 400, badVin.status);

  const badYear = await addVehicle(alpha.token, {
    make: "Ford",
    model: "Model T",
    year: 1850,
    condition: "Used",
    bodyStyle: "Sedan",
    fuelType: "Gas",
  });
  check("impossible year rejected -> 400", badYear.status === 400, badYear.status);

  // --- tenant isolation on inventory --------------------------------------
  const alphaList = (await (
    await fetch(`${API}/vehicles`, { headers: authed(alpha.token) })
  ).json()) as {
    items: { make: string }[];
    total: number;
  };
  const alphaMakes = alphaList.items.map((v) => v.make);
  check(
    "Alpha's inventory holds only Alpha's cars",
    alphaMakes.includes("Ferrari") &&
      alphaMakes.includes("Porsche") &&
      !alphaMakes.includes("Lamborghini"),
    alphaMakes,
  );

  const crossRead = await fetch(`${API}/vehicles/${bravoCar.id}`, { headers: authed(alpha.token) });
  check(
    "Alpha cannot fetch Bravo's vehicle by id -> 404 (RLS hides it)",
    crossRead.status === 404,
    crossRead.status,
  );

  const crossWrite = await fetch(`${API}/vehicles/${bravoCar.id}`, {
    method: "PATCH",
    headers: authed(alpha.token),
    body: JSON.stringify({ priceUsd: 1 }),
  });
  check(
    "Alpha cannot reprice Bravo's vehicle -> 404",
    crossWrite.status === 404,
    crossWrite.status,
  );

  const crossDelete = await fetch(`${API}/vehicles/${bravoCar.id}`, {
    method: "DELETE",
    headers: authedNoBody(alpha.token),
  });
  check(
    "Alpha cannot delete Bravo's vehicle -> 404",
    crossDelete.status === 404,
    crossDelete.status,
  );

  // --- THE public/private boundary ----------------------------------------
  // Assert on this run's own slugs, not on makes: the public listing spans every
  // dealership, including rows left by earlier runs, so "no Porsche anywhere" would be a
  // meaningless (and flaky) assertion.
  const activeSlug = active.slug!;
  const draftSlug = draft.slug!;
  const bravoSlug = bravoCar.slug!;

  const publicList = (await (await fetch(`${API}/public/vehicles?limit=60`)).json()) as {
    items: { make: string; status: string; slug: string }[];
  };
  const publicSlugs = publicList.items.map((v) => v.slug);

  check("public marketplace needs no token -> 200", Array.isArray(publicList.items));
  check(
    "public listing shows active cars from BOTH dealerships",
    publicSlugs.includes(activeSlug) && publicSlugs.includes(bravoSlug),
    { activeSlug, bravoSlug },
  );
  check("public listing NEVER exposes this run's draft", !publicSlugs.includes(draftSlug), {
    draftSlug,
  });
  check(
    "every public row is active (enforced by RLS, not by a filter)",
    publicList.items.every((v) => v.status === "active"),
    publicList.items.map((v) => v.status),
  );

  // Ask for the draft directly, by its exact slug. The public role must still refuse.
  const draftBySlug = await fetch(`${API}/public/vehicles/${draftSlug}`);
  check(
    "asking for the draft by its slug on the public route -> 404",
    draftBySlug.status === 404,
    draftBySlug.status,
  );

  // --- status transition makes it visible ---------------------------------
  await fetch(`${API}/vehicles/${draft.id}`, {
    method: "PATCH",
    headers: authed(alpha.token),
    body: JSON.stringify({ status: "active" }),
  });
  const afterPublish = await fetch(`${API}/public/vehicles/${draftSlug}`);
  check(
    "once published, the same vehicle is publicly reachable -> 200",
    afterPublish.status === 200,
    afterPublish.status,
  );

  // --- the status workflow ------------------------------------------------
  // The lifecycle is a graph, not four loose labels: `VEHICLE_STATUS_TRANSITIONS` in
  // packages/shared says which moves exist, the API validates the request against the row's
  // committed status, and the dashboard draws its buttons from that same map. These checks
  // prove the rule at the boundary, where a hand-written request lands too.
  const setStatus = (id: string, status: string) =>
    fetch(`${API}/vehicles/${id}`, {
      method: "PATCH",
      headers: authed(alpha.token),
      body: JSON.stringify({ status }),
    });

  const ferrariId = active.id!;

  const toPending = await setStatus(ferrariId, "pending");
  check("active -> pending allowed -> 200", toPending.status === 200, toPending.status);

  const pendingToDraft = await setStatus(ferrariId, "draft");
  check(
    "pending -> draft refused -> 409 (a deal in progress is not a draft)",
    pendingToDraft.status === 409,
    pendingToDraft.status,
  );

  const toSold = await setStatus(ferrariId, "sold");
  check("pending -> sold allowed -> 200", toSold.status === 200, toSold.status);

  const soldPublicly = await fetch(`${API}/public/vehicles/${activeSlug}`);
  check(
    "a sold listing leaves the public marketplace -> 404",
    soldPublicly.status === 404,
    soldPublicly.status,
  );

  const soldToDraft = await setStatus(ferrariId, "draft");
  check(
    "sold -> draft refused -> 409 (it would erase the sale from the record)",
    soldToDraft.status === 409,
    soldToDraft.status,
  );

  const relisted = await setStatus(ferrariId, "active");
  check("sold -> active (relist) allowed -> 200", relisted.status === 200, relisted.status);

  const freshDraft = await addVehicle(alpha.token, {
    make: "Aston Martin",
    model: "Vantage",
    year: 2023,
    mileage: 3100,
    priceUsd: 165000,
    condition: "Used",
    bodyStyle: "Coupe",
    fuelType: "Gas",
    status: "draft",
  });
  const draftToSold = await setStatus(freshDraft.id!, "sold");
  check(
    "draft -> sold refused -> 409 (a car nobody could see cannot have been sold)",
    draftToSold.status === 409,
    draftToSold.status,
  );

  // --- who is selling -----------------------------------------------------
  // A listing carries its seller, and the seller directory only ever contains dealerships a
  // buyer can actually buy from. Both of those come from RLS composing: the policy on
  // `dealer_profiles` asks whether the dealership has any visible vehicle, and "visible" is
  // already decided by the policy on `vehicles`.
  type PublicDealer = { slug: string; name: string; listingCount: number };

  const directory = (await (await fetch(`${API}/public/dealers`)).json()) as {
    items: PublicDealer[];
  };
  const directorySlugs = directory.items.map((d) => d.slug);
  check(
    "a dealership with active inventory appears in the seller directory",
    directorySlugs.includes(alpha.slug) && directorySlugs.includes(bravo.slug),
    directorySlugs,
  );

  const bravoEntry = directory.items.find((d) => d.slug === bravo.slug);
  check(
    "the directory counts only what that dealership has live",
    bravoEntry?.listingCount === 1,
    bravoEntry,
  );

  const bravoPublic = (await (
    await fetch(`${API}/public/vehicles?dealer=${bravo.slug}`)
  ).json()) as {
    items: { slug: string; dealer: { slug: string; name: string } | null }[];
    total: number;
  };
  check(
    "filtering the marketplace by seller returns only that seller's cars",
    bravoPublic.total === 1 && bravoPublic.items[0]?.slug === bravoSlug,
    bravoPublic.items.map((v) => v.slug),
  );
  check(
    "every public listing carries the dealership that is selling it",
    bravoPublic.items.every((v) => v.dealer?.slug === bravo.slug),
    bravoPublic.items.map((v) => v.dealer),
  );

  // A dealership that has signed up but published nothing must be invisible: buyers cannot
  // enumerate the platform's tenants, and an empty storefront is never linkable.
  const quiet = await createDealer("Quiet", "Quiet Motors");
  await addVehicle(quiet.token, {
    make: "Toyota",
    model: "Supra",
    year: 2023,
    condition: "Used",
    bodyStyle: "Coupe",
    fuelType: "Gas",
    status: "draft",
  });

  const directoryAfter = (await (await fetch(`${API}/public/dealers`)).json()) as {
    items: PublicDealer[];
  };
  check(
    "a dealership with only drafts stays out of the seller directory",
    !directoryAfter.items.some((d) => d.slug === quiet.slug),
    directoryAfter.items.map((d) => d.slug),
  );

  const quietPage = await fetch(`${API}/public/dealers/${quiet.slug}`);
  check(
    "asking for that dealership by its exact slug -> 404",
    quietPage.status === 404,
    quietPage.status,
  );

  // --- filters ------------------------------------------------------------
  const filtered = (await (await fetch(`${API}/public/vehicles?make=Ferrari`)).json()) as {
    items: { make: string }[];
  };
  check(
    "public filter by make works",
    filtered.items.length > 0 && filtered.items.every((v) => v.make === "Ferrari"),
    filtered.items.map((v) => v.make),
  );

  // Always tidy up this run's throwaway dealerships, pass or fail, so they never leak onto
  // the public marketplace.
  await cleanup([alpha.orgId, bravo.orgId, quiet.orgId]);
  await getPool().end();

  console.log("");
  if (failures) {
    console.error(`FAILED: ${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log(
    "PASSED: dealer inventory is tenant-isolated, and buyers can only ever see active listings.",
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
