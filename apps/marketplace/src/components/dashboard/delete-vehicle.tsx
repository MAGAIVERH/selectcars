"use client";

import { useActionState, useState } from "react";
import { deleteVehicleAction, type VehicleFormState } from "@/app/dashboard/actions";

const initial: VehicleFormState = {};

/**
 * Delete a listing, behind a deliberate second step.
 *
 * The confirmation is inline rather than a `window.confirm`: a native dialog cannot be
 * styled, is suppressed by some browsers, and reads poorly to a screen reader. Two clicks
 * with the consequence spelled out between them is the cheapest honest guard.
 */
export function DeleteVehicle({ vehicleId, name }: { vehicleId: string; name: string }) {
  const [confirming, setConfirming] = useState(false);
  const [state, formAction, pending] = useActionState(deleteVehicleAction, initial);

  if (!confirming) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="border-border-strong text-muted rounded-full border px-4 py-2 text-sm transition-colors hover:border-red-500 hover:text-red-600"
        >
          Delete listing
        </button>
        {state.error && (
          <p role="alert" className="mt-2 text-xs text-red-600">
            {state.error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <p className="text-foreground text-sm">
        Delete {name} for good? Its photos and history go with it, and buyers lose the page.
      </p>
      <form action={formAction} className="mt-3 flex items-center gap-3">
        <input type="hidden" name="id" value={vehicleId} />
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-red-600 px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Deleting" : "Yes, delete it"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="border-border-strong text-muted hover:border-foreground hover:text-foreground rounded-full border px-4 py-2 text-sm transition-colors"
        >
          Keep it
        </button>
      </form>
      {state.error && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {state.error}
        </p>
      )}
    </div>
  );
}
