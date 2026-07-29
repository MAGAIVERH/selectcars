import { headers } from "next/headers";
import {
  apiErrorSchema,
  dealListSchema,
  dealerProfileSchema,
  dealershipMetricsSchema,
  dealershipTrendsSchema,
  leadListSchema,
  photoUploadTicketSchema,
  vehicleListSchema,
  vehicleSchema,
  type AttachPhoto,
  type CreateDeal,
  type Deal,
  type DealerProfile,
  type DealershipMetrics,
  type DealershipTrends,
  type Lead,
  type UpdateLead,
  type PhotoUploadRequest,
  type PhotoUploadTicket,
  type UpdateDealerProfile,
  type Vehicle,
  type VehicleList,
  type ListVehiclesQuery,
  type CreateVehicle,
  type UpdateVehicle,
} from "@selectcars/shared";

/**
 * Server-side client for the SELECTCARS API (the Fastify service).
 *
 * The dashboard talks to the same API any external client would, rather than reaching into
 * the database directly: the API is the boundary that enforces RBAC and RLS. Requests are
 * authenticated with a short-lived access token minted from the dealer's own session.
 */

const API_URL = process.env.API_URL ?? "http://127.0.0.1:3333";
const AUTH_URL = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";

/**
 * One request to the API, with an unreachable API treated as an answer rather than a crash.
 *
 * `fetch` **rejects** when nothing is listening: the service is down, the container is
 * restarting, the URL is wrong. Left alone, that exception escapes a Server Action and the
 * UI is stuck on a spinner that never resolves, which is what happened the first time a
 * lead was moved while the API container was recycling.
 *
 * So a dead socket becomes `503`: the same shape as every other failure, so every caller
 * already knows how to show it.
 */
async function request(url: string, init?: RequestInit): Promise<Response | null> {
  try {
    return await fetch(url, { cache: "no-store", ...init });
  } catch {
    return null;
  }
}

const UNREACHABLE = 503;

/**
 * Mint a short-lived API access token for the signed-in dealer, from their session cookie.
 * The token carries the active tenant and role, which the API verifies via JWKS (ADR 002).
 */
export async function getDealerToken(): Promise<string | null> {
  const cookie = (await headers()).get("cookie") ?? "";
  if (!cookie) return null;

  const res = await request(`${AUTH_URL}/api/auth/token`, {
    headers: { cookie },
    cache: "no-store",
  });
  if (!res?.ok) return null;

  const data = (await res.json()) as { token?: string };
  return data.token ?? null;
}

export type InventoryResult = { ok: true; data: VehicleList } | { ok: false; status: number };

/** Fetch the signed-in dealer's inventory, tenant-scoped by the API. */
export async function fetchInventory(
  query: Partial<ListVehiclesQuery> = {},
): Promise<InventoryResult> {
  const token = await getDealerToken();
  if (!token) return { ok: false, status: 401 };

  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.search) params.set("search", query.search);
  params.set("limit", String(query.limit ?? 60));
  params.set("offset", String(query.offset ?? 0));

  const res = await request(`${API_URL}/vehicles?${params.toString()}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res) return { ok: false, status: UNREACHABLE };
  if (!res.ok) return { ok: false, status: res.status };

  const parsed = vehicleListSchema.safeParse(await res.json());
  if (!parsed.success) return { ok: false, status: 502 };
  return { ok: true, data: parsed.data };
}

export type CreateResult = { ok: true; id: string; slug: string } | { ok: false; status: number };

/** Create a vehicle in the signed-in dealer's inventory (RBAC + tenant enforced by the API). */
export async function createVehicle(input: CreateVehicle): Promise<CreateResult> {
  const token = await getDealerToken();
  if (!token) return { ok: false, status: 401 };

  const res = await request(`${API_URL}/vehicles`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  });
  if (!res) return { ok: false, status: UNREACHABLE };
  if (res.status !== 201) return { ok: false, status: res.status };

  const parsed = vehicleSchema.safeParse(await res.json());
  if (!parsed.success) return { ok: false, status: 502 };
  return { ok: true, id: parsed.data.id, slug: parsed.data.slug };
}

export type VehicleResult = { ok: true; data: Vehicle } | { ok: false; status: number };

/** Fetch one vehicle from the dealer's own inventory. Another tenant's id reads as 404. */
export async function fetchVehicle(id: string): Promise<VehicleResult> {
  const token = await getDealerToken();
  if (!token) return { ok: false, status: 401 };

  const res = await request(`${API_URL}/vehicles/${id}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res) return { ok: false, status: UNREACHABLE };
  if (!res.ok) return { ok: false, status: res.status };

  const parsed = vehicleSchema.safeParse(await res.json());
  if (!parsed.success) return { ok: false, status: 502 };
  return { ok: true, data: parsed.data };
}

