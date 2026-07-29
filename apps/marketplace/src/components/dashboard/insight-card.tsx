import Link from "next/link";
import type { InsightSeverity, VehicleInsight } from "@selectcars/shared";

/**
 * One thing the platform noticed about one car.
 *
 * The card shows the evidence next to the claim, on purpose. "Priced 19% above comparable
 * listings" is an assertion a dealer is entitled to distrust; "19% above, from 6 comparable
 * listings, median $41,900" is one they can check. Insights that cannot show their work tend
 * to be ignored after the first week, which is the real failure mode for a feature like this.
 *
 * Severity is never carried by colour alone: the dot has a written label beside it, so the
 * card reads the same in greyscale, in high-contrast mode, and to a screen reader.
 */
const SEVERITY: Record<InsightSeverity, { label: string; dot: string }> = {
  critical: { label: "Act now", dot: "#b4342a" },
  warning: { label: "Review", dot: "#c08a2d" },
  info: { label: "Noted", dot: "#5b5b5b" },
};

const usd0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** `marketMedianUsd` reads as "market median" to a human, and `$41,900` reads as money. */
function factLabel(key: string): string {
  const words = key
    .replace(/Usd$/, "")
    .replace(/([A-Z])/g, " $1")
    .trim()
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function factValue(key: string, value: string | number): string {
  if (typeof value === "number" && key.endsWith("Usd")) return usd0.format(value);
  if (typeof value === "number" && key.startsWith("percent")) return `${value}%`;
  return String(value);
}

export function InsightCard({ insight }: { insight: VehicleInsight }) {
  const severity = SEVERITY[insight.severity];

  return (
    <article className="border-border bg-surface rounded-[var(--radius-card)] border p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/dashboard/vehicles/${insight.vehicleId}`}
            className="text-muted hover:text-foreground font-mono text-[11px] tracking-[0.12em] uppercase underline-offset-4 hover:underline"
          >
            {insight.vehicleLabel}
          </Link>
          <h3 className="text-foreground mt-2 text-base font-semibold tracking-tight">
            {insight.headline}
          </h3>
        </div>

        <span className="border-border-strong inline-flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: severity.dot }}
          />
          <span className="text-foreground font-mono text-[10px] font-medium tracking-[0.12em] uppercase">
            {severity.label}
          </span>
        </span>
      </div>

      {insight.narrative && <p className="text-muted mt-3 text-sm">{insight.narrative}</p>}

      <dl className="text-faint mt-4 flex flex-wrap gap-x-5 gap-y-1 font-mono text-[11px] tabular-nums">
        {Object.entries(insight.facts).map(([key, value]) => (
          <div key={key} className="flex items-baseline gap-1.5">
            <dt className="tracking-[0.08em] uppercase">{factLabel(key)}</dt>
            <dd className="text-muted">{factValue(key, value)}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
