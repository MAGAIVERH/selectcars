# Day 28 — Photo upload: a dealer's own photographs

- **Date:** 2026-07-28
- **Phase:** 2 (Inventory), closing the last gap
- **Status:** Done (46/46 through the API with real uploads, plus a full loop in the browser)

## Goal

The last thing a dealer could not do. A car added in the dashboard had no way to get a photo,
so every listing a real dealer created looked broken next to the seeded ones. This closes the
loop: sign up, add a car, photograph it, publish, and it is on the marketplace with an image.

## The design decision: the bytes skip our servers

Written up in full as [ADR 003](../adr/003-direct-to-storage-uploads.md). The short version,
and the reason it is not just "post the file to the server":

The credential that can write to Supabase Storage is a **service-role key**, and it bypasses
Row-Level Security completely. If it ever reached a browser, every tenant boundary in this
project would be worthless. So it stays in the API process, and the browser gets something
much smaller instead:

1. `POST /vehicles/:id/photos/upload-url` — the API checks the token, the role, that the car
   belongs to this tenant, and that the gallery has room. Then it **picks the object key**
   and signs a ticket for exactly that key.
2. The browser `PUT`s the file straight to storage. A 5 MB photo never occupies our API or
   the Next server.
3. `POST /vehicles/:id/photos` — the API records the row, re-deriving the URL from the key it
   issued.

Step 3 is where the interesting check lives: the client sends a **key, never a URL**, and the
API refuses any key not prefixed `tenant/<caller's tenant>/vehicle/<this car>/`. So a dealer
cannot attach another dealership's upload, and nobody can point a listing at an image hosted
somewhere else.

## Three layers of limits, on purpose

`MAX_PHOTO_BYTES`, `MAX_PHOTOS_PER_VEHICLE`, and `ALLOWED_PHOTO_TYPES` live in
`packages/shared`, and are enforced in three places:

| Where          | What it is for                                                                                                                                                                        |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Browser        | Instant, readable feedback. Courtesy, not defence: trivially bypassed.                                                                                                                |
| API            | The real check for our endpoints, before any ticket is signed.                                                                                                                        |
| Storage bucket | `file_size_limit` and `allowed_mime_types`, set by migration 0009. This one cannot be talked out of, because it is enforced after the browser is already talking to storage directly. |

That third layer is not belt-and-braces, it is load-bearing: once a ticket is signed, the
upload does not pass through us again.

## Two rules the database now enforces

- **One primary photo per vehicle**, as a partial unique index. Two primaries is not cosmetic:
  `photos.find(p => p.isPrimary)` would then depend on row order, so the same listing could
  show different cars to different people. The index states it once for every writer.
- The first photo of a listing is **always** primary, and deleting the primary **promotes the
  next one**, in the same transaction. A gallery with photos but no primary renders an empty
  card, which is indistinguishable from a bug.

## Files

| File                                                          | Why                                                                                                                         |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `packages/db/migrations/0009_vehicle_photo_uploads.sql`       | `storage_key` column, the one-primary index, and the bucket itself (with its limits).                                       |
| `packages/shared/src/index.ts`                                | Upload limits, `photoUploadRequestSchema`, `photoUploadTicketSchema`, `attachPhotoSchema`, and an `unavailable` error code. |
| `apps/api/src/lib/storage.ts`                                 | The only place that holds the storage credential: key naming, ticket signing, object removal.                               |
| `apps/api/src/repositories/photos.ts`                         | Attach, delete, set primary, promote, all tenant-scoped by RLS.                                                             |
| `apps/api/src/routes/photos.ts`                               | The four endpoints, including the key-prefix check and the 503 when storage is off.                                         |
| `apps/marketplace/src/components/dashboard/photo-manager.tsx` | The dealer's gallery: upload, choose the primary, remove.                                                                   |
| `apps/marketplace/src/app/dashboard/actions.ts`               | The three-step flow as server actions.                                                                                      |
| `apps/marketplace/src/app/dashboard/vehicles/new/page.tsx`    | Creating a car now lands on **its own page**, because photos need a car that exists.                                        |