export type MutationResult = { ok: true } | { ok: false; status: number; message: string | null };

/**
 * Read the API's own explanation out of a failed response.
 *
 * Worth the extra parse for one case in particular: a refused status change (409) carries a
 * message that names the actual rule ("A sold listing cannot move to draft."). Inventing our
 * own wording here would eventually contradict the API.
 */
async function readApiError(res: Response): Promise<string | null> {
  try {
    const parsed = apiErrorSchema.safeParse(await res.json());
    return parsed.success ? parsed.data.error.message : null;
  } catch {
    // A non-JSON body (a proxy error page, a crash) is not worth failing over.
    return null;
  }
}

/** Patch a vehicle. Only the fields present in `patch` are touched. */
export async function updateVehicle(id: string, patch: UpdateVehicle): Promise<MutationResult> {
  const token = await getDealerToken();
  if (!token) return { ok: false, status: 401, message: null };

  const res = await request(`${API_URL}/vehicles/${id}`, {
    method: "PATCH",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(patch),
    cache: "no-store",
  });
  if (!res) return { ok: false, status: UNREACHABLE, message: null };
  if (!res.ok) return { ok: false, status: res.status, message: await readApiError(res) };
  return { ok: true };
}

export type DealerProfileResult = { ok: true; data: DealerProfile } | { ok: false; status: number };

/** The signed-in dealership's public profile, as buyers see it on every one of its listings. */
export async function fetchDealership(): Promise<DealerProfileResult> {
  const token = await getDealerToken();
  if (!token) return { ok: false, status: 401 };

  const res = await request(`${API_URL}/dealership`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res) return { ok: false, status: UNREACHABLE };
  if (!res.ok) return { ok: false, status: res.status };

  const parsed = dealerProfileSchema.safeParse(await res.json());
  if (!parsed.success) return { ok: false, status: 502 };
  return { ok: true, data: parsed.data };
}

/** Save the dealership's public profile (owners and managers only, enforced by the API). */
export async function updateDealership(patch: UpdateDealerProfile): Promise<MutationResult> {
  const token = await getDealerToken();
  if (!token) return { ok: false, status: 401, message: null };

  const res = await request(`${API_URL}/dealership`, {
    method: "PATCH",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(patch),
    cache: "no-store",
  });
  if (!res) return { ok: false, status: UNREACHABLE, message: null };
  if (!res.ok) return { ok: false, status: res.status, message: await readApiError(res) };
  return { ok: true };
}

export type TrendsResult = { ok: true; data: DealershipTrends } | { ok: false; status: number };

/** The dealership's history, month by month. Owners and managers, like every money screen. */
export async function fetchTrends(months = 6): Promise<TrendsResult> {
  const token = await getDealerToken();
  if (!token) return { ok: false, status: 401 };

  const res = await request(`${API_URL}/metrics/trends?months=${months}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  if (!res) return { ok: false, status: UNREACHABLE };
  if (!res.ok) return { ok: false, status: res.status };

  const parsed = dealershipTrendsSchema.safeParse(await res.json());
  if (!parsed.success) return { ok: false, status: 502 };
  return { ok: true, data: parsed.data };
}

export type LeadsResult = { ok: true; data: Lead[] } | { ok: false; status: number };

/** The dealership's pipeline. Salespeople included: the conversations are theirs to work. */
export async function fetchLeads(): Promise<LeadsResult> {
  const token = await getDealerToken();
  if (!token) return { ok: false, status: 401 };

  const res = await request(`${API_URL}/leads`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res) return { ok: false, status: UNREACHABLE };
  if (!res.ok) return { ok: false, status: res.status };

  const parsed = leadListSchema.safeParse(await res.json());
  if (!parsed.success) return { ok: false, status: 502 };
  return { ok: true, data: parsed.data.items };
}

/** Move a lead along the pipeline, or hand it to someone. */
export async function updateLead(id: string, patch: UpdateLead): Promise<MutationResult> {
  const token = await getDealerToken();
  if (!token) return { ok: false, status: 401, message: null };

  const res = await request(`${API_URL}/leads/${id}`, {
    method: "PATCH",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(patch),
    cache: "no-store",
  });
  if (!res) return { ok: false, status: UNREACHABLE, message: null };
  if (!res.ok) return { ok: false, status: res.status, message: await readApiError(res) };
  return { ok: true };
}

export type MetricsResult = { ok: true; data: DealershipMetrics } | { ok: false; status: number };

/**
 * The dealership's numbers. Owners and managers only, enforced by the API: a salesperson may
 * sell a car but does not get to read what the store paid for it.
 */
export async function fetchMetrics(): Promise<MetricsResult> {
  const token = await getDealerToken();
  if (!token) return { ok: false, status: 401 };

  const res = await request(`${API_URL}/metrics`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res) return { ok: false, status: UNREACHABLE };
  if (!res.ok) return { ok: false, status: res.status };

  const parsed = dealershipMetricsSchema.safeParse(await res.json());
  if (!parsed.success) return { ok: false, status: 502 };
  return { ok: true, data: parsed.data };
}

export type DealsResult = { ok: true; data: Deal[] } | { ok: false; status: number };

/** Recorded sales, newest first. Pass a `vehicleId` for one car's history. */
export async function fetchDeals(vehicleId?: string): Promise<DealsResult> {
  const token = await getDealerToken();
  if (!token) return { ok: false, status: 401 };

  const query = vehicleId ? `?vehicleId=${encodeURIComponent(vehicleId)}` : "";
  const res = await request(`${API_URL}/deals${query}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res) return { ok: false, status: UNREACHABLE };
  if (!res.ok) return { ok: false, status: res.status };

  const parsed = dealListSchema.safeParse(await res.json());
  if (!parsed.success) return { ok: false, status: 502 };
  return { ok: true, data: parsed.data.items };
}

