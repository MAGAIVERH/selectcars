"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createVehicleSchema } from "@selectcars/shared";
import { createVehicle } from "@/lib/api";

export type VehicleFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

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
 * Create a vehicle from the dashboard form. Validation is the shared `createVehicleSchema`,
 * the same contract the API enforces, so the client and server never disagree on what a valid
 * listing is. The tenant and role come from the session-minted token inside `createVehicle`,
 * never from the form, so a dealer cannot write into another dealership.
 */
export async function createVehicleAction(
  _prev: VehicleFormState,
  formData: FormData,
): Promise<VehicleFormState> {
  const raw = {
    vin: str(formData.get("vin")),
    make: str(formData.get("make")),
    model: str(formData.get("model")),
    year: num(formData.get("year")),
    trim: str(formData.get("trim")),
    mileage: num(formData.get("mileage")) ?? 0,
    priceUsd: num(formData.get("priceUsd")) ?? null,
    condition: str(formData.get("condition")),
    bodyStyle: str(formData.get("bodyStyle")),
    fuelType: str(formData.get("fuelType")),
    transmission: str(formData.get("transmission")),
    drivetrain: str(formData.get("drivetrain")),
    exteriorColor: str(formData.get("exteriorColor")),
    interiorColor: str(formData.get("interiorColor")),
    description: str(formData.get("description")),
    status: str(formData.get("status")) ?? "draft",
  };

  const parsed = createVehicleSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: "Please fix the highlighted fields.", fieldErrors };
  }

  const result = await createVehicle(parsed.data);
  if (!result.ok) {
    if (result.status === 401) return { error: "Your session expired. Please sign in again." };
    if (result.status === 403) return { error: "You do not have permission to add vehicles." };
    return { error: `The vehicle could not be saved (error ${result.status}).` };
  }

  // The dashboard list and (if published) the marketplace read live, so refresh them.
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
