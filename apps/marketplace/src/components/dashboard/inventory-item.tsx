import Image from "next/image";
import Link from "next/link";
import type { Vehicle } from "@selectcars/shared";
import { formatPrice, formatMileage } from "@/lib/format";
import { StatusPill } from "./status-pill";
import { StatusActions } from "./status-actions";

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
            className="object-contain p-1"
          />
        ) : (
          <span className="text-faint absolute inset-0 grid place-items-center font-mono text-[10px] tracking-[0.12em] uppercase">
            No photo
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-3">
          <h3 className="truncate text-lg font-semibold tracking-tight">
            {/* The whole row is not a link: it holds its own buttons, and nesting a button
                inside a link is invalid and unusable with a keyboard. The title is the link. */}
            <Link
              href={`/dashboard/vehicles/${vehicle.id}`}
              className="text-foreground hover:underline"
            >
              {vehicle.make} {vehicle.model}
            </Link>
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

      <div className="flex flex-col gap-3 sm:items-end">
        <div className="flex items-baseline justify-between gap-6 sm:flex-col sm:items-end sm:gap-1">
          <p className="text-foreground text-base font-semibold">{formatPrice(vehicle.priceUsd)}</p>
          <p className="text-faint text-xs">Updated {updatedFmt.format(vehicle.updatedAt)}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          <StatusActions vehicleId={vehicle.id} status={vehicle.status} />
          <Link
            href={`/dashboard/vehicles/${vehicle.id}`}
            className="border-border-strong text-muted hover:border-foreground hover:text-foreground rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors"
          >
            Edit
          </Link>
        </div>
      </div>
    </article>
  );
}
