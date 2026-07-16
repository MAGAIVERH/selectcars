import Link from "next/link";
import { redirect } from "next/navigation";
import { SITE } from "@selectcars/shared";
import { getSession } from "@/lib/session";
import { getActiveDealership } from "@/lib/dashboard";
import { SignOutButton } from "@/components/auth/sign-out-button";

export const metadata = {
  title: `Dashboard · ${SITE.name}`,
};

/**
 * Dealer dashboard shell. Gated: you must be signed in and have an active dealership.
 * Without a dealership there is no tenant, so we send you to /account to create one.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/signin");

  const tenantId = session.session.activeOrganizationId ?? null;
  if (!tenantId) redirect("/account");

  const dealership = await getActiveDealership(session.user.id, tenantId);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-border/70 bg-background/80 sticky top-0 z-50 border-b backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between gap-6 px-6">
          <div className="flex items-baseline gap-3">
            <Link
              href="/dashboard"
              className="text-foreground font-mono text-sm font-semibold tracking-[0.22em]"
            >
              SELECTCARS
            </Link>
            <span className="text-faint font-mono text-[11px] tracking-[0.16em] uppercase">
              Dashboard
            </span>
          </div>

          <div className="flex items-center gap-4">
            {dealership && (
              <span className="text-muted hidden text-sm sm:inline">
                {dealership.name}
                <span className="text-faint"> · {dealership.role}</span>
              </span>
            )}
            <Link href="/" className="text-muted hover:text-foreground text-sm transition-colors">
              View site
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1180px] flex-1 px-6 py-10">{children}</main>
    </div>
  );
}
