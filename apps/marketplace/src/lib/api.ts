import { headers } from "next/headers";
import {
  apiErrorSchema,
  dealerProfileSchema,
  photoUploadTicketSchema,
  vehicleListSchema,
  vehicleSchema,
  type AttachPhoto,
  type DealerProfile,
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
 * Mint a short-lived API access token for the signed-in dealer, from their session cookie.
 * The token carries the active tenant and role, which the API verifies via JWKS (ADR 002).
 */
export async function getDealerToken(): Promise<string | null> {
  const cookie = (await headers()).get("cookie") ?? "";
  if (!cookie) return null;

  const res = await fetch(`${AUTH_URL}/api/auth/token`, {
    headers: { cookie },
    cache: "no-store",
  });
  if (!res.ok) return null;

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

  const res = await fetch(`${API_URL}/vehicles?${params.toString()}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
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

  const res = await fetch(`${API_URL}/vehicles`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  });
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

  const res = await fetch(`${API_URL}/vehicles/${id}`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
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

  const res = await fetch(`${API_URL}/vehicles/${id}`, {
    method: "PATCH",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(patch),
    cache: "no-store",
  });
  if (!res.ok) return { ok: false, status: res.status, message: await readApiError(res) };
  return { ok: true };
}

export type DealerProfileResult = { ok: true; data: DealerProfile } | { ok: false; status: number };

/** The signed-in dealership's public profile, as buyers see it on every one of its listings. */
export async function fetchDealership(): Promise<DealerProfileResult> {
  const token = await getDealerToken();
  if (!token) return { ok: false, status: 401 };

  const res = await fetch(`${API_URL}/dealership`, {
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) return { ok: false, status: res.status };

  const parsed = dealerProfileSchema.safeParse(await res.json());
  if (!parsed.success) return { ok: false, status: 502 };
  return { ok: true, data: parsed.data };
}

/** Save the dealership's public profile (owners and managers only, enforced by the API). */
export async function updateDealership(patch: UpdateDealerProfile): Promise<MutationResult> {
  const token = await getDealerToken();
  if (!token) return { ok: false, status: 401, message: null };

  const res = await fetch(`${API_URL}/dealership`, {
    method: "PATCH",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(patch),
    cache: "no-store",
  });
  if (!res.ok) return { ok: false, status: res.status, message: await readApiError(res) };
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

  const res = await fetch(`${API_URL}/vehicles/${vehicleId}/photos/upload-url`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  });
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

  const res = await fetch(`${API_URL}/vehicles/${vehicleId}/photos`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(input),
    cache: "no-store",
  });
  if (res.status !== 201)
    return { ok: false, status: res.status, message: await readApiError(res) };
  return { ok: true };
}

/** Remove a photo from a listing, and its object from storage. */
export async function deletePhoto(vehicleId: string, photoId: string): Promise<MutationResult> {
  const token = await getDealerToken();
  if (!token) return { ok: false, status: 401, message: null };

  const res = await fetch(`${API_URL}/vehicles/${vehicleId}/photos/${photoId}`, {
    method: "DELETE",
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (res.status !== 204)
    return { ok: false, status: res.status, message: await readApiError(res) };
  return { ok: true };
}

/** Choose the photo buyers see first on the card and in the gallery. */
export async function setPrimaryPhoto(vehicleId: string, photoId: string): Promise<MutationResult> {
  const token = await getDealerToken();
  if (!token) return { ok: false, status: 401, message: null };

  const res = await fetch(`${API_URL}/vehicles/${vehicleId}/photos/${photoId}/primary`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (res.status !== 204)
    return { ok: false, status: res.status, message: await readApiError(res) };
  return { ok: true };
}

/** Delete a vehicle. The API allows this for owners and managers only. */
export async function deleteVehicle(id: string): Promise<MutationResult> {
  const token = await getDealerToken();
  if (!token) return { ok: false, status: 401, message: null };

  const res = await fetch(`${API_URL}/vehicles/${id}`, {
    method: "DELETE",
    // No content-type: this request has no body, and announcing JSON without one makes
    // Fastify reject it as malformed.
    headers: { authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (res.status !== 204)
    return { ok: false, status: res.status, message: await readApiError(res) };
  return { ok: true };
}
