"use client";

import { useActionState } from "react";
import type { Deal } from "@selectcars/shared";
import { recordSaleAction, type VehicleFormState } from "@/app/dashboard/actions";

const initial: VehicleFormState = {};

const usd0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/**
 * What a sold car made, recorded once and never recomputed by a screen.
 *
 * The form asks for four figures and nothing more. Front-end gross and total gross are
 * generated columns in the database, so they are shown back to the dealer rather than typed:
 * a dashboard that lets you type a total is a dashboard whose totals eventually lie.
 */
export function RecordSale({ vehicleId, deal }: { vehicleId: string; deal?: Deal }) {
  const [state, formAction, pending] = useActionState(recordSaleAction, initial);
  const err = state.fieldErrors ?? {};

  if (deal) {
    return (
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
        <Figure label="Sale price" value={usd0.format(deal.salePriceUsd)} />
        <Figure label="Front-end gross" value={usd0.format(deal.frontEndGrossUsd)} />
        <Figure label="Back-end gross" value={usd0.format(deal.backEndGrossUsd)} />
        <Figure label="Total gross" value={usd0.format(deal.totalGrossUsd)} strong />
        <Figure label="Sold" value={deal.soldAt} />
        <Figure
          label="Days to sale"
          value={deal.daysToSale === null ? "—" : String(deal.daysToSale)}
        />
        <Figure label="Cost" value={usd0.format(deal.vehicleCostUsd)} />
        <Figure label="Reconditioning" value={usd0.format(deal.reconCostUsd)} />
        {deal.buyerName && <Figure label="Buyer" value={deal.buyerName} />}
      </dl>
    );
  }

  return (
    <form action={formAction} className="mt-4 max-w-2xl">
      <input type="hidden" name="vehicleId" value={vehicleId} />

      {state.error && (
        <p
          role="alert"
          className="border-border-strong bg-surface text-foreground mb-5 rounded-[10px] border px-4 py-3 text-sm"
        >
          {state.error}
        </p>
      )}

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <Field name="salePriceUsd" label="Sale price" required error={err.salePriceUsd} />
        <Field
          name="vehicleCostUsd"
          label="What it cost you"
          required
          error={err.vehicleCostUsd}
          hint="Auction, trade allowance, wholesale"
        />
        <Field
          name="reconCostUsd"
          label="Reconditioning"
          error={err.reconCostUsd}
          hint="Detailing, tyres, mechanical"
        />
        <Field
          name="backEndGrossUsd"
          label="Back-end gross"
          error={err.backEndGrossUsd}
          hint="Financing, warranty, GAP"
          allowNegative
        />
        <Field name="soldAt" label="Sold on" type="date" error={err.soldAt} />
        <Field name="buyerName" label="Buyer" type="text" error={err.buyerName} />
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <p className="text-faint text-xs">
          Front-end and total gross are calculated by the system, not typed.
        </p>
        <button
          type="submit"
          disabled={pending}
          className="bg-foreground text-background rounded-full px-6 py-2.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Saving" : "Record the sale"}
        </button>
      </div>
    </form>
  );
}

function Figure({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <dt className="text-faint font-mono text-[11px] tracking-[0.12em] uppercase">{label}</dt>
      <dd
        className={`mt-1 text-sm ${strong ? "text-foreground font-semibold" : "text-foreground"}`}
      >
        {value}
      </dd>
    </div>
  );
}

function Field({
  name,
  label,
  type = "number",
  required,
  error,
  hint,
  allowNegative,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  allowNegative?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="text-muted mb-1.5 block text-sm font-medium">
        {label}
        {required && <span className="text-faint"> *</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        step={type === "number" ? "1" : undefined}
        min={type === "number" && !allowNegative ? 0 : undefined}
        aria-invalid={error ? true : undefined}
        className="border-border bg-surface text-foreground focus:border-foreground w-full rounded-[10px] border px-3 py-2 text-sm transition-colors outline-none aria-[invalid]:border-red-500"
      />
      {hint && <p className="text-faint mt-1.5 text-xs">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
