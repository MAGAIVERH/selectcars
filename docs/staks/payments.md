# Stack — Payments

- **Role:** SaaS monetization for dealerships (subscription tiers), and the billing story for the portfolio.
- **Status:** `planned`
- **Owner:** Magaiver

## Tools & versions

| Tool | Version | Notes |
|------|---------|-------|
| Stripe | latest | Checkout + Customer Portal + webhooks |

## Plan model (draft)

- **Free:** limited active inventory (e.g. 10 vehicles), 2 team seats.
- **Pro ($49/mo):** unlimited inventory, unlimited seats, AI features.
- Feature gates enforced server-side (block publish over Free limit).

## Why we chose this

- Stripe is the expected, credible choice; test mode is enough for a portfolio demo.
- Webhook-driven subscription status keeps the DB as source of truth.

## Open decisions

- [ ] Metered AI usage vs flat Pro.
- [ ] Test mode only vs live mode for the public demo.

## Changelog

| Date | Change | Reason |
|------|--------|--------|
| 2026-07-12 | Created sheet | Stripe Free/Pro chosen |
