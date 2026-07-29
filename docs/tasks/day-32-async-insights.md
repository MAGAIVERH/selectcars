# Day 32 — Insights on a queue, and what the model is actually for

- **Date:** 2026-07-29
- **Phase:** 5 (Analytics and AI)
- **Status:** Done (71/71 through the API, plus the run driven from the browser)

## Goal

Yesterday's analytics answer "how is the store doing". They cannot answer "what should I do
about this car". This adds the first thing the platform says on its own initiative: a
**pricing** reading (this car against comparable listings across the whole marketplace) and an
**aging** reading (days on the lot against this dealership's own pace), computed by a worker
off the request path, with a language model writing at most one sentence over the result.

## The decision that shaped everything else

The tempting version of this feature is: ask a model what it thinks of the car's price.

That is the version to refuse. It puts an invented percentage in front of someone pricing a
$200,000 car, and it makes the whole feature undemonstrable without an API key. So the split
is:

- **The numbers are SQL, and they always run.** Median of comparable listings, sample size,
  percentage from the median, days on the lot, the dealership's own average days to sale.
  Stored as evidence in `facts`, summarised in a `headline` built from them.
- **The model writes `narrative`, and only that.** Given the facts, asked for one sentence.
  Nullable, and null is a normal working state.

With `ENABLE_AI_INSIGHTS` unset, the feature works completely. That is not a fallback, it is
the product. Full reasoning in [`docs/adr/004-async-insights.md`](../adr/004-async-insights.md).

## Why it cannot happen inside a request

The pricing comparison reads **active listings across every dealership**, not just this
dealer's rows. That is a scan whose cost grows with the platform. Add a model call on top and
a dashboard page load is waiting on a network round trip to someone else's API.

So the shape is:

```
POST /insights/refresh   ->  202 Accepted + { queued: true, jobId }   (writes to Redis, returns)
        (BullMQ)
    worker               ->  reads the market, computes, writes vehicle_insights
GET  /insights           ->  200, a plain read of the last run
```

`202` rather than `200` is the whole design in one status code: HTTP's way of saying "I have
taken this, it is not done yet". The measured run for the showroom is **~1.6 seconds** with no
model configured. That is 1.6 seconds nobody spends waiting.

## The two roles doing different jobs in one run

This is the part worth reading twice:

```ts
const { stock, benchmark } = await withTenant(tenantId, ...);   // this dealer's cars, RLS-scoped
const computed          = await withPublic(async (client) => ...); // the market: active listings, everyone
await withTenant(tenantId, (c) => insights.replaceInsights(c, tenantId, withNarrative));
```

A dealer learns where their car sits against the whole marketplace, and the process that
worked it out never held a role capable of reading another dealership's private rows. The
market median comes from listings the dealer's own token cannot see a single row of, computed
under the role that can only ever see what a buyer sees.

`vehicle_insights` itself has **no public policy at all**: what the platform thinks of a
dealership's pricing is management information, and a buyer must never read "18% over market"
off the listing they are looking at.

## Deliberately silent

Under three comparable listings, **no pricing insight is written**:

```ts
const MIN_COMPARABLE_SAMPLE = 3;
if (market.sample < MIN_COMPARABLE_SAMPLE) return null;
```

"40% above market" derived from one other car is worse than saying nothing, because a dealer
might act on it. This showed up immediately in the demo: the showroom's cars are one-of-a-kind
exotics, so the run produces aging readings and no pricing ones. That is the guard working,
not a bug, and it is why the verification builds a market on purpose (four near-identical
sedans, one overpriced) rather than trusting the seed to exercise the path.

The aging benchmark is the store's **own** average days to sale rather than a fixed 60 days,
because 60 days is ordinary for a Bentley and alarming for a Corolla. A dealership with no
sales history gets a neutral default instead of a lecture.

## Two bugs, both instructive

**1. `Custom Id cannot contain :`** — every refresh answered 500. The dedupe key was
`insights:${tenantId}`, and BullMQ uses `:` to build its own Redis keys, so it rejects a
custom job id containing one. A hyphen fixes it.

**2. The dedupe key would have made the second run a silent no-op.** The job options started
as `removeOnComplete: 20`, to keep a debugging tail. A job's custom id stays claimed for as
long as the job exists in Redis, so a retained completed run would make the dealer's next
"Run again" do nothing at all, and a retained **failed** run would block the retry. Both are
now `true`: the job is forgotten the moment it settles. Nothing is lost, because the result
is in Postgres and every run is logged. There is now a check for exactly this
(`a completed run does not block the next one -> 202`).

## The stray process, again

The first verification run failed with `REDIS_URL is missing` while the API container plainly
had it. `netstat` showed **two** processes on port 3333: the container, and a leftover host-side
`tsx src/server.ts` from an earlier session, answering first and reading a `.env` with no
`REDIS_URL` in it.

This is the second time this exact thing has cost time. The lesson from Day 28 still holds:
**when a service answers in a way its own logs cannot explain, ask who is actually answering.**
`REDIS_URL` has since been added to the local `.env` too, so a host-run API has a queue as well.

## Files

| File                                                             | Why                                                                                        |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| `packages/db/migrations/0012_vehicle_insights.sql`               | The table: kind, severity, headline, `facts` jsonb, nullable `narrative`. Tenant-only RLS. |
| `packages/shared/src/index.ts`                                   | `vehicleInsightSchema`, `insightListSchema`, `insightRunSchema` (the 202 body).            |
| `apps/api/src/lib/queue.ts`                                      | BullMQ wiring, the dedupe key, and why the job is forgotten when it settles.               |
| `apps/api/src/repositories/insights.ts`                          | The arithmetic: market median, pricing position, aging against the store's own pace.       |
| `apps/api/src/lib/narrative.ts`                                  | The optional sentence. Off without a key; a failure here never fails the run.              |
| `apps/api/src/worker.ts`                                         | The second entrypoint. Same image, different command, no HTTP port.                        |
| `apps/api/src/routes/insights.ts`                                | `GET /insights` (a read) and `POST /insights/refresh` (202 + job id).                      |
| `apps/api/tsup.config.ts`                                        | Two entrypoints in one bundle pass, so the db layer and contracts exist once.              |
| `docker-compose.yml`                                             | The `worker` service: same build, `node dist/worker.js`, no ports.                         |
| `apps/marketplace/src/components/dashboard/insight-card.tsx`     | The claim next to its evidence, severity never carried by colour alone.                    |
| `apps/marketplace/src/components/dashboard/refresh-insights.tsx` | The button that honestly says "Queued", not "Done".                                        |
| `apps/marketplace/src/app/dashboard/analytics/page.tsx`          | The `What we noticed` section, read alongside the trends.                                  |
| `docs/adr/004-async-insights.md`                                 | The decision and the alternatives, including the model-does-the-analysis one.              |

## Verification

- `pnpm typecheck`, `pnpm lint`, Prettier: clean.
- **`verify:vehicles`: 71/71 PASS**, with twelve new checks. The interesting ones: refresh
  answers **202 with a job id and not the insights**; the result appears on a later read
  written by a **different process**; a car 48% above the median is flagged with
  `comparableListings: 3` and `marketMedianUsd: 21000` drawn from **another dealership's**
  listings; and another dealership cannot read any of it.
- **Browser:** on `/dashboard/analytics`, "Run again" returns immediately with
  `Queued. Reload in a moment to see the new reading.` while the section still reads
  `Nothing yet` — the async design visible in the UI. After a reload: `Last run Jul 28,
11:26 PM` and four cards, the BMW i8 at `96 days on the lot, past your usual 49` marked
  **Review**, the Mercedes at `21 days on the lot` marked **Noted**.

## Still open

- **The narrative path is code-complete but unexercised.** No `ANTHROPIC_API_KEY` is
  configured, so every insight currently has `narrative: null`, which is the designed
  behaviour and also means the model call itself has never run here. Set
  `ENABLE_AI_INSIGHTS=true` plus the key and restart the worker to switch it on.
- **Nothing recomputes on its own.** A car whose price changed keeps yesterday's reading until
  someone asks. A scheduled job pushing onto the same queue is the obvious next step.
- **Comparability is crude:** make, body style, year ±2. Mileage, trim, and condition all move
  a real price and are ignored. It is honest about its sample size, which is what makes that
  survivable for now.
- The refresh button does not learn when the run finishes. A poll or a push would close it.
- Still true from Day 30: the **home page contact form is fake**, and lead email notification
  is not built.
