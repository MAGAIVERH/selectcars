"use server";

import { createLeadSchema } from "@selectcars/shared";
import { submitLead } from "@/lib/public-api";

export type EnquiryState = {
  sent?: boolean;
  error?: string;
  fieldErrors?: Record<string, string>;
};

/**
 * A buyer's enquiry about one car.
 *
 * Public: no session, no token. What keeps it safe is that the only thing the buyer chooses
 * is **which car**, and the dealership is derived from that vehicle server side. They cannot
 * address an enquiry to a seller who has nothing to do with the listing, and they cannot read
 * anything back: the API answers "received" and returns no record.
 */
export async function submitEnquiryAction(
  _prev: EnquiryState,
  formData: FormData,
): Promise<EnquiryState> {
  const value = (field: string): string | undefined => {
    const raw = formData.get(field);
    const text = typeof raw === "string" ? raw.trim() : "";
    return text === "" ? undefined : text;
  };

  const parsed = createLeadSchema.safeParse({
    vehicleId: value("vehicleId"),
    buyerName: value("buyerName"),
    buyerEmail: value("buyerEmail"),
    buyerPhone: value("buyerPhone") ?? null,
    message: value("message") ?? null,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: "Please check the highlighted fields.", fieldErrors };
  }

  const result = await submitLead(parsed.data);
  if (!result.ok) {
    if (result.status === 404) {
      return { error: "This listing is no longer available." };
    }
    return { error: "We could not send your message. Please try again." };
  }

  return { sent: true };
}
