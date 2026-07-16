"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Vehicle, Condition } from "@selectcars/shared";
import { ListingCard } from "@/components/listing-card";

const CONDITIONS: Condition[] = ["New", "Certified", "Used"];

/** Home page showroom preview: a live slice of published inventory, filterable by condition. */
export function ShowroomGrid({ vehicles }: { vehicles: Vehicle[] }) {
  const conditions = useMemo(
    () => CONDITIONS.filter((c) => vehicles.some((v) => v.condition === c)),
    [vehicles],
  );
  const [condition, setCondition] = useState<Condition | "All">("All");
  const filtered = useMemo(
    () => (condition === "All" ? vehicles : vehicles.filter((v) => v.condition === condition)),
    [vehicles, condition],
  );

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {(["All", ...conditions] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => setCondition(c)}
            className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
              condition === c
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted hover:border-border-strong hover:text-foreground"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="border-border mt-8 flex h-48 flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed text-center">
          <p className="text-foreground">No vehicles in this category right now.</p>
          <Link
            href="/colecao"
            className="text-muted hover:text-foreground mt-3 text-sm underline underline-offset-4"
          >
            View full collection
          </Link>
        </div>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((vehicle, i) => (
            <ListingCard key={vehicle.id} vehicle={vehicle} priority={i < 3} />
          ))}
        </div>
      )}
    </div>
  );
}
