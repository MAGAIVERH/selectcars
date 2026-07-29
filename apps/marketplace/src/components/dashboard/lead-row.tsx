"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LEAD_STATUS_LABELS,
  leadStatusSchema,
  type Lead,
  type LeadStatus,
  type TeamMember,
} from "@selectcars/shared";
import { updateLeadAction } from "@/app/dashboard/actions";

const dateFmt = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

const selectClass =
  "rounded-full border border-border-strong bg-surface px-3 py-1.5 text-xs font-medium text-foreground outline-none transition-colors focus:border-foreground disabled:opacity-40";

/**
 * One enquiry, and the two decisions a dealership makes about it: where it is, and whose it
 * is. Both are one control each, because a pipeline that takes three clicks to advance is a
 * pipeline that stops being updated by Thursday.
 */
export function LeadRow({ lead, team }: { lead: Lead; team: TeamMember[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function change(patch: Parameters<typeof updateLeadAction>[1]): void {
    setError(null);
    startTransition(async () => {
      const result = await updateLeadAction(lead.id, patch);
      if (!result.ok) setError(result.error);
      router.refresh();
    });
  }

  return (
    <article className="border-border bg-surface rounded-[var(--radius-card)] border p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="text-foreground text-base font-semibold tracking-tight">
            {lead.buyerName}
            {lead.status === "new" && (
              <span className="ml-2 align-middle font-mono text-[10px] tracking-[0.12em] text-amber-700 uppercase">
                new
              </span>
            )}
          </h3>
          <p className="text-muted mt-1 text-sm">
            <a
              href={`mailto:${lead.buyerEmail}`}
              className="hover:text-foreground underline-offset-2 hover:underline"
            >
              {lead.buyerEmail}
            </a>
            {lead.buyerPhone ? ` · ${lead.buyerPhone}` : ""}
          </p>
        </div>

        <div className="text-right">
          <p className="text-faint font-mono text-[11px] tracking-[0.12em] uppercase">
            {dateFmt.format(lead.createdAt)}
          </p>
          {lead.responseHours !== null && (
            <p className="text-faint mt-1 text-xs">Answered in {lead.responseHours}h</p>
          )}
        </div>
      </div>

      {lead.vehicleLabel && (
        <p className="text-muted mt-3 text-sm">
          About{" "}
          {lead.vehicleSlug ? (
            <Link
              href={`/colecao/${lead.vehicleSlug}`}
              className="text-foreground underline-offset-2 hover:underline"
            >
              {lead.vehicleLabel}
            </Link>
          ) : (
            lead.vehicleLabel
          )}
        </p>
      )}

      {lead.message && (
        <p className="text-muted border-border mt-4 border-l-2 pl-4 text-sm leading-6">
          {lead.message}
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2">
          <span className="text-faint font-mono text-[10px] tracking-[0.12em] uppercase">
            Stage
          </span>
          <select
            aria-label={`Stage for ${lead.buyerName}`}
            value={lead.status}
            disabled={pending}
            onChange={(e) =>
              change({ status: leadStatusSchema.parse(e.target.value) as LeadStatus })
            }
            className={selectClass}
          >
            {leadStatusSchema.options.map((status) => (
              <option key={status} value={status}>
                {LEAD_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2">
          <span className="text-faint font-mono text-[10px] tracking-[0.12em] uppercase">
            Owner
          </span>
          <select
            aria-label={`Assign ${lead.buyerName}`}
            value={lead.assignedToUserId ?? ""}
            disabled={pending}
            onChange={(e) => change({ assignedToUserId: e.target.value || null })}
            className={selectClass}
          >
            <option value="">Unassigned</option>
            {team.map((member) => (
              <option key={member.userId} value={member.userId}>
                {member.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && (
        <p role="alert" className="mt-3 text-xs text-red-600">
          {error}
        </p>
      )}
    </article>
  );
}
