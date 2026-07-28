import Link from "next/link";
import { SITE, type DealershipMetrics } from "@selectcars/shared";
import { fetchDeals, fetchMetrics } from "@/lib/api";
import { formatPrice } from "@/lib/format";

export const metadata = {
  title: `Overview · ${SITE.name}`,
};

const usd0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const soldFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

/**
 * The screen a dealer principal checks first thing in the morning.
 *
 * The metric set is the trade's standard one, not a set invented here: what is on the lot and
 * what it is worth, what sold and what it made, how fast it turned, and what is going stale.
 * Every figure is computed by the database in a single query, so no two tiles can be showing
 * numbers from different moments.
 */
export default async function OverviewPage() {
  const [metrics, deals] = await Promise.all([fetchMetrics(), fetchDeals()]);

  if (!metrics.ok) {
    return (
      <div className="border-border bg-surface rounded-[var(--radius-card)] border p-14 text-center">
        <h1 className="text-foreground text-lg font-semibold tracking-tight">
          {metrics.status === 403
            ? "These numbers are not yours to see"
            : "We could not load your numbers"}
        </h1>
        <p className="text-muted mx-auto mt-2 max-w-sm text-sm">
          {metrics.status === 403
            ? "Financial figures are limited to owners and managers. Your inventory is still available."
            : `The API returned ${metrics.status}. Make sure the API service is running, then refresh.`}
        </p>
        <Link
          href="/dashboard/inventory"
          className="border-border-strong text-muted hover:border-foreground hover:text-foreground mt-6 inline-block rounded-full border px-5 py-2.5 text-sm transition-colors"
        >
          Go to inventory
        </Link>
      </div>
    );
  }

  const { inventory, sales } = metrics.data;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Overview</span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">Your dealership today</h1>
        </div>
        <Link
          href="/dashboard/vehicles/new"
          className="bg-foreground text-background inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
        >
          <span aria-hidden="true">+</span> Add vehicle
        </Link>
      </div>

      <section aria-labelledby="stock-heading" className="mt-10">
        <h2 id="stock-heading" className="eyebrow">
          On the lot
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Tile
            label="Inventory value"
            value={usd0.format(inventory.valueUsd)}
            note={`${inventory.unitsInStock} unit${inventory.unitsInStock === 1 ? "" : "s"} unsold`}
          />
          <Tile
            label="Live on the marketplace"
            value={String(inventory.active)}
            note={`${inventory.draft} draft · ${inventory.pending} pending`}
          />
          <Tile
            label="Average days on lot"
            value={String(inventory.averageDaysOnLot)}
            note="Across everything unsold"
          />
          <Tile
            label="Aging past 60 days"
            value={String(inventory.aging60Plus)}
            note={agingNote(inventory)}
            alert={inventory.aging60Plus > 0}
          />
        </div>
      </section>

      <section aria-labelledby="sales-heading" className="mt-12">
        <h2 id="sales-heading" className="eyebrow">
          Sales
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Tile
            label="Units sold (30 days)"
            value={String(sales.unitsSold30d)}
            note={`${sales.unitsSoldTotal} all time`}
          />
          <Tile
            label="Total gross"
            value={usd0.format(sales.totalGrossUsd)}
            note={`${usd0.format(sales.frontEndGrossUsd)} front · ${usd0.format(sales.backEndGrossUsd)} back`}
          />
          <Tile
            label="Gross per unit"
            value={usd0.format(sales.grossPerUnitUsd)}
            note="Front and back end, per car retailed"
          />
          <Tile
            label="Average days to sale"
            value={sales.averageDaysToSale === null ? "—" : String(sales.averageDaysToSale)}
            note="From listed to closed"
          />
        </div>
      </section>

      <section aria-labelledby="recent-heading" className="mt-12">
        <h2 id="recent-heading" className="eyebrow">
          Recent sales
        </h2>

        {!deals.ok || deals.data.length === 0 ? (
          <p className="text-muted mt-4 text-sm">
            No sales recorded yet. Mark a car sold in your inventory, then record what it made.
          </p>
        ) : (
          <div className="border-border mt-4 overflow-x-auto rounded-[var(--radius-card)] border">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-border text-faint border-b text-left font-mono text-[11px] tracking-[0.12em] uppercase">
                  <th className="px-4 py-3 font-medium">Vehicle</th>
                  <th className="px-4 py-3 font-medium">Sold</th>
                  <th className="px-4 py-3 text-right font-medium">Price</th>
                  <th className="px-4 py-3 text-right font-medium">Front</th>
                  <th className="px-4 py-3 text-right font-medium">Back</th>
                  <th className="px-4 py-3 text-right font-medium">Total gross</th>
                  <th className="px-4 py-3 text-right font-medium">Days</th>
                </tr>
              </thead>
              <tbody>
                {deals.data.slice(0, 8).map((deal) => (
                  <tr key={deal.id} className="border-border/60 border-b last:border-0">
                    <td className="text-foreground px-4 py-3 font-medium">
                      {deal.vehicleLabel}
                      {deal.buyerName && (
                        <span className="text-faint font-normal"> · {deal.buyerName}</span>
                      )}
                    </td>
                    <td className="text-muted px-4 py-3">
                      {soldFmt.format(new Date(`${deal.soldAt}T00:00:00`))}
                    </td>
                    <td className="text-muted px-4 py-3 text-right">
                      {formatPrice(deal.salePriceUsd)}
                    </td>
                    <td className="text-muted px-4 py-3 text-right">
                      {usd0.format(deal.frontEndGrossUsd)}
                    </td>
                    <td className="text-muted px-4 py-3 text-right">
                      {usd0.format(deal.backEndGrossUsd)}
                    </td>
                    <td className="text-foreground px-4 py-3 text-right font-semibold">
                      {usd0.format(deal.totalGrossUsd)}
                    </td>
                    <td className="text-muted px-4 py-3 text-right">{deal.daysToSale ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

/** Aging is the one tile that is meant to nag, so its note says what it costs, not what it is. */
function agingNote(inventory: DealershipMetrics["inventory"]): string {
  if (inventory.unitsInStock === 0) return "Nothing in stock";
  if (inventory.aging60Plus === 0) return "Nothing stale";
  const share = Math.round((inventory.aging60Plus / inventory.unitsInStock) * 100);
  return `${share}% of the lot, and still costing you`;
}

function Tile({
  label,
  value,
  note,
  alert = false,
}: {
  label: string;
  value: string;
  note: string;
  alert?: boolean;
}) {
  return (
    <div className="border-border bg-surface rounded-[var(--radius-card)] border p-5">
      <p className="text-faint font-mono text-[11px] tracking-[0.12em] uppercase">{label}</p>
      <p
        className={`mt-3 text-2xl font-semibold tracking-tight ${
          alert ? "text-red-600" : "text-foreground"
        }`}
      >
        {value}
      </p>
      <p className="text-muted mt-1 text-xs">{note}</p>
    </div>
  );
}
