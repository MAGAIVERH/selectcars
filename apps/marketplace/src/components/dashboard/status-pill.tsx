import type { VehicleStatus } from "@selectcars/shared";

/**
 * A restrained status indicator: a colored dot plus a tracked mono label in a hairline
 * pill. Deliberately not a loud "badge", to keep the editorial tone of the product.
 */
const STATUS: Record<VehicleStatus, { label: string; dot: string }> = {
  active: { label: "Active", dot: "#1f8f4e" },
  draft: { label: "Draft", dot: "#9a9a9a" },
  pending: { label: "Pending", dot: "#c08a2d" },
  sold: { label: "Sold", dot: "#5b5b5b" },
};

export function StatusPill({ status }: { status: VehicleStatus }) {
  const { label, dot } = STATUS[status];
  return (
    <span className="border-border-strong inline-flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-1">
      <span
        aria-hidden="true"
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: dot }}
      />
      <span className="text-foreground font-mono text-[10px] font-medium tracking-[0.12em] uppercase">
        {label}
      </span>
    </span>
  );
}
