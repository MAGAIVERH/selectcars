import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CollectionBrowser } from "@/components/collection-browser";
import { fetchPublicVehicles } from "@/lib/public-api";

export const metadata: Metadata = {
  title: "Collection · SELECTCARS",
  description:
    "A curated collection of exceptional vehicles at the Miami showroom. Filter by make, body, fuel, and price.",
};

export default async function ColecaoPage() {
  const vehicles = await fetchPublicVehicles();

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-[1280px] px-6 py-12">
          <p className="eyebrow">Collection · Miami Showroom</p>
          <h1 className="text-foreground mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            {vehicles.length} vehicles in inventory
          </h1>
          <div className="mt-10">
            {vehicles.length === 0 ? (
              <div className="border-border flex h-64 flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed text-center">
                <p className="text-foreground">No vehicles are published right now.</p>
                <p className="text-muted mt-2 text-sm">Please check back soon.</p>
              </div>
            ) : (
              <CollectionBrowser vehicles={vehicles} />
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
