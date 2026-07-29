# 004 — Insights are computed on a queue, and the model only writes the sentence

- **Status:** Accepted
- **Date:** 2026-07-29
- **Phase:** 5 (Analytics and AI)

## Context

The dashboard should tell a dealer something they did not already know: that a car is priced
well above what comparable listings are asking, or that one has been sitting for twice as
long as their stock usually does.

Two things make this different from every other read in the product:

1. **It is expensive.** The pricing comparison reads active listings across the whole
   marketplace, not just this dealership's rows. That is a scan whose cost grows with the
   platform, not with the dealer's inventory.
2. **It is the first place a language model could plausibly appear.** A sentence written by a
   model reads better than a template. A model call takes seconds and needs an API key.

The naive shape is to compute on read: `GET /insights` does the work and returns it. That
puts a marketplace-wide scan, and possibly a network call to a model, inside a dashboard page
load. It also makes the feature impossible to demonstrate without a key, and unpredictable to
operate: a slow model becomes a slow product.

There is also a question hidden underneath: **what is the model actually for?** The obvious
answer, "ask it what it thinks of this car's price", is the wrong one. It would be guessing
at a number the database can compute exactly, and no dealer should act on a percentage a
model invented.

## Decision

**Compute deterministically on a queue, and let the model write prose over the result.**

Three parts:

**1. The arithmetic is SQL, and it always runs.** `pricing` is the car's price against the
median of comparable active listings (same make and body style, year ±2). `aging` is days on
the lot against this dealership's own average days to sale. Both are computed in Postgres,
stored with their evidence in `vehicle_insights.facts`, and summarised in a `headline` built
from those numbers. No key is involved and none of it can be hallucinated.

**2. The model writes `narrative`, and only that.** It is given the computed facts and asked
for one sentence. The column is nullable and null is a normal state: with
`ENABLE_AI_INSIGHTS` unset the feature works, the dashboard shows the headline and the
evidence, and nothing about the product is broken. This is the project's standing rule for
anything key-bound, and it is why this feature could be demonstrated end to end on the day it
was written.

**3. Nothing runs inside a request.** `POST /insights/refresh` puts a job on BullMQ and
answers **202 Accepted** with a job id. A worker consumes it and writes the table.
`GET /insights` is a plain read of whatever the last run produced. Both endpoints are as fast
as any other query in the dashboard, and the model call cannot make a page slow because it is
not on the page's path.

Supporting choices:

- **The worker is a second entrypoint in `apps/api`, not a separate `apps/worker` package.**
  It is the same image started with a different command (`node dist/worker.js`). A separate
  package would duplicate the database layer, the env schema, the repositories, and the Zod
  contracts, and the two copies would drift. One tree, two process types, is the smaller lie.
- **The market comparison runs under the public role.** The worker reads the dealership's own
  stock under `withTenant` (RLS-scoped) and the market it is compared against under
  `withPublic`, which can only see active listings. A dealer therefore learns where their car
  sits against the whole marketplace, computed by a process that at no point holds a role
  able to read another dealership's private rows.
- **`vehicle_insights` has no public policy at all.** What the platform thinks of a
  dealership's pricing is management information. A buyer must never read "this car is 18%
  over market" off the listing they are looking at.
- **The comparison is silent when the sample is too small.** Under three comparable listings,
  no pricing insight is written. "40% above market" derived from one other car is worse than
  saying nothing, because a dealer might act on it.
- **Redis is optional at boot,** exactly like storage (ADR 003). Without it the API serves
  everything else and only the insight endpoints answer `503` naming what is missing.

## Consequences

**Good**

- The dashboard's cost is unaffected by how expensive an insight is to compute, now or later.
  Adding a slower comparison changes a worker's runtime, not a page's.
- The feature demonstrates in full with no API key, which is what makes it presentable.
- The model cannot state a wrong number, because it is not asked for one. If it fails, is
  rate limited, or is switched off, the run still writes correct insights with no sentence.
- Insights are recomputable at any time from data we own. The table is a cache, not a record.

**Bad, and accepted**

- The result is not immediate. A dealer clicks "Run again" and sees "Queued", then reloads.
  Honest, but it is a worse interaction than a spinner that resolves, and it will eventually
  want a push or a poll.
- A second process to run and watch. Locally that is one more compose service; in production
  it is a second deployment that can be down while the API is up, and the symptom of that is
  insights that quietly stop updating.
- The numbers are as fresh as the last run. Nothing recomputes on its own yet: a car whose
  price changed keeps yesterday's reading until someone asks for a new one. A schedule is the
  obvious next step.
- Comparability is crude: make, body style, year ±2. It ignores mileage, trim, and condition,
  all of which move a real price. It is honest about its sample size, which is what makes the
  crudeness survivable.

## Alternatives considered

| Alternative                               | Why not                                                                                                                                                                                                           |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Compute on read, inside `GET /insights`   | Simplest, and wrong: a marketplace-wide scan on a dashboard load, with no way to add a model call later without making the page wait on it.                                                                       |
| Ask the model for the analysis itself     | The appealing version, and the dangerous one. It would put an invented percentage in front of someone pricing a $200,000 car, and it would make the feature useless without a key.                                |
| A separate `apps/worker` package          | Cleaner boundaries on paper. In practice it duplicates the db package's usage, the env schema, and every repository, and the duplicates drift. Worth revisiting when the worker's dependencies genuinely diverge. |
| Postgres `LISTEN/NOTIFY` instead of Redis | One less service, and tempting. No retries, no backoff, no dedupe, and a notification is lost if nobody is listening. We would rebuild BullMQ badly.                                                              |
| A cron that recomputes everything hourly  | Still needed eventually, and not a substitute: a dealer who just repriced a car wants to ask now. The queue is what a schedule would push jobs onto anyway.                                                       |
