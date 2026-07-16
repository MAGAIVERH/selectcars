import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ListingGallery } from "@/components/listing-gallery";
import { fetchPublicVehicleBySlug } from "@/lib/public-api";
import { formatPrice, formatMileage } from "@/lib/format";

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const vehicle = await fetchPublicVehicleBySlug(slug);
  if (!vehicle) return { title: "Vehicle not found · SELECTCARS" };
  return {
    title: `${vehicle.make} ${vehicle.model} · SELECTCARS`,
    description: vehicle.description ?? `${vehicle.year} ${vehicle.make} ${vehicle.model}.`,
  };
}

export default async function ListingPage({ params }: { params: Params }) {
  const { slug } = await params;
  const vehicle = await fetchPublicVehicleBySlug(slug);
  if (!vehicle) notFound();

  const specs: { label: string; value: string | null }[] = [
    { label: "Year", value: String(vehicle.year) },
    { label: "Mileage", value: formatMileage(vehicle.mileage) },
    { label: "Condition", value: vehicle.condition },
    { label: "Body", value: vehicle.bodyStyle },
    { label: "Fuel", value: vehicle.fuelType },
    { label: "Transmission", value: vehicle.transmission },
    { label: "Drivetrain", value: vehicle.drivetrain },
    { label: "Exterior", value: vehicle.exteriorColor },
    { label: "Interior", value: vehicle.interiorColor },
    { label: "Trim", value: vehicle.trim },
    { label: "VIN", value: vehicle.vin },
  ];

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

          <div className="mt-8 grid gap-10 lg:grid-cols-[1.4fr_1fr]">
            <ListingGallery photos={vehicle.photos} alt={`${vehicle.make} ${vehicle.model}`} />

            <div>
              <p className="eyebrow">
                {vehicle.condition.toUpperCase()}
                {vehicle.exteriorColor ? ` · ${vehicle.exteriorColor.toUpperCase()}` : ""}
              </p>
              <h1 className="text-foreground mt-3 text-4xl font-semibold tracking-tight">
                {vehicle.make}
              </h1>
              <p className="text-muted mt-1 text-lg">
                {vehicle.model}
                {vehicle.trim ? ` · ${vehicle.trim}` : ""}
              </p>

              <p className="text-foreground mt-6 text-2xl font-semibold">
                {formatPrice(vehicle.priceUsd)}
              </p>

              {vehicle.description && (
                <p className="text-muted mt-6 text-sm leading-6">{vehicle.description}</p>
              )}

              <Link
                href="/#agendar"
                className="bg-foreground text-background mt-8 inline-flex items-center gap-1.5 rounded-full px-6 py-3 text-sm font-medium transition-opacity hover:opacity-90"
              >
                Book a private viewing
                <span aria-hidden="true">→</span>
              </Link>

              <dl className="border-border mt-10 grid grid-cols-2 gap-x-6 gap-y-5 border-t pt-8">
                {specs
                  .filter((s) => s.value)
                  .map((s) => (
                    <div key={s.label}>
                      <dt className="text-faint font-mono text-[11px] tracking-[0.14em] uppercase">
                        {s.label}
                      </dt>
                      <dd className="text-foreground mt-1 text-sm">{s.value}</dd>
                    </div>
                  ))}
              </dl>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
