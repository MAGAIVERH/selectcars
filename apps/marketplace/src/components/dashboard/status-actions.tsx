"use client";

import { useActionState } from "react";
import { cn } from "@selectcars/ui";
import {
  VEHICLE_STATUS_TRANSITIONS,
  statusActionLabel,
  type VehicleStatus,
} from "@selectcars/shared";
import { changeVehicleStatusAction, type VehicleFormState } from "@/app/dashboard/actions";

const initial: VehicleFormState = {};

/**
 * The lifecycle controls for one listing.
 *
 * Which buttons exist is not a decision made here: it is read from
 * `VEHICLE_STATUS_TRANSITIONS` in `packages/shared`, the same map the API validates against.
 * So a dealer is never offered a move the server would refuse, and adding a step to the
 * workflow lights up the button by itself.
 *
 * One form, several submit buttons. A clicked submit button contributes its own name and
 * value to the submission, so `status` arrives set to whichever move was chosen: no client
 * state, and it still works if React has not hydrated yet.
 */
export function StatusActions({
  vehicleId,
  status,
  variant = "row",
}: {
  vehicleId: string;
  status: VehicleStatus;
  variant?: "row" | "panel";
}) {
  const [state, formAction, pending] = useActionState(changeVehicleStatusAction, initial);
  const targets = VEHICLE_STATUS_TRANSITIONS[status];

  return (
    <div className={variant === "panel" ? "" : "flex flex-col items-end gap-1.5"}>
      <form action={formAction} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="id" value={vehicleId} />
        {targets.map((target, index) => (
          <button
            key={target}
            type="submit"
            name="status"
            value={target}
            disabled={pending}
            className={cn(
              "rounded-full border px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors disabled:opacity-40",
              // The first move offered is the expected one (publish a draft, close a deal),
              // so it carries the weight. The rest stay quiet.
              index === 0 && variant === "panel"
                ? "border-foreground bg-foreground text-background hover:opacity-90"
                : "border-border-strong text-muted hover:border-foreground hover:text-foreground",
            )}
          >
            {statusActionLabel(status, target)}
          </button>
        ))}
      </form>

      {state.error && (
        <p role="alert" className="mt-2 text-xs text-red-600">
          {state.error}
        </p>
      )}
    </div>
  );
}
