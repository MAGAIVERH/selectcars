# Day 31 — Trends: how the store is doing over time

- **Date:** 2026-07-29
- **Phase:** 5 (Analytics)
- **Status:** Done (59/59 through the API, plus the charts read in the browser)

## Goal

The overview answers "how are we **now**". The next question a dealer principal asks is "is
that better or worse than last month", and nothing in the product could answer it. This adds
`/dashboard/analytics`: units sold, gross, and enquiries by month, over 6 or 12 months.

## The chart decisions, in the order they were made

Colour last. The form comes first, and sometimes the honest answer is not a chart at all.

**One series per chart, three charts.** Units sold (single digits) and gross (tens of
thousands) live three orders of magnitude apart. Putting them on one plot needs two y-axes,
and the alignment of two scales is arbitrary: a dual axis **invents a correlation the data
does not contain**. Small multiples sharing an x axis say the same thing without lying. This
is the single most common charting mistake and it was worth the extra card to avoid.

**No colour, and that is a decision.** With one series per chart there is no identity to
encode, so the mark wears the product's ink and the baseline wears the border token. Running
the palette validator on the pair reports two FAILs (lightness band, chroma floor) and they
are **out of scope by its own note**: those checks exist to keep several categorical hues
apart. The check that applies, contrast against the surface, passes.

**Sparse by design, with a table twin.** No number on every point: the header carries the
latest value, hovering carries any month, and a full `Month by month` table below carries all
of them. That table is not a fallback for screen readers alone: it is what makes it safe for
the charts to stay quiet.

**One filter row above everything it scopes.** The 6/12 month control sits at the top and all
three charts re-render against the same slice. A range control inside one card would silently
disagree with its neighbours.

Other details worth the words: the baseline is a **solid** hairline (a dashed rule reads as a
threshold that is not there), the endpoint is the only marker always drawn, hover targets are
full-height columns rather than the 4px dot, and the SVG is inline (three small charts do not
justify a dependency, and the marks then obey the same tokens as the rest of the product).

## Empty months are the point

The month list is generated first and the data joined **onto** it:

```sql
with window_months as (
  select date_trunc('month', current_date) - (n || ' months')::interval as month_start
  from generate_series($1::int - 1, 0, -1) as n
)
```

Grouping whatever rows exist would skip a month with no sales, and the line would be drawn
straight across the gap: the chart would tell a dealer they sold steadily through a month when
they sold nothing. `averageDaysToSale` stays **null** in those months rather than 0, because an
average of nothing is not zero.

## The bug the browser found: functions do not cross the RSC boundary

The first render was a 500:

> Functions cannot be passed directly to Client Components.

The page was passing `value` and `format` callbacks into the chart. Props crossing into a
Client Component are **serialized**, and a function has no meaning on the other side of the
wire. The fix is better than the original: the server reduces each month to
`{ value, display }`, so currency formatting happens once, on the server, and the chart is
dumb by construction.

Worth remembering as a rule of thumb: **the RSC boundary is a serialization boundary**. If it
cannot be written as JSON, it does not cross.

## Files

| File                                                        | Why                                                                                 |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `packages/shared/src/index.ts`                              | `trendPointSchema`, `dealershipTrendsSchema`, `trendsQuerySchema`.                  |
| `apps/api/src/repositories/deals.ts`                        | `trendsForTenant`: the generated month window described above.                      |
| `apps/api/src/routes/deals.ts`                              | `GET /metrics/trends?months=`, owners and managers like every money screen.         |
| `apps/marketplace/src/components/dashboard/trend-chart.tsx` | The chart: inline SVG, one series, hover crosshair, endpoint marker.                |
| `apps/marketplace/src/app/dashboard/analytics/page.tsx`     | Range control, three small multiples, and the table twin.                           |
| `packages/db/src/scripts/seed-showroom.ts`                  | Seven more sold units spread back six months, so the lines have something to cross. |

## Verification

- `pnpm typecheck`, `pnpm lint`, Prettier: clean.
- **`verify:vehicles`: 59/59 PASS**, with four new checks: the window returns every month
  including empty ones, a quiet month is a zero rather than a missing point, this month's sale
  appears in the series, and another dealership's series is its own.
- **Browser:** `/dashboard/analytics` renders three charts whose values match the table exactly
  (Mar $7,800 · Apr $14,800 · May $13,300 · Jun $20,400 · Jul $25,600), the hover tooltip on the
  gross chart reads "May $13,300", and the header totals (5 sold · $81,900 · 3 enquiries) equal
  the column sums.

## Still open

- **Inventory turn** and gross per unit as their own series: the data is there, the charts are
  not.
- Comparison against the previous period (a delta beside each headline).
- **The async AI half of Phase 5** is untouched: Redis is running and BullMQ is still unused.
  The next piece is a worker that computes pricing position and aging alerts off the request
  path, with the LLM writing only the sentence and only when a key is configured.
