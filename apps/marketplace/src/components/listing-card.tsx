import Image from "next/image";
import Link from "next/link";
import type { Vehicle } from "@selectcars/shared";
import { formatPrice, formatMileage } from "@/lib/format";

/**
 * A marketplace listing card, driven by a live `Vehicle` from the API (photos and all).
 * Links to the public detail page by slug.
 */
export function ListingCard({
  vehicle,
  priority = false,
}: {
  vehicle: Vehicle;
  priority?: boolean;
}) {
  const primary = vehicle.photos.find((p) => p.isPrimary) ?? vehicle.photos[0];
  const specs = [
    String(vehicle.year),
    vehicle.bodyStyle,
    vehicle.fuelType,
    formatMileage(vehicle.mileage),
  ];

  return (
    <article className="border-border bg-surface flex flex-col rounded-[var(--radius-card)] border p-5 transition-shadow hover:shadow-[0_18px_44px_-24px_rgba(0,0,0,0.35)]">
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow leading-relaxed">
          {vehicle.condition.toUpperCase()}
          {vehicle.exteriorColor ? ` · ${vehicle.exteriorColor.toUpperCase()}` : ""}
        </p>
      </div>

      <h3 className="text-foreground mt-3 text-xl font-semibold tracking-tight">{vehicle.make}</h3>
      <p className="text-muted text-sm">{vehicle.model}</p>

      <div className="relative my-6 aspect-[3/2] w-full">
        {primary ? (
          <Image
            src={primary.url}
            alt={primary.alt ?? `${vehicle.make} ${vehicle.model}`}
            fill
            priority={priority}
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-contain [filter:drop-shadow(0_16px_18px_rgba(0,0,0,0.22))]"
          />
        ) : (
          <span className="text-faint absolute inset-0 grid place-items-center font-mono text-[10px] tracking-[0.12em] uppercase">
            Photo on request
          </span>
        )}
      </div>

      <div className="border-border mt-auto border-t pt-4">
        <p className="text-faint font-mono text-[11px] tracking-[0.1em]">
          {specs.join("  ·  ").toUpperCase()}
        </p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-foreground text-base font-semibold">{formatPrice(vehicle.priceUsd)}</p>
          <Link
            href={`/colecao/${vehicle.slug}`}
            className="bg-foreground text-background inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-opacity hover:opacity-90"
          >
            View details
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
