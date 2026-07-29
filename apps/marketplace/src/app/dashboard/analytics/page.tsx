import Link from "next/link";
import { SITE, trendsQuerySchema, type TrendPoint } from "@selectcars/shared";
import { fetchInsights, fetchTrends } from "@/lib/api";
import { TrendChart, type ChartPoint } from "@/components/dashboard/trend-chart";
import { InsightCard } from "@/components/dashboard/insight-card";
import { RefreshInsights } from "@/components/dashboard/refresh-insights";

export const metadata = {
  title: `Analytics · ${SITE.name}`,
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const RANGES = [6, 12] as const;

const usd0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** When the last insight run finished. Short, because it is a footnote, not a headline. */
const runFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const money = (n: number) => usd0.format(n);
const plain = (n: number) => String(n);

/**
 * Reduce a month to what the chart needs: a number to plot and a string to show.
 *
 * The formatting is done **here**, on the server, because props crossing into a Client
 * Component are serialized and a function cannot travel with them. Doing it here also keeps
 * currency formatting in one place instead of one per chart.
 */
function series(
  points: TrendPoint[],
  pick: (point: TrendPoint) => number,
  format: (n: number) => string,
): ChartPoint[] {
  return points.map((point) => ({
    key: point.month,
    label: point.label,
    value: pick(point),
    display: format(pick(point)),
  }));
}

/**
 * How the store is doing over time.
 *
 * Three measures, three charts, one shared x axis. Units sold and gross differ by three
 * orders of magnitude, so putting them on one plot would need two y-scales, and a dual axis
 * invents a correlation the data does not contain. Small multiples say the same thing
 * honestly.
 *
 * The range control sits above everything it scopes, and every chart re-renders against the
 * same slice: a filter that belongs to one card is a filter that lies about its neighbours.
 */
export default async function AnalyticsPage({ searchParams }: { searchParams: SearchParams }) {
  const raw = (await searchParams).months;
  const months = trendsQuerySchema.parse({ months: typeof raw === "string" ? raw : 6 }).months;

  // Two independent reads, so they go together rather than one after the other. Both are
  // plain table reads: neither computes anything, which is why this page is not slow.
  const [result, insights] = await Promise.all([fetchTrends(months), fetchInsights()]);

  if (!result.ok) {
    return (
      <div className="border-border bg-surface rounded-[var(--radius-card)] border p-14 text-center">
        <h1 className="text-foreground text-lg font-semibold tracking-tight">
          {result.status === 403
            ? "These numbers are not yours to see"
            : "We could not load the trends"}
        </h1>
        <p className="text-muted mx-auto mt-2 max-w-sm text-sm">
          {result.status === 403
            ? "Analytics are limited to owners and managers."
            : `The API returned ${result.status}. Make sure the API service is running, then refresh.`}
        </p>
      </div>
    );
  }

  const { points } = result.data;
  const totalUnits = points.reduce((sum, p) => sum + p.unitsSold, 0);
  const totalGross = points.reduce((sum, p) => sum + p.totalGrossUsd, 0);
  const totalLeads = points.reduce((sum, p) => sum + p.leads, 0);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Analytics</span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">The last {months} months</h1>
          <p className="text-muted mt-2 max-w-xl text-sm">
            {totalUnits} sold · {usd0.format(totalGross)} gross · {totalLeads} enquiries
          </p>
        </div>

        <nav className="flex items-center gap-1" aria-label="Time range">
          {RANGES.map((range) => (
            <Link
              key={range}
              href={`/dashboard/analytics?months=${range}`}
              aria-current={months === range ? "page" : undefined}
              className={`rounded-full border px-4 py-2 text-sm transition-colors ${
                months === range
                  ? "border-foreground bg-foreground text-background"
                  : "border-border-strong text-muted hover:border-foreground hover:text-foreground"
              }`}
            >
              {range} months
            </Link>
          ))}
        </nav>
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-3">
        <TrendChart title="Units sold" points={series(points, (p) => p.unitsSold, plain)} />
        <TrendChart title="Total gross" points={series(points, (p) => p.totalGrossUsd, money)} />
        <TrendChart title="Enquiries" points={series(points, (p) => p.leads, plain)} />
      </div>

      {/*
        What the platform noticed, computed off the request path.

        Everything above is this dealership's own history. This section is the one place the
        dashboard compares them to the rest of the marketplace, which is why it cannot be
        computed while the page loads: it reads every active listing on the platform, and
        when a model is configured it also waits on one. A worker does it on a queue and the
        page reads the result, so this section costs the same as a table read.
      */}
      <section aria-labelledby="insights-heading" className="mt-12">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 id="insights-heading" className="eyebrow">
              What we noticed
            </h2>
            <p className="text-muted mt-2 max-w-lg text-sm">
              {insights.ok && insights.data.lastComputedAt
                ? `Last run ${runFmt.format(insights.data.lastComputedAt)}.`
                : "Pricing against comparable listings across the marketplace, and how long each car has been sitting against your own pace."}
            </p>
          </div>
          <RefreshInsights />
        </div>

        {!insights.ok ? (
          <p className="text-muted border-border mt-4 rounded-[var(--radius-card)] border border-dashed p-8 text-center text-sm">
            {insights.status === 403
              ? "Insights are limited to owners and managers."
              : `We could not load the insights (error ${insights.status}).`}
          </p>
        ) : insights.data.items.length === 0 ? (
          <p className="text-muted border-border mt-4 rounded-[var(--radius-card)] border border-dashed p-8 text-center text-sm">
            Nothing yet. Run it once and the readings appear here.
          </p>
        ) : (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {insights.data.items.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))}
          </div>
        )}
      </section>

      {/*
        The table is not a fallback, it is the twin: every value in the charts is readable
        here without hovering anything, which is what makes the charts safe to keep sparse.
      */}
      <section aria-labelledby="table-heading" className="mt-12">
        <h2 id="table-heading" className="eyebrow">
          Month by month
        </h2>
        <div className="border-border mt-4 overflow-x-auto rounded-[var(--radius-card)] border">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-border text-faint border-b text-left font-mono text-[11px] tracking-[0.12em] uppercase">
                <th className="px-4 py-3 font-medium">Month</th>
                <th className="px-4 py-3 text-right font-medium">Units sold</th>
                <th className="px-4 py-3 text-right font-medium">Total gross</th>
                <th className="px-4 py-3 text-right font-medium">Enquiries</th>
                <th className="px-4 py-3 text-right font-medium">Days to sale</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {points.map((point) => (
                <tr key={point.month} className="border-border/60 border-b last:border-0">
                  <td className="text-foreground px-4 py-3 font-medium">{point.month}</td>
                  <td className="text-muted px-4 py-3 text-right">{point.unitsSold}</td>
                  <td className="text-muted px-4 py-3 text-right">
                    {usd0.format(point.totalGrossUsd)}
                  </td>
                  <td className="text-muted px-4 py-3 text-right">{point.leads}</td>
                  <td className="text-muted px-4 py-3 text-right">
                    {point.averageDaysToSale ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
