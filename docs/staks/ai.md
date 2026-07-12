# Stack — AI

- **Role:** The "wow" features: photo-to-listing vision, semantic search, lead scoring, price estimate. All async.
- **Status:** `planned`
- **Owner:** Magaiver

## Tools & versions

| Tool | Version | Notes |
|------|---------|-------|
| Vercel AI SDK | v6 | via AI Gateway; provider-agnostic `"provider/model"` strings |
| pgvector | latest | embeddings storage/search |
| BullMQ | latest | all AI jobs run async |

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

- Feature flag `ENABLE_AI_VISION` (demo works with mock JSON when off).
- Rate limit per tenant. Always show "AI-generated, please review" before publish.

## Open decisions

- [ ] Default model per task (vision vs embeddings vs scoring).
- [ ] Embedding dimension / model choice.

## Changelog

| Date | Change | Reason |
|------|--------|--------|
| 2026-07-12 | Created sheet | Vercel AI SDK + pgvector + BullMQ chosen |
