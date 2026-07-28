import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SITE } from "@selectcars/shared";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ListingCard } from "@/components/listing-card";
import { fetchPublicDealer, fetchPublicVehicles } from "@/lib/public-api";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const dealer = await fetchPublicDealer(slug);
  if (!dealer) return { title: `Dealership not found · ${SITE.name}` };

  const where = dealer.city && dealer.state ? ` in ${dealer.city}, ${dealer.state}` : "";
  return {
    title: `${dealer.name} · ${SITE.name}`,
    description: dealer.about ?? `Inventory from ${dealer.name}${where}.`,
  };
}

/**
 * A dealership's storefront: who they are, and everything they currently have live.
 *
 * The listings are fetched filtered by seller rather than filtered in the browser, so this
 * page carries one dealership's inventory and not the whole marketplace's.
 */
export default async function DealerPage({ params }: { params: Params }) {
  const { slug } = await params;

  const [dealer, vehicles] = await Promise.all([
    fetchPublicDealer(slug),
    fetchPublicVehicles({ dealer: slug }),
  ]);

  // A dealership with nothing published is not reachable here, by design: the public role
  // cannot see it at all, so this is a genuine 404 rather than an empty storefront.
  if (!dealer) notFound();

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-[1280px] px-6 py-10">
          <Link
            href="/colecao"
            className="text-muted hover:text-foreground text-sm transition-colors"
          >
            <span aria-hidden="true">←</span> Back to collection
          </Link>

          <header className="border-border mt-8 border-b pb-10">
            <p className="eyebrow">Dealership</p>
            <h1 className="text-foreground mt-3 text-4xl font-semibold tracking-tight">
              {dealer.name}
            </h1>
            <p className="text-muted mt-2 text-sm">
              {dealer.city && dealer.state ? `${dealer.city}, ${dealer.state}` : "United States"}
              {dealer.phone ? ` · ${dealer.phone}` : ""}
            </p>
            {dealer.about && (
              <p className="text-muted mt-6 max-w-2xl text-sm leading-6">{dealer.about}</p>
            )}
            <p className="text-faint mt-6 font-mono text-[11px] tracking-[0.14em] uppercase">
              {vehicles.length} {vehicles.length === 1 ? "listing" : "listings"} live
            </p>
          </header>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {vehicles.map((vehicle, i) => (
              <ListingCard key={vehicle.id} vehicle={vehicle} priority={i < 3} />
            ))}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
