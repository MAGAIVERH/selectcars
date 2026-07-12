import Link from "next/link";
import { redirect } from "next/navigation";
import { SITE } from "@selectcars/shared";
import { getPool } from "@selectcars/db";
import { getSession } from "@/lib/session";
import { CreateDealership } from "@/components/auth/create-dealership";
import { SignOutButton } from "@/components/auth/sign-out-button";

export const metadata = {
  title: `Account · ${SITE.name}`,
};

type Membership = { name: string; role: string };

async function getMembership(userId: string, organizationId: string): Promise<Membership | null> {
  const result = await getPool().query<Membership>(
    `select o."name", m."role"
       from "member" m
       join "organization" o on o."id" = m."organizationId"
      where m."userId" = $1 and m."organizationId" = $2
      limit 1`,
    [userId, organizationId],
  );
  return result.rows[0] ?? null;
}

export default async function AccountPage() {
  const session = await getSession();
  if (!session) redirect("/signin");

  const { user } = session;
  const activeOrganizationId = session.session.activeOrganizationId ?? null;
  const membership = activeOrganizationId
    ? await getMembership(user.id, activeOrganizationId)
    : null;

  return (
    <main className="mx-auto w-full max-w-[720px] px-6 py-16">
      <header className="mb-10 flex items-center justify-between">
        <Link
          href="/"
          className="text-foreground font-mono text-sm font-semibold tracking-[0.22em]"
        >
          SELECTCARS
        </Link>
        <SignOutButton />
      </header>

      <h1 className="text-3xl font-semibold tracking-tight">
        Welcome{user.name ? `, ${user.name.split(" ")[0]}` : ""}.
      </h1>
      <p className="text-muted mt-2 text-sm">{user.email}</p>

      {membership && activeOrganizationId ? (
        <section className="border-border bg-surface mt-10 rounded-[var(--radius-card)] border p-7">
          <span className="text-faint font-mono text-[11px] tracking-[0.16em] uppercase">
            Active dealership
          </span>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">{membership.name}</h2>
          <dl className="mt-6 grid grid-cols-2 gap-6 text-sm">
            <div>
              <dt className="text-faint font-mono text-[11px] tracking-[0.16em] uppercase">
                Your role
              </dt>
              <dd className="text-foreground mt-1 capitalize">{membership.role}</dd>
            </div>
            <div>
              <dt className="text-faint font-mono text-[11px] tracking-[0.16em] uppercase">
                Tenant id
              </dt>
              <dd className="text-muted mt-1 font-mono text-xs break-all">
                {activeOrganizationId}
              </dd>
            </div>
          </dl>
          <p className="text-muted mt-6 text-sm">
            Every query for this dealership runs under this tenant id, isolated by Postgres
            Row-Level Security.
          </p>
        </section>
      ) : (
        <section className="border-border bg-surface mt-10 rounded-[var(--radius-card)] border p-7">
          <span className="text-faint font-mono text-[11px] tracking-[0.16em] uppercase">
            One more step
          </span>
          <h2 className="mt-2 text-xl font-semibold tracking-tight">Create your dealership</h2>
          <p className="text-muted mt-2 mb-6 text-sm">
            This becomes your tenant. You will be its owner, and all inventory and leads live under
            it.
          </p>
          <CreateDealership />
        </section>
      )}
    </main>
  );
}