/** Record what a sold car actually made. The gross figures come back computed by Postgres. */
export async function createDeal(input: CreateDeal): Promise<MutationResult> {
  const token = await getDealerToken();
  if (!token) return { ok: false, status: 401, message: null };

  const res = await request(`${API_URL}/deals`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  });
  if (!res) return { ok: false, status: UNREACHABLE, message: null };
  if (res.status !== 201)
    return { ok: false, status: res.status, message: await readApiError(res) };
  return { ok: true };
}

export type UploadTicketResult =
  { ok: true; data: PhotoUploadTicket } | { ok: false; status: number; message: string | null };

/**
 * Ask the API for permission to upload one photo.
 *
 * The API decides the object key and signs a short-lived ticket for it. The browser then
 * sends the bytes straight to storage: they never pass through this app or the API.
 */
export async function requestPhotoUpload(
  vehicleId: string,
  input: PhotoUploadRequest,
): Promise<UploadTicketResult> {
  const token = await getDealerToken();
  if (!token) return { ok: false, status: 401, message: null };

  const res = await request(`${API_URL}/vehicles/${vehicleId}/photos/upload-url`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  });
  if (!res) return { ok: false, status: UNREACHABLE, message: null };
  if (res.status !== 201)
    return { ok: false, status: res.status, message: await readApiError(res) };

  const parsed = photoUploadTicketSchema.safeParse(await res.json());
  if (!parsed.success) return { ok: false, status: 502, message: null };
  return { ok: true, data: parsed.data };
}

/** Record an uploaded photo against the listing, once the bytes are in storage. */
export async function attachPhoto(vehicleId: string, input: AttachPhoto): Promise<MutationResult> {
  const token = await getDealerToken();
  if (!token) return { ok: false, status: 401, message: null };

  const res = await request(`${API_URL}/vehicles/${vehicleId}/photos`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  });
  if (!res) return { ok: false, status: UNREACHABLE, message: null };
  if (res.status !== 201)
    return { ok: false, status: res.status, message: await readApiError(res) };
  return { ok: true };
}

/** Remove a photo from a listing, and its object from storage. */
export async function deletePhoto(vehicleId: string, photoId: string): Promise<MutationResult> {
  const token = await getDealerToken();
  if (!token) return { ok: false, status: 401, message: null };

  const res = await request(`${API_URL}/vehicles/${vehicleId}/photos/${photoId}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res) return { ok: false, status: UNREACHABLE, message: null };
  if (res.status !== 204)
    return { ok: false, status: res.status, message: await readApiError(res) };
  return { ok: true };
}

/** Choose the photo buyers see first on the card and in the gallery. */
export async function setPrimaryPhoto(vehicleId: string, photoId: string): Promise<MutationResult> {
  const token = await getDealerToken();
  if (!token) return { ok: false, status: 401, message: null };

  const res = await request(`${API_URL}/vehicles/${vehicleId}/photos/${photoId}/primary`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res) return { ok: false, status: UNREACHABLE, message: null };
  if (res.status !== 204)
    return { ok: false, status: res.status, message: await readApiError(res) };
  return { ok: true };
}

/** Delete a vehicle. The API allows this for owners and managers only. */
export async function deleteVehicle(id: string): Promise<MutationResult> {
  const token = await getDealerToken();
  if (!token) return { ok: false, status: 401, message: null };

  const res = await request(`${API_URL}/vehicles/${id}`, {
    method: "DELETE",
    // No content-type: this request has no body, and announcing JSON without one makes
    // Fastify reject it as malformed.
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res) return { ok: false, status: UNREACHABLE, message: null };
  if (res.status !== 204)
    return { ok: false, status: res.status, message: await readApiError(res) };
  return { ok: true };
}
