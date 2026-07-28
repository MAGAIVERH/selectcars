# Stack — Storage / Media

- **Role:** Vehicle imagery: gallery photos, 360° spin sets, and same-car color variants for the color-change effect.
- **Status:** `planned`
- **Owner:** Magaiver

## Tools & versions

| Tool             | Version  | Notes                                       |
| ---------------- | -------- | ------------------------------------------- |
| Supabase Storage | latest   | private + public buckets, presigned uploads |
| next/image       | built-in | optimization/serving                        |

## Media strategy

- **Gallery:** standard photos per vehicle.
- **Color variants:** the same shot rendered/photographed in multiple colors, layered/swapped so it stays the same car (buyer picks a color).
- **360°:** an ordered frame set the buyer can drag to rotate.
- Prefer **transparent-background** cutouts for compositing over any surface.

## Sizing rule (learned)

- Wide side-profile images (ratio ~2.7:1) look small inside narrow columns with `object-contain`. For large hero/showcase spots, prefer 3/4 angles (closer to square) or use `object-cover` + `overflow-hidden`, and give the container real height.

## Alternatives considered

| Alternative        | Why not (for now)                                                  |
| ------------------ | ------------------------------------------------------------------ |
| Cloudflare R2 / S3 | Fine, but Supabase Storage keeps auth/tenant policies in one place |

## Open decisions

- [ ] 360° source: real frame sets vs generated/rotated renders.
- [x] Key format: `tenant/{tenantId}/vehicle/{vehicleId}/{uuid}.{ext}` — decided, Day 28.
- [ ] Resize on upload: a dealer's 5 MB phone photo is served as-is today.
- [ ] Orphan sweep: reconcile bucket objects against `vehicle_photos` rows.

## Changelog

| Date       | Change                                                                                  | Reason                                                                                                                                        |
| ---------- | --------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-07-12 | Created sheet; documented image-sizing rule                                             | Owner flagged small-car issue                                                                                                                 |
| 2026-07-28 | `vehicle-photos` bucket (public read, 8 MB, image MIME only), created by migration 0009 | Day 28: dealer photo uploads. Bucket in a migration rather than a dashboard click, so a fresh environment is one `migrate` away from working. |
| 2026-07-28 | Direct-to-storage uploads with a server-signed ticket                                   | The service-role key bypasses RLS, so it stays in the API; the browser gets permission to write one object key. See ADR 003.                  |
