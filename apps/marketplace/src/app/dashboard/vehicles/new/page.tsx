import Link from "next/link";
import { SITE } from "@selectcars/shared";
import { VehicleForm } from "@/components/dashboard/vehicle-form";

export const metadata = {
  title: `Add vehicle · ${SITE.name}`,
};

export default function NewVehiclePage() {
  return (
    <div className="mx-auto max-w-[900px]">
      <Link
        href="/dashboard"
        className="text-muted hover:text-foreground text-sm transition-colors"
      >
        <span aria-hidden="true">←</span> Back to inventory
      </Link>

      <div className="mt-6">
        <span className="eyebrow">New listing</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Add a vehicle</h1>
        <p className="text-muted mt-2 max-w-xl text-sm">
          Save it as a draft to finish later, or publish it straight to the marketplace. You can add
          photos after it is created.
        </p>
      </div>

      <VehicleForm />
    </div>
  );
}
