import Link from "next/link";
import { SITE } from "@selectcars/shared";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { fetchPublicDealers } from "@/lib/public-api";

export const metadata = {
  title: `Dealerships · ${SITE.name}`,
  description: "Every dealership selling on SELECTCARS, and what they have live today.",
};

/**
 * The seller directory: the explicit place to choose who you are buying from, next to the
 * implicit one (the Seller facet in the collection). It lists dealerships, not salespeople,
 * because the dealership is the seller of record: a salesperson works inside one.
 *
 * A dealership appears here the moment it publishes its first car, and disappears when it
 * has none live. That rule is not written in this file: the public database role can only
 * see sellers with visible inventory.
 */
export default async function DealersPage() {
  const dealers = await fetchPublicDealers();

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-[1280px] px-6 py-14">
          <p className="eyebrow">Dealerships</p>
          <h1 className="text-foreground mt-3 text-4xl font-semibold tracking-tight">
            {dealers.length} {dealers.length === 1 ? "seller" : "sellers"} on the platform
          </h1>
          <p className="text-muted mt-3 max-w-xl text-sm">
            Every dealership below publishes its own inventory into the same collection. Pick one to
            see only their cars.
          </p>

          {dealers.length === 0 ? (
            <p className="text-muted border-border mt-12 rounded-[var(--radius-card)] border border-dashed p-14 text-center text-sm">
              No dealership has published inventory yet.
            </p>
          ) : (
            <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {dealers.map((dealer) => (
                <li key={dealer.slug}>
                  <Link
                    href={`/dealers/${dealer.slug}`}
                    className="border-border bg-surface hover:border-border-strong flex h-full flex-col rounded-[var(--radius-card)] border p-6 transition-colors"
                  >
                    <h2 className="text-foreground text-xl font-semibold tracking-tight">
                      {dealer.name}
                    </h2>
                    <p className="text-muted mt-1 text-sm">
                      {dealer.city && dealer.state
                        ? `${dealer.city}, ${dealer.state}`
                        : "United States"}
                    </p>
                    <p className="text-faint mt-6 font-mono text-[11px] tracking-[0.14em] uppercase">
                      {dealer.listingCount} {dealer.listingCount === 1 ? "listing" : "listings"}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
