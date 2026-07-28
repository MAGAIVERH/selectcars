"use client";

import { useActionState } from "react";
import type { DealerProfile } from "@selectcars/shared";
import { updateDealershipAction, type DealershipFormState } from "@/app/dashboard/actions";

const initial: DealershipFormState = {};

/**
 * The dealership's public identity, edited by its own team.
 *
 * Everything here is read by buyers, which is why the copy says so next to each field: a
 * settings form that does not tell you who sees the value invites people to leave it blank.
 */
export function DealershipForm({ profile }: { profile: DealerProfile }) {
  const [state, formAction, pending] = useActionState(updateDealershipAction, initial);
  const err = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="mt-8 max-w-2xl">
      {state.error && (
        <p
          role="alert"
          className="border-border-strong bg-surface text-foreground mb-6 rounded-[10px] border px-4 py-3 text-sm"
        >
          {state.error}
        </p>
      )}
      {state.saved && !state.error && (
        <p
          role="status"
          className="border-border-strong bg-surface text-foreground mb-6 rounded-[10px] border px-4 py-3 text-sm"
        >
          Saved. Buyers see this on every listing you publish.
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="name">Dealership name</Label>
          <input
            id="name"
            name="name"
            required
            defaultValue={profile.name}
            className={inputClass}
            aria-invalid={err.name ? true : undefined}
          />
          <Hint>Shown as the seller on every car you publish.</Hint>
          <Error message={err.name} />
        </div>

        <div>
          <Label htmlFor="city">City</Label>
          <input
            id="city"
            name="city"
            defaultValue={profile.city ?? ""}
            placeholder="Miami"
            className={inputClass}
            aria-invalid={err.city ? true : undefined}
          />
          <Error message={err.city} />
        </div>

        <div>
          <Label htmlFor="state">State</Label>
          <input
            id="state"
            name="state"
            maxLength={2}
            defaultValue={profile.state ?? ""}
            placeholder="FL"
            className={`${inputClass} uppercase`}
            aria-invalid={err.state ? true : undefined}
          />
          <Hint>Two-letter code. Buyers filter and travel by it.</Hint>
          <Error message={err.state} />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="phone">Phone</Label>
          <input
            id="phone"
            name="phone"
            type="tel"
            defaultValue={profile.phone ?? ""}
            placeholder="+1 (305) 000-0000"
            className={inputClass}
            aria-invalid={err.phone ? true : undefined}
          />
          <Error message={err.phone} />
        </div>

        <div className="sm:col-span-2">
          <Label htmlFor="about">About</Label>
          <textarea
            id="about"
            name="about"
            rows={4}
            defaultValue={profile.about ?? ""}
            placeholder="What you specialize in, and how you work."
            className={inputClass}
            aria-invalid={err.about ? true : undefined}
          />
          <Hint>Up to 600 characters, shown on your dealership page.</Hint>
          <Error message={err.about} />
        </div>
      </div>

      <div className="border-border mt-8 flex items-center justify-between border-t pt-6">
        <p className="text-faint text-xs">
          Your public page: <span className="font-mono">/dealers/{profile.slug}</span>
        </p>
        <button
          type="submit"
          disabled={pending}
          className="bg-foreground text-background rounded-full px-6 py-2.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Saving" : "Save profile"}
        </button>
      </div>
    </form>
  );
}

const inputClass =
  "border-border bg-surface text-foreground focus:border-foreground w-full rounded-[10px] border px-3 py-2 text-sm transition-colors outline-none aria-[invalid]:border-red-500";

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-muted mb-1.5 block text-sm font-medium">
      {children}
    </label>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p className="text-faint mt-1.5 text-xs">{children}</p>;
}

function Error({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-xs text-red-600">{message}</p> : null;
}
