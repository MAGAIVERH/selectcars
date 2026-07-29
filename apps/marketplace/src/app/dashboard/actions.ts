"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  changeVehicleStatusSchema,
  createDealSchema,
  createVehicleSchema,
  photoUploadRequestSchema,
  updateDealerProfileSchema,
  updateLeadSchema,
  updateVehicleSchema,
  type PhotoUploadRequest,
  type UpdateLead,
} from "@selectcars/shared";
import {
  attachPhoto,
  createDeal,
  createVehicle,
  deletePhoto,
  deleteVehicle,
  requestPhotoUpload,
  setPrimaryPhoto,
  updateDealership,
  updateLead,
  updateVehicle,
} from "@/lib/api";

export type VehicleFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

/** Same shape, plus the one thing a settings screen needs that a create form does not. */
export type DealershipFormState = VehicleFormState & { saved?: boolean };

function str(v: FormDataEntryValue | null): string | undefined {
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? undefined : s;
}

function num(v: FormDataEntryValue | null): number | undefined {
  const s = typeof v === "string" ? v.trim() : "";
  if (s === "") return undefined;
  const n = Number(s);
  return Number.isNaN(n) ? undefined : n;
}

/**
 * A browser posts every field as a string, and an untouched field as `""`. This turns that
 * back into the shape the contract describes, once, for both create and edit: there is no
 * second place where "empty means null" could be decided differently.
 *
 * Optional fields become `null`, never `undefined`. That distinction matters on edit: a
 * partial update treats `undefined` as "leave it alone", so a dealer who clears the trim
 * would watch the old value come back. `null` says "the dealer emptied this", and the
 * column is set to null. Required fields stay `undefined` when empty, so validation catches
 * them instead of silently writing a blank.
 */
function readVehicleForm(formData: FormData): Record<string, unknown> {
  const optional = (field: string) => str(formData.get(field)) ?? null;

  return {
    vin: optional("vin"),
    make: str(formData.get("make")),
    model: str(formData.get("model")),
    year: num(formData.get("year")),
    trim: optional("trim"),
    mileage: num(formData.get("mileage")) ?? 0,
    priceUsd: num(formData.get("priceUsd")) ?? null,
    condition: str(formData.get("condition")),
    bodyStyle: str(formData.get("bodyStyle")),
    fuelType: str(formData.get("fuelType")),
    transmission: optional("transmission"),
    drivetrain: optional("drivetrain"),
    exteriorColor: optional("exteriorColor"),
    interiorColor: optional("interiorColor"),
    description: optional("description"),
  };
}

/** Turn Zod issues into one message per field, which is all a form input can show. */
function toFieldErrors(issues: { path: PropertyKey[]; message: string }[]): VehicleFormState {
  const fieldErrors: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
  }
  return { error: "Please fix the highlighted fields.", fieldErrors };
}

/**
 * One place that decides what an HTTP failure means to a dealer looking at a form.
 *
 * For the two statuses where the API knows the reason and we do not, its own message wins:
 * a refused status change (409) names the rule, and an unavailable dependency (503) names
 * what is switched off. Paraphrasing either one here would eventually contradict the server.
 */
function describeFailure(status: number, message: string | null): string {
  if (status === 401) return "Your session expired. Please sign in again.";
  if (status === 403) return "You do not have permission to do that.";
  if (status === 404) return "That vehicle is no longer in your inventory.";
  if (status === 409) return message ?? "That status change is not allowed.";
  // 503 is either a switched-off dependency (the API says which) or the API itself being
  // unreachable, which the client reports with the same status and no message.
  if (status === 503) return message ?? "The API is not responding. Try again in a moment.";
  return `The change could not be saved (error ${status}).`;
}

/**
 * Create a vehicle from the dashboard form. Validation is the shared `createVehicleSchema`,
 * the same contract the API enforces, so the client and server never disagree on what a valid
 * listing is. The tenant and role come from the session-minted token inside `createVehicle`,
 * never from the form, so a dealer cannot write into another dealership.
 */