## Why storage is optional at boot

Without `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` the API still starts, and only the
photo endpoints answer **503** naming the missing variable. Refusing to boot would take the
whole marketplace down over one feature, and a new contributor cloning the repo would get a
dead site instead of a working one with a switched-off corner.

## Verification

- `pnpm typecheck`, `pnpm lint`, Prettier: clean. Migration applied; the bucket exists with an
  8 MB limit and an image-only MIME list.
- `verify:vehicles` covers **both** worlds, so the script is honest either way. With the
  credential set it runs the real path, and all nine photo checks pass:

```
PASS  dealer gets a signed upload ticket -> 201
PASS  the ticket's key is scoped to this dealership and this car
PASS  the browser uploads straight to storage -> 200
PASS  the photo is recorded on the listing -> 201
PASS  a listing's first photo becomes its primary
PASS  the uploaded file is publicly readable -> 200
PASS  attaching another dealership's upload key -> 400
PASS  another dealership cannot delete this photo -> 404
PASS  the owner deletes the photo -> 204
```

Without it, the same section asserts the honest `503` instead, so a contributor with no
credential still gets a green run and a clear reason.

- **Browser:** the edit page shows the gallery with its Primary label, Remove, and the limits
  line ("11 slots left"). Choosing a file drives the whole chain (client, server action, API)
  and surfaces the real reason: _"Photo storage is not configured on this server. Set
  SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY."_

### Two bugs the browser pass caught

1. **An empty optional variable took the API down.** `SUPABASE_SERVICE_ROLE_KEY=` (present but
   blank, which is what a placeholder line in `.env` looks like) arrives as `""`, and
   `z.string().optional()` accepts only `undefined`. The API refused to boot: the exact
   opposite of the graceful degradation these optional settings exist for. Fixed with an
   `optionalConfig()` helper that treats an empty value as unset.
2. **The error message was useless.** The UI said "The change could not be saved (error 503)"
   while the API was already answering with the reason. `describeFailure` now passes the
   server's own message through for 503, as it already did for 409.

- **Browser, full loop:** uploaded a real PNG to the Bentley from the dashboard. The gallery
  went to two photos with the new one offering "Make primary", the listing page at
  `/colecao/bentley-continental-gt` rendered it in the buyer's gallery, and the public API
  returned it as a `…supabase.co/storage/v1/object/public/vehicle-photos/tenant/…` URL. Then
  removed it from the dashboard and confirmed the listing was back to one photo.

### The environment bug that hid all of this

The first run after setting the credential still answered `503`, then `500`, with **nothing at
all in the container's logs**. The cause was not the code: **two processes were listening on
port 3333**. A stray `tsx src/server.ts` from an earlier session was competing with the
container, and requests landed on whichever won, so a fresh container and a stale process were
answering the same URL by turns.

Worth remembering as a diagnostic habit: when a service answers in a way its own logs cannot
explain, stop debugging the code and ask **who is actually answering**. On Windows,
`netstat -ano | findstr :3333` showed two PIDs where there should have been one.

**Setup note:** paste the key into `.env` as `SUPABASE_SERVICE_ROLE_KEY` (Supabase Dashboard,
Project Settings, API, `service_role`) and rebuild the API with
`docker compose up -d --build api`. In current Supabase dashboards the key list also shows a
"publishable" key: that is the browser-safe one and this project never needs it, because the
browser is handed a signed ticket rather than a credential.

## Still open

- **Reordering** the gallery by drag: today a dealer chooses the primary and the rest keep
  upload order.
- **Orphan sweep:** an upload that succeeds while step 3 fails leaves an object no row
  references. Harmless and invisible, but worth a reconcile job eventually (noted in ADR 003).
- Image resizing on upload. The bucket accepts up to 8 MB and the marketplace serves the
  original; a dealer's 5 MB phone photo is heavier than the ~100 KB seeded cutouts.
