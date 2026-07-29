"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { refreshInsightsAction } from "@/app/dashboard/actions";

/**
 * "Look at my inventory again."
 *
 * The honest part of this component is what it says when it succeeds. The click queues a
 * job; it does not produce insights. So the button reports **"Queued"**, not "Done", and the
 * dealer refreshes when they want to see the result.
 *
 * The tempting alternative, spinning until the run finishes, would rebuild the exact problem
 * the queue exists to solve: a screen held open by a market scan and, when a model is
 * configured, a network call to it.
 */
export function RefreshInsights() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  function run(): void {
    setMessage(null);
    setFailed(false);
    startTransition(async () => {
      const result = await refreshInsightsAction();
      if (result.ok) {
        setMessage("Queued. Reload in a moment to see the new reading.");
        setFailed(false);
        // Refresh anyway: a fast run may already have landed by the time the click settles.
        router.refresh();
        return;
      }
      setMessage(result.error);
      setFailed(true);
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={run}
        disabled={pending}
        className="border-border-strong text-muted hover:border-foreground hover:text-foreground rounded-full border px-4 py-2 text-sm transition-colors disabled:opacity-40"
      >
        {pending ? "Queueing…" : "Run again"}
      </button>
      {message && (
        <p
          role="status"
          className={`max-w-xs text-right text-xs ${failed ? "text-red-700" : "text-muted"}`}
        >
          {message}
        </p>
      )}
    </div>
  );
}
