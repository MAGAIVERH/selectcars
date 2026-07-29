# Stack — AI

- **Role:** The "wow" features: photo-to-listing vision, semantic search, lead scoring, price estimate. All async.
- **Status:** `in-progress` (insights shipped Day 32; vision and search still planned)
- **Owner:** Magaiver

## Tools & versions

| Tool                | Version | Notes                                                                                               |
| ------------------- | ------- | --------------------------------------------------------------------------------------------------- |
| `@anthropic-ai/sdk` | 0.115.x | In use since Day 32 for the insight narrative: `claude-opus-5`, structured outputs, `effort: "low"` |
| Vercel AI SDK       | v6      | Still the plan for vision/embeddings, where provider choice per task matters                        |
| pgvector            | latest  | embeddings storage/search (planned)                                                                 |
| BullMQ              | 5.81    | in use: all model work runs on the `insights` queue, never in a request                             |

## What is actually built (Day 32)

Vehicle insights: a **pricing** reading (this car against the median of comparable active
listings across the whole marketplace) and an **aging** reading (days on the lot against this
dealership's own average days to sale).

The split that matters: **the arithmetic is SQL and always runs; the model writes at most one
sentence over it.** The model is never asked what it thinks a price should be, because that
number is computable exactly and an invented one is worse than none. `narrative` is nullable
and null is a normal state, so the whole feature demonstrates with no API key configured.
See [ADR 004](../adr/004-async-insights.md) and
[Day 32](../tasks/day-32-async-insights.md).

**Why the Anthropic SDK directly rather than the AI SDK here:** the narrative is one call,
with structured outputs and a refusal fallback, from a worker we control. Provider-agnostic
routing buys nothing for that and adds a layer between us and the parameters we care about
(`effort`, `output_config.format`, server-side fallbacks). Vision is the opposite shape, and
is where the AI SDK plus a gateway is likely to earn its place.

## Features (v1)

- **Vision:** dealer uploads vehicle photos → structured JSON (make, model, year, trim, mileage, features, description, suggested price). Zod-validated.
- **Semantic search:** buyer types natural language ("reliable AWD SUV under $35k, low miles") → pgvector nearest-neighbor + filters.
- **Lead scoring:** score 0–100 + reasoning + hot/warm/cold.
- **Price estimate:** compare similar inventory → suggested USD range (disclaimer: estimate only).

## Why we chose this

- AI SDK + AI Gateway avoids provider lock-in and adds observability/fallbacks.
- Embeddings in pgvector keep search in one DB.
- Async-only keeps HTTP fast and costs controllable.

## Rules

- Feature flag every model-bound feature (`ENABLE_AI_INSIGHTS`, `ENABLE_AI_VISION`), and the
  product must work with the flag off. Proven on Day 32: with no key, insights still compute,
  still show their evidence, and only `narrative` is null.
- Never let a model produce a number the database can compute. It writes prose over facts.
- Rate limit per tenant. Always show "AI-generated, please review" before publish.
- A model failure must not fail the job around it: the narrative is caught and logged, and the
  run's correct numbers are written anyway.

## Open decisions

- [x] ~~Default model for the narrative task.~~ **Resolved Day 32:** `claude-opus-5` at
      `effort: "low"` with structured outputs, one batched call per run.
- [ ] Default model for vision and for embeddings.
- [ ] Embedding dimension / model choice.
- [ ] Per-tenant rate limiting and a cost ceiling once a key is actually configured.

## Changelog

| Date       | Change                                                                       | Reason                                                                                                                                                                                                   |
| ---------- | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-12 | Created sheet                                                                | Vercel AI SDK + pgvector + BullMQ chosen                                                                                                                                                                 |
| 2026-07-29 | `@anthropic-ai/sdk` added; insights shipped on BullMQ (`ENABLE_AI_INSIGHTS`) | Day 32: the first model-bound feature. Deterministic SQL insights always run; the model writes only the sentence, from a worker, behind a flag. Direct SDK over the AI SDK for a single controlled call. |
