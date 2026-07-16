import Image from "next/image";
import type { Vehicle } from "@selectcars/shared";
import { formatPrice, formatMileage } from "@/lib/format";
import { StatusPill } from "./status-pill";

const updatedFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

/** One inventory listing, as a dealer scans it: photo, identity, price, status, key specs. */
export function InventoryItem({
  vehicle,
  priority = false,
}: {
  vehicle: Vehicle;
  priority?: boolean;
}) {
  const specs = [
    String(vehicle.year),
    vehicle.bodyStyle,
    vehicle.fuelType,
    formatMileage(vehicle.mileage),
  ];
  const primary = vehicle.photos.find((p) => p.isPrimary) ?? vehicle.photos[0];

  return (
    <article className="border-border bg-surface flex flex-col gap-4 rounded-[var(--radius-card)] border p-4 transition-shadow hover:shadow-[0_18px_44px_-24px_rgba(0,0,0,0.35)] sm:flex-row sm:items-center">
      <div className="bg-background border-border relative aspect-[3/2] w-full shrink-0 overflow-hidden rounded-[10px] border sm:h-20 sm:w-32">
        {primary ? (
          <Image
            src={primary.url}
            alt={primary.alt ?? `${vehicle.make} ${vehicle.model}`}
            fill
            priority={priority}
            sizes="(max-width: 640px) 100vw, 128px"
            className="object-cover"
          />
        ) : (
          <span className="text-faint absolute inset-0 grid place-items-center font-mono text-[10px] tracking-[0.12em] uppercase">
            No photo
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <h3 className="text-foreground truncate text-lg font-semibold tracking-tight">
            {vehicle.make} {vehicle.model}
          </h3>
          <StatusPill status={vehicle.status} />
        </div>
        <p className="text-muted mt-1 text-sm">
          {vehicle.trim ? `${vehicle.trim} · ` : ""}
          {vehicle.exteriorColor ?? "Color on request"}
        </p>
        <p className="text-faint mt-3 font-mono text-[11px] tracking-[0.1em] uppercase">
          {specs.join("  ·  ")}
        </p>
      </div>

      <div className="flex items-center justify-between gap-6 sm:flex-col sm:items-end sm:justify-center">
        <p className="text-foreground text-base font-semibold">{formatPrice(vehicle.priceUsd)}</p>
        <p className="text-faint text-xs">Updated {updatedFmt.format(vehicle.updatedAt)}</p>
      </div>
    </article>
  );
}