export async function createVehicleAction(
  _prev: VehicleFormState,
  formData: FormData,
): Promise<VehicleFormState> {
  const parsed = createVehicleSchema.safeParse({
    ...readVehicleForm(formData),
    status: str(formData.get("status")) ?? "draft",
  });
  if (!parsed.success) return toFieldErrors(parsed.error.issues);

  const result = await createVehicle(parsed.data);
  if (!result.ok) return { error: describeFailure(result.status, null) };

  // The dashboard list and (if published) the marketplace read live, so refresh them.
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/inventory");
  // Straight to the new listing rather than back to the list: photos can only be attached
  // to a car that exists, so this is where the dealer's next step actually is.
  redirect(`/dashboard/vehicles/${result.id}`);
}

/**
 * Save an edit. The vehicle id travels in a hidden field rather than in the action's closure
 * so the same form component serves create and edit; it is safe either way, because the API
 * resolves that id inside the caller's tenant and a foreign id simply reads as 404.
 *
 * The status is deliberately NOT part of this form. Moving a car through its lifecycle is a
 * decision with its own rules, and it belongs to the status actions below.
 */
export async function updateVehicleAction(
  _prev: VehicleFormState,
  formData: FormData,
): Promise<VehicleFormState> {
  const id = str(formData.get("id"));
  if (!id) return { error: "Missing vehicle id." };

  const parsed = updateVehicleSchema.safeParse(readVehicleForm(formData));
  if (!parsed.success) return toFieldErrors(parsed.error.issues);

  const result = await updateVehicle(id, parsed.data);
  if (!result.ok) return { error: describeFailure(result.status, result.message) };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/inventory");
  revalidatePath(`/dashboard/vehicles/${id}`);
  redirect("/dashboard/inventory");
}

/**
 * Move a vehicle along its lifecycle (publish, mark pending, mark sold, relist).
 *
 * The legality of the move is checked by the API against the row's committed status, inside
 * the transaction that writes it. This action does not second-guess that: it only reports
 * what came back, so the button and a raw `curl` get the same answer.
 */
export async function changeVehicleStatusAction(
  _prev: VehicleFormState,
  formData: FormData,
): Promise<VehicleFormState> {
  const id = str(formData.get("id"));
  if (!id) return { error: "Missing vehicle id." };

  const parsed = changeVehicleStatusSchema.safeParse({ status: str(formData.get("status")) });
  if (!parsed.success) return { error: "Unknown status." };

  const result = await updateVehicle(id, { status: parsed.data.status });
  if (!result.ok) return { error: describeFailure(result.status, result.message) };

  // Stay where we are: the dealer wants to see the new state, not be sent somewhere.
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/inventory");
  revalidatePath(`/dashboard/vehicles/${id}`);
  return {};
}

/**
 * Save the dealership's public identity: the name, city, and pitch buyers read next to every
 * one of its cars. Owners and managers only, enforced by the API, not by hiding the form.
 *
 * `saved` rather than a redirect: this is a settings screen a dealer stays on, and being
 * thrown back to the inventory after a one-field edit reads as an error.
 */
export async function updateDealershipAction(
  _prev: DealershipFormState,
  formData: FormData,
): Promise<DealershipFormState> {
  const parsed = updateDealerProfileSchema.safeParse({
    name: str(formData.get("name")),
    city: str(formData.get("city")) ?? null,
    // Uppercased here so a dealer typing "fl" is not lectured about a format.
    state: str(formData.get("state"))?.toUpperCase() ?? null,
    phone: str(formData.get("phone")) ?? null,
    about: str(formData.get("about")) ?? null,
  });
  if (!parsed.success) return toFieldErrors(parsed.error.issues);

  const result = await updateDealership(parsed.data);
  if (!result.ok) return { error: describeFailure(result.status, result.message) };

  revalidatePath("/dashboard/dealership");
  // The public pages are deliberately NOT revalidated here. They read the API with
  // `cache: "no-store"`, so every visitor already gets the current seller name and city;
  // there is no cache entry to invalidate. Asking for it anyway made the dev server
  // re-render three routes at once and fail its own `/api/auth/token` call mid-save.
  return { saved: true };
}

/**
 * Photo actions.
 *
 * These take plain arguments rather than a `FormData`, because they are called from the
 * uploader component in a sequence (ask, upload, record) rather than from a form submit.
 * The dealer's token is minted inside the API client on the server, so the browser never
 * holds a credential for either our API or storage.
 */
export type UploadTicketState =
  { ok: true; uploadUrl: string; storageKey: string } | { ok: false; error: string };

