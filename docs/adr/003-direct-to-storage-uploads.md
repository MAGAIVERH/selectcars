# 003 — Photo uploads go straight to storage, with a server-signed ticket

- **Status:** Accepted
- **Date:** 2026-07-28
- **Phase:** 2/3 (Inventory, finishing the listing loop)

## Context

A dealer must be able to photograph a car and have those photos appear on the marketplace.
Photos are the one part of a listing that is measured in megabytes, and the one part a buyer
judges the listing by, so how the bytes travel is an architectural decision rather than a
detail.

Three ways to move a file from a dealer's laptop into the product:

1. **Through the Next server.** The browser posts a multipart form to a Server Action; the
   Next process buffers the file and forwards it.
2. **Through the Fastify API.** The browser posts multipart to the API, which streams it into
   object storage.
3. **Straight to storage, with a signed ticket.** The API validates the request and signs a
   short-lived permission to write **one specific object key**. The browser then sends the
   bytes directly to Supabase Storage and afterwards tells the API where they landed.

The constraint that rules the decision: the credential that can write to storage is a
**service-role key**, which bypasses Row-Level Security entirely. If that key ever reaches a
browser, every tenant boundary in this project (ADR 001) is worthless.

## Decision

**Option 3: direct-to-storage uploads with a server-signed ticket.**

The flow is three steps, and the middle one does not touch our servers:

1. `POST /vehicles/:id/photos/upload-url` — the API checks the token, the role, that the
   vehicle belongs to this tenant (via RLS), and that the gallery is not full. It then
   **chooses the key** (`tenant/<id>/vehicle/<id>/<uuid>.jpg`) and signs an upload ticket
   for exactly that key.
2. The browser `PUT`s the file to the signed URL. The bytes go to Supabase Storage.
3. `POST /vehicles/:id/photos` — the API records the row, **re-deriving the public URL from
   the key it issued** and refusing any key that is not prefixed with this tenant and this
   vehicle.

Supporting choices:

- The bucket is **public read** and object keys carry a **uuid**. Listing photos are meant to
  be seen by anonymous buyers; the uuid is what keeps "public" from also meaning
  "enumerable".
- Limits are declared in `packages/shared` and enforced **three times**: in the browser (a
  fast, readable error), in the API (the real check for our own endpoints), and on the bucket
  itself (`file_size_limit`, `allowed_mime_types`, set by migration 0009). Only the last one
  cannot be bypassed by a crafted request.
- Storage config is **optional at boot**. Without it the API still starts and only the photo
  endpoints answer `503` naming the missing variable.

## Consequences

**Good**

- The service-role key never leaves the API process. The browser holds a permission to write
  one object, which expires, and nothing else.
- A 5 MB photo does not occupy a Node process or a Server Action payload. Upload throughput
  is Supabase's problem, and our API stays a small JSON service.
- Authorization is still ours: the ticket is only issued after the same tenant and role checks
  every other write goes through, so RLS remains the boundary even though the bytes bypass us.
- The client cannot choose where a photo is hosted. It sends a key, not a URL.

**Bad, and accepted**

- Three round trips instead of one, and an intermediate state: an upload can succeed while
  step 3 fails, leaving an object in the bucket that no row references. Orphans cost a little
  storage and are invisible to buyers. A sweep job can reconcile keys against rows later.
- The browser talks to a second origin, so a storage outage surfaces as its own error rather
  than as our API failing. The uploader reports it as such.
- Deleting a photo is two systems: the row and the object. The row wins, and a failed object
  delete is logged rather than raised, because the dealer's delete did succeed.

## Alternatives considered

| Alternative             | Why not                                                                                                                                                                                                                             |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Multipart via the API   | Simplest to reason about, but every photo occupies an API connection and its memory, and the API becomes a file proxy. Fine at ten cars, not at ten thousand.                                                                       |
| Multipart via Next      | Same cost, in the process that also renders the marketplace. Server Action payload limits make large photos an explicit configuration problem.                                                                                      |
| Anon key in the browser | Would let the browser talk to storage without our API signing anything, and moves authorization into storage policies instead of the API we control.                                                                                |
| Bytes in Postgres       | No secret to manage and RLS would cover the bytes, which is genuinely attractive here. Rejected: images in a relational database do not survive growth, and the backup and egress story gets worse exactly as the product succeeds. |
