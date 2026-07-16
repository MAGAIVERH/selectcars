"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  conditionSchema,
  bodyStyleSchema,
  fuelTypeSchema,
  transmissionSchema,
  drivetrainSchema,
} from "@selectcars/shared";
import { createVehicleAction, type VehicleFormState } from "@/app/dashboard/actions";

const initial: VehicleFormState = {};

const CURRENT_YEAR = new Date().getFullYear();

export function VehicleForm() {
  const [state, formAction, pending] = useActionState(createVehicleAction, initial);
  const err = state.fieldErrors ?? {};

  return (
    <form action={formAction} className="mt-8">
      {state.error && (
        <p className="border-border-strong bg-surface text-foreground mb-6 rounded-[10px] border px-4 py-3 text-sm">
          {state.error}
        </p>
      )}

      <Section title="Identity">
        <Field name="make" label="Make" required error={err.make} placeholder="Porsche" />
        <Field name="model" label="Model" required error={err.model} placeholder="911 GT3 RS" />
        <Field
          name="year"
          label="Year"
          type="number"
          required
          error={err.year}
          min={1900}
          max={CURRENT_YEAR + 2}
          placeholder={String(CURRENT_YEAR)}
        />
        <Field name="trim" label="Trim" error={err.trim} placeholder="Weissach" />
        <Field name="vin" label="VIN" error={err.vin} placeholder="17 characters" />
      </Section>

      <Section title="Details">
        <SelectField
          name="condition"
          label="Condition"
          required
          options={conditionSchema.options}
          error={err.condition}
        />
        <SelectField
          name="bodyStyle"
          label="Body style"
          required
          options={bodyStyleSchema.options}
          error={err.bodyStyle}
        />
        <SelectField
          name="fuelType"
          label="Fuel type"
          required
          options={fuelTypeSchema.options}
          error={err.fuelType}
        />
        <SelectField
          name="transmission"
          label="Transmission"
          options={transmissionSchema.options}
          error={err.transmission}
          allowEmpty
        />
        <SelectField
          name="drivetrain"
          label="Drivetrain"
          options={drivetrainSchema.options}
          error={err.drivetrain}
          allowEmpty
        />
        <Field
          name="mileage"
          label="Mileage (mi)"
          type="number"
          min={0}
          error={err.mileage}
          placeholder="0"
        />
        <Field
          name="priceUsd"
          label="Price (USD)"
          type="number"
          min={0}
          error={err.priceUsd}
          placeholder="Leave blank for Inquire"
        />
      </Section>

      <Section title="Appearance">
        <Field
          name="exteriorColor"
          label="Exterior color"
          error={err.exteriorColor}
          placeholder="Carrara White"
        />
        <Field
          name="interiorColor"
          label="Interior color"
          error={err.interiorColor}
          placeholder="Black"
        />
      </Section>

      <div className="mt-8">
        <label htmlFor="description" className="eyebrow mb-2 block">
          Description
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          placeholder="One or two lines of editorial copy for the listing."
          className="border-border bg-surface text-foreground focus:border-foreground w-full rounded-[10px] border px-3 py-2 text-sm transition-colors outline-none"
        />
      </div>

      <div className="border-border mt-8 flex flex-col gap-4 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
        <label htmlFor="status" className="flex items-center gap-3 text-sm">
          <span className="eyebrow">Publish</span>
          <select
            id="status"
            name="status"
            defaultValue="draft"
            className="border-border bg-surface text-foreground focus:border-foreground rounded-[10px] border px-3 py-2 font-medium outline-none"
          >
            <option value="draft">Save as draft</option>
            <option value="active">Publish to marketplace</option>
          </select>
        </label>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard"
            className="border-border-strong text-muted hover:border-foreground hover:text-foreground rounded-full border px-5 py-2.5 text-sm transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={pending}
            className="bg-foreground text-background rounded-full px-6 py-2.5 text-sm font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Saving" : "Save vehicle"}
          </button>
        </div>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-border mt-8 border-t pt-6 first:mt-0 first:border-t-0 first:pt-0">
      <legend className="sr-only">{title}</legend>
      <p className="eyebrow mb-4">{title}</p>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </fieldset>
  );
}

function Field({
  name,
  label,
  type = "text",
  required,
  error,
  placeholder,
  min,
  max,
}: {
  name: string;
  label: string;
  type?: string;
  required?: boolean;
  error?: string;
  placeholder?: string;
  min?: number;
  max?: number;
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
        placeholder={placeholder}
        min={min}
        max={max}
        aria-invalid={error ? true : undefined}
        className="border-border bg-surface text-foreground focus:border-foreground w-full rounded-[10px] border px-3 py-2 text-sm transition-colors outline-none aria-[invalid]:border-red-500"
      />
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function SelectField({
  name,
  label,
  options,
  required,
  error,
  allowEmpty,
}: {
  name: string;
  label: string;
  options: readonly string[];
  required?: boolean;
  error?: string;
  allowEmpty?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="text-muted mb-1.5 block text-sm font-medium">
        {label}
        {required && <span className="text-faint"> *</span>}
      </label>
      <select
        id={name}
        name={name}
        required={required}
        defaultValue={allowEmpty ? "" : options[0]}
        aria-invalid={error ? true : undefined}
        className="border-border bg-surface text-foreground focus:border-foreground w-full rounded-[10px] border px-3 py-2 text-sm transition-colors outline-none"
      >
        {allowEmpty && <option value="">Not specified</option>}
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