/** Step 1: permission to upload one photo for this listing. */
export async function requestPhotoUploadAction(
  vehicleId: string,
  input: PhotoUploadRequest,
): Promise<UploadTicketState> {
  const parsed = photoUploadRequestSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "That file cannot be uploaded." };
  }

  const result = await requestPhotoUpload(vehicleId, parsed.data);
  if (!result.ok) {
    // 404 here means the vehicle, not a missing route, so the shared wording still fits.
    return { ok: false, error: describeFailure(result.status, result.message) };
  }
  return { ok: true, uploadUrl: result.data.uploadUrl, storageKey: result.data.storageKey };
}

/** Step 3: the bytes are in storage, so record the photo against the listing. */
export async function attachPhotoAction(
  vehicleId: string,
  storageKey: string,
  alt: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await attachPhoto(vehicleId, { storageKey, alt: alt || null, isPrimary: false });
  if (!result.ok) return { ok: false, error: describeFailure(result.status, result.message) };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/inventory");
  revalidatePath(`/dashboard/vehicles/${vehicleId}`);
  return { ok: true };
}

export async function deletePhotoAction(
  vehicleId: string,
  photoId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await deletePhoto(vehicleId, photoId);
  if (!result.ok) return { ok: false, error: describeFailure(result.status, result.message) };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/inventory");
  revalidatePath(`/dashboard/vehicles/${vehicleId}`);
  return { ok: true };
}

export async function setPrimaryPhotoAction(
  vehicleId: string,
  photoId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const result = await setPrimaryPhoto(vehicleId, photoId);
  if (!result.ok) return { ok: false, error: describeFailure(result.status, result.message) };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/inventory");
  revalidatePath(`/dashboard/vehicles/${vehicleId}`);
  return { ok: true };
}

/**
 * Record what a sold car actually made.
 *
 * Only four figures are typed: sale price, what the unit cost, reconditioning, and the
 * finance office's contribution. Front-end and total gross are **not** sent: they are
 * generated columns, so the dashboard cannot be talked into a total that does not add up.
 */
export async function recordSaleAction(
  _prev: VehicleFormState,
  formData: FormData,
): Promise<VehicleFormState> {
  const parsed = createDealSchema.safeParse({
    vehicleId: str(formData.get("vehicleId")),
    soldAt: str(formData.get("soldAt")),
    salePriceUsd: num(formData.get("salePriceUsd")),
    vehicleCostUsd: num(formData.get("vehicleCostUsd")),
    reconCostUsd: num(formData.get("reconCostUsd")) ?? 0,
    backEndGrossUsd: num(formData.get("backEndGrossUsd")) ?? 0,
    buyerName: str(formData.get("buyerName")) ?? null,
    notes: str(formData.get("notes")) ?? null,
  });
  if (!parsed.success) return toFieldErrors(parsed.error.issues);

  const result = await createDeal(parsed.data);
  if (!result.ok) return { error: describeFailure(result.status, result.message) };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/inventory");
  revalidatePath(`/dashboard/vehicles/${parsed.data.vehicleId}`);
  return {};
}

/**
 * Move a lead along the pipeline, or hand it to a salesperson.
 *
 * The first time a lead leaves `new`, the API stamps the response time. That is not done
 * here on purpose: whichever screen or script moves a lead next would have to remember to do
 * it, and one that forgets makes the response-time figure quietly wrong.
 */
export async function updateLeadAction(
  leadId: string,
  patch: UpdateLead,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = updateLeadSchema.safeParse(patch);
  if (!parsed.success) return { ok: false, error: "That change is not valid." };

  const result = await updateLead(leadId, parsed.data);
  if (!result.ok) return { ok: false, error: describeFailure(result.status, result.message) };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/leads");
  return { ok: true };
}

/** Remove a listing for good. The API restricts this to owners and managers. */
export async function deleteVehicleAction(
  _prev: VehicleFormState,
  formData: FormData,
): Promise<VehicleFormState> {
  const id = str(formData.get("id"));
  if (!id) return { error: "Missing vehicle id." };

  const result = await deleteVehicle(id);
  if (!result.ok) return { error: describeFailure(result.status, result.message) };

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/inventory");
  redirect("/dashboard/inventory");
}
