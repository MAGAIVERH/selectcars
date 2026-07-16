import { headers } from "next/headers";
import {
  vehicleListSchema,
  vehicleSchema,
  type VehicleList,
  type ListVehiclesQuery,
  type CreateVehicle,
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

export type CreateResult = { ok: true; slug: string } | { ok: false; status: number };

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
  return { ok: true, slug: parsed.data.slug };
}
