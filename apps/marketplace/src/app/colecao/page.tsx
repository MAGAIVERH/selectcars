import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CollectionBrowser } from "@/components/collection-browser";
import { cars } from "@/lib/cars";

export const metadata: Metadata = {
  title: "Collection · SELECTCARS",
  description:
    "A curated collection of exceptional vehicles at the Miami showroom. Filter by make, body, transmission, and price.",
};

export default function ColecaoPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-[1280px] px-6 py-12">
          <p className="eyebrow">Collection · Miami Showroom</p>
          <h1 className="text-foreground mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
            {cars.length} vehicles in inventory
          </h1>
          <div className="mt-10">
            <CollectionBrowser cars={cars} />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
