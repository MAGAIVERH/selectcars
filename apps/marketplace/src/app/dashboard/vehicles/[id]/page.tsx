import Link from "next/link";
import { notFound } from "next/navigation";
import { SITE, type VehicleStatus } from "@selectcars/shared";
import { fetchVehicle } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import { StatusPill } from "@/components/dashboard/status-pill";
import { StatusActions } from "@/components/dashboard/status-actions";
import { DeleteVehicle } from "@/components/dashboard/delete-vehicle";
import { PhotoManager } from "@/components/dashboard/photo-manager";
import { VehicleForm } from "@/components/dashboard/vehicle-form";

type Params = Promise<{ id: string }>;

export const metadata = {
  title: `Edit vehicle · ${SITE.name}`,
};

/** What each status means for this car, in the dealer's terms, not the database's. */
const STATUS_EXPLANATION: Record<VehicleStatus, string> = {
  draft: "Only your team can see this. Publish it to put it in front of buyers.",
  active: "Live on the marketplace right now, and open to inquiries.",
  pending: "Off the market while a deal is in progress. It stays in your inventory.",
  sold: "Closed. Relist it only if the deal came undone.",
};

export default async function EditVehiclePage({ params }: { params: Params }) {
  const { id } = await params;
  const result = await fetchVehicle(id);

  // The API resolves the id inside this dealer's tenant, so another dealership's vehicle
  // arrives here as a 404 and renders as one. There is no "you are not allowed to see this
  // car" screen, because that screen would confirm the car exists.
  if (!result.ok) {
    if (result.status === 404) notFound();
    return <LoadFailed status={result.status} />;
  }

  const vehicle = result.data;
  const title = `${vehicle.make} ${vehicle.model}`;

  return (
    <div className="mx-auto max-w-[900px]">
      <Link
        href="/dashboard"
        className="text-muted hover:text-foreground text-sm transition-colors"
      >
        <span aria-hidden="true">←</span> Back to inventory
      </Link>

      <div className="mt-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="eyebrow">Listing</span>
          <div className="mt-2 flex items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
            <StatusPill status={vehicle.status} />
          </div>
          <p className="text-muted mt-2 text-sm">
            {vehicle.year}
            {vehicle.trim ? ` · ${vehicle.trim}` : ""} · {formatPrice(vehicle.priceUsd)}
          </p>
        </div>

        {vehicle.status === "active" && (
          <Link
            href={`/colecao/${vehicle.slug}`}
            className="border-border-strong text-muted hover:border-foreground hover:text-foreground rounded-full border px-4 py-2 text-sm transition-colors"
          >
            View on marketplace
          </Link>
        )}
      </div>

      <section
        aria-labelledby="lifecycle-heading"
        className="border-border bg-surface mt-8 rounded-[var(--radius-card)] border p-6"
      >
        <h2 id="lifecycle-heading" className="eyebrow">
          Lifecycle
        </h2>
        <p className="text-muted mt-3 max-w-lg text-sm">{STATUS_EXPLANATION[vehicle.status]}</p>
        <div className="mt-5">
          <StatusActions vehicleId={vehicle.id} status={vehicle.status} variant="panel" />
        </div>
      </section>

      <section aria-labelledby="photos-heading" className="mt-10">
        <h2 id="photos-heading" className="eyebrow">
          Photos
        </h2>
        <PhotoManager vehicleId={vehicle.id} photos={vehicle.photos} alt={title} />
      </section>

      <section aria-labelledby="details-heading" className="mt-10">
        <h2 id="details-heading" className="eyebrow">
          Details
        </h2>
        <VehicleForm vehicle={vehicle} />
      </section>

      <section aria-labelledby="danger-heading" className="border-border mt-14 border-t pt-8 pb-4">
        <h2 id="danger-heading" className="eyebrow">
          Remove
        </h2>
        <p className="text-muted mt-3 max-w-lg text-sm">
          Selling a car does not mean deleting it: mark it sold and it stays in your records. Delete
          only a listing that should never have existed.
        </p>
        <div className="mt-4">
          <DeleteVehicle vehicleId={vehicle.id} name={title} />
        </div>
      </section>
    </div>
  );
}

function LoadFailed({ status }: { status: number }) {
  return (
    <div className="border-border bg-surface rounded-[var(--radius-card)] border p-14 text-center">
      <h1 className="text-foreground text-lg font-semibold tracking-tight">
        We could not load this vehicle
      </h1>
      <p className="text-muted mx-auto mt-2 max-w-sm text-sm">
        The API returned {status}. Make sure the API service is running, then refresh.
      </p>
    </div>
  );
}
