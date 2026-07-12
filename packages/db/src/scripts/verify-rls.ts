import { config as loadEnv } from "dotenv";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { getPool } from "../pool";
import { withTenant } from "../tenant";

const here = dirname(fileURLToPath(import.meta.url));
loadEnv({ path: resolve(here, "../../../../.env") });

const A = "tenant_aaa";
const B = "tenant_bbb";

let failures = 0;
function check(label: string, ok: boolean): void {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}`);
  if (!ok) failures++;
}

async function main(): Promise<void> {
  const pool = getPool();

  // Seed as postgres (bypasses RLS): two tenants, three rows.
  const admin = await pool.connect();
  try {
    await admin.query("delete from public.test_items where tenant_id = any($1)", [[A, B]]);
    await admin.query(
      `insert into public.test_items (tenant_id, name) values ($1,$2),($1,$3),($4,$5)`,
      [A, "Ferrari A1", "Porsche A2", B, "Lamborghini B1"],
    );
  } finally {
    admin.release();
  }

  // Read scoped to tenant A -> only A's rows.
  const rowsA = await withTenant(A, async (c) =>
    (await c.query("select name from public.test_items")).rows.map((r) => r.name).sort(),
  );
  check(
    `tenant A sees only its 2 rows (got ${JSON.stringify(rowsA)})`,
    rowsA.length === 2 && rowsA.every((n: string) => n.endsWith("A1") || n.endsWith("A2")),
  );

  // Read scoped to tenant B -> only B's row.
  const rowsB = await withTenant(B, async (c) =>
    (await c.query("select name from public.test_items")).rows.map((r) => r.name),
  );
  check(
    `tenant B sees only its 1 row (got ${JSON.stringify(rowsB)})`,
    rowsB.length === 1 && rowsB[0] === "Lamborghini B1",
  );

  // Cross-tenant write: as tenant A, try to insert a row tagged as B -> RLS WITH CHECK must reject.
  let writeBlocked = false;
  try {
    await withTenant(A, async (c) => {
      await c.query("insert into public.test_items (tenant_id, name) values ($1,$2)", [
        B,
        "Sneaky B2",
      ]);
    });
  } catch {
    writeBlocked = true;
  }
  check("tenant A cannot insert a row tagged as tenant B", writeBlocked);

  // No tenant context at all -> zero rows (never a cross-tenant leak).
  const rowsNone = await pool.connect().then(async (c) => {
    try {
      await c.query("begin");
      await c.query("set local role selectcars_app");
      const r = await c.query("select name from public.test_items");
      await c.query("rollback");
      return r.rows;
    } finally {
      c.release();
    }
  });
  check(`no tenant context returns 0 rows (got ${rowsNone.length})`, rowsNone.length === 0);

  await pool.end();

  console.log("");
  if (failures) {
    console.error(`RLS POC FAILED: ${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log("RLS POC PASSED: tenant isolation enforced at the database.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
