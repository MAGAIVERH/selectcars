# Day 30 — Leads: the buyer's side of the same car

- **Date:** 2026-07-29
- **Phase:** 4 (Professional dashboard: CRM)
- **Status:** Done (55/55 through the API, plus the full loop in the browser)

## Goal

A buyer could look at a car and had no way to say so. This closes the other half of Phase 4:
an enquiry from a listing becomes a lead in the selling dealership's pipeline, worked by a
salesperson, measured by response time.

It is also where the **salesperson role finally appears in the product**. Until now it existed
in the token and in permissions; now it is the person a conversation is handed to.

## The interesting part: a stranger writing into a tenant's data

Every other public path in this project is read-only. Here an anonymous visitor creates a row
inside a dealership's data, which makes it the narrowest surface in the API and the most
interesting policy in the schema so far. The rule is written once, in the database:

```sql
create policy leads_public_insert on public.leads
  for insert to selectcars_public
  with check (
    exists (select 1 from public.vehicles v
             where v.id = leads.vehicle_id and v.tenant_id = leads.tenant_id)
  );
```

Read what it does **not** say: it never mentions `status = 'active'`. It does not have to. The
subquery runs as `selectcars_public`, so the policy on `vehicles` already applies inside it,
and only published cars exist from there. The sentence the database enforces is:

> you may only enquire about a car you can actually see, and the enquiry is filed against the
> dealership that owns it.

The other half matters just as much: **there is no select policy and no select grant**. A
buyer can write one lead and can never read one, so the enquiry form cannot double as a way to
harvest every other buyer's name, email, and phone number. The API agrees: `POST /public/leads`
answers `202 { received: true }` and hands back no record at all.

## Response time is stamped by the API, not by a screen

`first_response_at` is set by the same statement that first moves a lead off `new`:

```sql
first_response_at = case
  when first_response_at is not null then first_response_at
  when $1 = 'new' then null
  else now()
end
```

It lives in the repository rather than in the caller because any screen or script that moves a
lead would otherwise have to remember, and the one that forgets makes the response-time number
quietly wrong. It is stored rather than derived because "when did we first reply" cannot be
recovered from the current status later.

The seed leans into why it matters: the lead that was answered in 19 hours is the one marked
`lost`.

## Where the names come from

The API returns the assignee's **id**, never a name. Members live in the auth tables, where
the API's `selectcars_app` role holds no grant by design, so the marketplace app (which is the
identity issuer and already owns those tables) resolves ids to names, exactly as it already
does for the dealership name in the dashboard chrome. Two systems, each reading what it owns.

## The bug the browser found, and the class of bug behind it

Moving a lead did nothing, and the control stayed disabled forever. The console had the
answer: `TypeError: fetch failed` inside the server action.

The API had blinked (its container was recycling), and `fetch` **rejects** when nothing is
listening. That exception escaped the Server Action, so `useTransition` never settled and the
UI sat on a disabled select waiting for a promise that would never resolve.

The fix is not in the lead screen. Every function in `lib/api.ts` had the same hole, so all
seventeen now go through one wrapper:

```ts
async function request(url: string, init?: RequestInit): Promise<Response | null> {
  try {
    return await fetch(url, { cache: "no-store", ...init });
  } catch {
    return null;
  }
}
```

A dead socket becomes `503`, the same shape as every other failure, so every caller already
knows how to render it. **An unreachable dependency is an answer, not a crash**: if it can be
typed like the other failures, the UI can tell the truth about it instead of hanging.

## Files

| File                                                     | Why                                                                                     |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `packages/db/migrations/0011_leads.sql`                  | The table, the tenant policy, and the insert-only public policy described above.        |
| `packages/shared/src/index.ts`                           | `leadSchema`, `createLeadSchema`, `updateLeadSchema`, `teamMemberSchema`, lead metrics. |
| `apps/api/src/repositories/leads.ts`                     | Enquiry intake (public) and the pipeline (tenant), plus the response-time stamp.        |
| `apps/api/src/routes/leads.ts`                           | `POST /public/leads` (202, no record back), `GET /leads`, `PATCH /leads/:id`.           |
| `apps/api/src/repositories/deals.ts`                     | Lead counters folded into the single metrics query.                                     |
| `apps/marketplace/src/components/enquiry-form.tsx`       | "Ask about this car", the only place a buyer starts a conversation.                     |
| `apps/marketplace/src/app/dashboard/leads/page.tsx`      | The pipeline, unanswered first.                                                         |
| `apps/marketplace/src/components/dashboard/lead-row.tsx` | One enquiry: stage and owner, one control each.                                         |
| `apps/marketplace/src/lib/api.ts`                        | The `request` wrapper above, applied to all seventeen calls.                            |

## Verification

- `pnpm typecheck`, `pnpm lint`, Prettier: clean.
- **`verify:vehicles`: 55/55 PASS**, including nine new checks:

```
PASS  a buyer with no account can enquire -> 202
PASS  the acknowledgement carries no record back
PASS  enquiring about a draft -> 404 (the listing is not visible, so it does not exist)
PASS  the enquiry lands in the right dealership's pipeline, unanswered
PASS  another dealership cannot see that buyer at all
PASS  reading the pipeline without a token -> 401
PASS  the seller moves the lead along -> 200
PASS  response time is stamped by the API on the first move
PASS  another dealership cannot touch that lead -> 404
```

- **Browser, full loop:** sent an enquiry as an anonymous buyer from
  `/colecao/jaguar-f-type-r`; the page confirmed with the seller's name. It appeared at the top
  of the dealership's pipeline marked **new**, with the car, the message and the phone number.
  Moving it to Contacted stamped **"Answered in 0.1h"**, assigning it to Demo Dealer stuck, the
  stage counts updated (New 1, Contacted 2), and the overview's Buyers row read **1 unanswered,
  4 enquiries in 30 days, 2.4h average response**, which is the correct average of 0.1, 2 and 5.

## Still open

- **The home page contact form is still a fake.** It sets a "Message sent" state and throws
  the message away. It predates this work and was left alone on purpose: making it real is a
  **product decision**, because on a multi-seller platform a general enquiry has no seller to
  route to. Either it becomes a link into the collection ("enquire on a car"), or the platform
  itself grows an inbox. Worth deciding before a real visitor types into it.
- No email to the dealership yet: a lead appears in the dashboard and nowhere else. That is
  the natural next step, and it belongs on the queue (BullMQ) rather than in the request.
- Lead sources beyond the listing form (phone, walk-in) and a note history per lead.
