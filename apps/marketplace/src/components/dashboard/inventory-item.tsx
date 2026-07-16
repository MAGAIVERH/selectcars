import type { Vehicle } from "@selectcars/shared";
import { formatPrice, formatMileage } from "@/lib/cars";
import { StatusPill } from "./status-pill";

const updatedFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

/** One inventory listing, as a dealer scans it: identity, price, status, and key specs. */
export function InventoryItem({ vehicle }: { vehicle: Vehicle }) {
  const specs = [
    String(vehicle.year),
    vehicle.bodyStyle,
    vehicle.fuelType,
    formatMileage(vehicle.mileage),
  ];

  return (
    <article className="border-border bg-surface flex flex-col gap-4 rounded-[var(--radius-card)] border p-5 transition-shadow hover:shadow-[0_18px_44px_-24px_rgba(0,0,0,0.35)] sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
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
