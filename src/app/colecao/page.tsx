import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CollectionBrowser } from "@/components/collection-browser";
import { cars } from "@/lib/cars";

export const metadata: Metadata = {
  title: "Coleção · SELECTCARS",
  description:
    "Coleção curada de veículos de exceção no showroom de São Paulo. Filtre por marca, carroceria, câmbio e faixa de valor.",
};

export default function ColecaoPage() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        <div className="mx-auto max-w-[1280px] px-6 py-12">
          <p className="eyebrow">Coleção · Showroom São Paulo</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl">
            {cars.length} veículos no acervo
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
