"use client";

import { useActionState } from "react";
import { submitEnquiryAction, type EnquiryState } from "@/app/colecao/actions";

const initial: EnquiryState = {};

const inputClass =
  "w-full rounded-[10px] border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-faint focus:border-border-strong aria-[invalid]:border-red-500";

/**
 * "Ask about this car", on the listing page.
 *
 * This is the only place a buyer can start a conversation, and that is deliberate: an enquiry
 * always belongs to a car, and therefore to the dealership selling it. A general contact form
 * with no car attached would have nobody to route to on a platform with many sellers.
 */
export function EnquiryForm({ vehicleId, dealerName }: { vehicleId: string; dealerName: string }) {
  const [state, formAction, pending] = useActionState(submitEnquiryAction, initial);
  const err = state.fieldErrors ?? {};

  if (state.sent) {
    return (
      <div
        role="status"
        className="border-border bg-surface mt-8 rounded-[var(--radius-card)] border p-6 text-center"
      >
        <p className="text-foreground text-base font-medium">Message sent.</p>
        <p className="text-muted mt-2 text-sm">
          {dealerName} has your details and will be in touch.
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="border-border bg-surface mt-8 rounded-[var(--radius-card)] border p-6"
    >
      <input type="hidden" name="vehicleId" value={vehicleId} />

      <p className="eyebrow">Ask about this car</p>
      <p className="text-muted mt-2 text-sm">Your message goes straight to {dealerName}.</p>

      {state.error && (
        <p role="alert" className="mt-4 text-sm text-red-600">
          {state.error}
        </p>
      )}

      <div className="mt-5 space-y-3">
        <div>
          <input
            name="buyerName"
            required
            placeholder="Full name"
            aria-label="Full name"
            aria-invalid={err.buyerName ? true : undefined}
            className={inputClass}
          />
          {err.buyerName && <p className="mt-1 text-xs text-red-600">{err.buyerName}</p>}
        </div>
        <div>
          <input
            name="buyerEmail"
            type="email"
            required
            placeholder="Email"
            aria-label="Email"
            aria-invalid={err.buyerEmail ? true : undefined}
            className={inputClass}
          />
          {err.buyerEmail && <p className="mt-1 text-xs text-red-600">{err.buyerEmail}</p>}
        </div>
        <input
          name="buyerPhone"
          placeholder="Phone (optional)"
          aria-label="Phone"
          className={inputClass}
        />
        <textarea
          name="message"
          rows={3}
          placeholder="Anything you want to know: history, financing, a test drive"
          aria-label="Message"
          className={`${inputClass} resize-none`}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="bg-foreground text-background mt-5 w-full rounded-full px-6 py-3 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Sending" : "Send message"}
      </button>
    </form>
  );
}
