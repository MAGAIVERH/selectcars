import Link from "next/link";
import { vehicleStatusSchema, type VehicleStatus } from "@selectcars/shared";
import { fetchInventory } from "@/lib/api";
import { StatusTabs } from "@/components/dashboard/status-tabs";
import { InventoryItem } from "@/components/dashboard/inventory-item";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function parseStatus(value: string | string[] | undefined): VehicleStatus | null {
  if (typeof value !== "string") return null;
  const parsed = vehicleStatusSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const status = parseStatus((await searchParams).status);
  const result = await fetchInventory({ status: status ?? undefined, limit: 60 });

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <span className="eyebrow">Inventory</span>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            {result.ok ? `${result.data.total} vehicles` : "Inventory"}
          </h1>
        </div>
        <Link
          href="/dashboard/vehicles/new"
          className="bg-foreground text-background inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
        >
          <span aria-hidden="true">+</span> Add vehicle
        </Link>
      </div>

      <div className="mt-8">
        <StatusTabs active={status} />
      </div>

      <div className="mt-8">
        {!result.ok ? (
          <ErrorState status={result.status} />
        ) : result.data.items.length === 0 ? (
          <EmptyState filtered={status !== null} />
        ) : (
          <ul className="flex flex-col gap-3">
            {result.data.items.map((vehicle, i) => (
              <li key={vehicle.id}>
                <InventoryItem vehicle={vehicle} priority={i === 0} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function EmptyState({ filtered }: { filtered: boolean }) {
  return (
    <div className="border-border bg-surface rounded-[var(--radius-card)] border border-dashed p-14 text-center">
      <h2 className="text-foreground text-lg font-semibold tracking-tight">
        {filtered ? "Nothing here yet" : "Your showroom is empty"}
      </h2>
      <p className="text-muted mx-auto mt-2 max-w-sm text-sm">
        {filtered
          ? "No vehicles match this status. Try another tab, or add your first listing."
          : "Add your first vehicle to start building the collection buyers will browse."}
      </p>
      <Link
        href="/dashboard/vehicles/new"
        className="bg-foreground text-background mt-6 inline-flex items-center gap-1.5 rounded-full px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
      >
        <span aria-hidden="true">+</span> Add vehicle
      </Link>
    </div>
  );
}

function ErrorState({ status }: { status: number }) {
  return (
    <div className="border-border bg-surface rounded-[var(--radius-card)] border p-14 text-center">
      <h2 className="text-foreground text-lg font-semibold tracking-tight">
        We could not load your inventory
      </h2>
      <p className="text-muted mx-auto mt-2 max-w-sm text-sm">
        The API returned {status}. Make sure the API service is running, then refresh.
      </p>
    </div>
  );
}
