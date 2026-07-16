import Link from "next/link";
import { cn } from "@selectcars/ui";
import type { VehicleStatus } from "@selectcars/shared";

const TABS: { label: string; value: VehicleStatus | null }[] = [
  { label: "All", value: null },
  { label: "Active", value: "active" },
  { label: "Draft", value: "draft" },
  { label: "Pending", value: "pending" },
  { label: "Sold", value: "sold" },
];

/** Status filter, driven entirely by the URL so it works without client JavaScript. */
export function StatusTabs({ active }: { active: VehicleStatus | null }) {
  return (
    <nav className="border-border flex items-center gap-1 border-b" aria-label="Filter by status">
      {TABS.map((tab) => {
        const isActive = tab.value === active;
        const href = tab.value ? `/dashboard?status=${tab.value}` : "/dashboard";
        return (
          <Link
            key={tab.label}
            href={href}
            aria-current={isActive ? "page" : undefined}
            className={cn(
              "-mb-px border-b-2 px-3 py-2.5 text-sm transition-colors",
              isActive
                ? "border-foreground text-foreground font-medium"
                : "text-muted hover:text-foreground border-transparent",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
