"use client";

import { useMemo, useState } from "react";
import type { Vehicle, BodyStyle, FuelType, Condition } from "@selectcars/shared";
import { formatPrice } from "@/lib/format";
import { ListingCard } from "@/components/listing-card";

const SORTS = {
  recent: "Just arrived",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
} as const;
type SortKey = keyof typeof SORTS;

const CONDITIONS: Condition[] = ["New", "Certified", "Used"];

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function uniq<T>(values: T[]): T[] {
  return [...new Set(values)];
}

/**
 * Live marketplace browser. Facets are derived from the vehicles the API returns, so the
 * filters always match the actual inventory: no hardcoded makes or bodies to drift.
 */
export function CollectionBrowser({ vehicles }: { vehicles: Vehicle[] }) {
  const makes = useMemo(() => uniq(vehicles.map((v) => v.make)).sort(), [vehicles]);
  const bodies = useMemo(() => uniq(vehicles.map((v) => v.bodyStyle)), [vehicles]);
  const fuels = useMemo(() => uniq(vehicles.map((v) => v.fuelType)), [vehicles]);
  const conditions = useMemo(
    () => CONDITIONS.filter((c) => vehicles.some((v) => v.condition === c)),
    [vehicles],
  );
  const priceCeiling = useMemo(() => {
    const max = Math.max(0, ...vehicles.map((v) => v.priceUsd ?? 0));
    return Math.max(50_000, Math.ceil(max / 25_000) * 25_000);
  }, [vehicles]);

  const [search, setSearch] = useState("");
  const [pricedOnly, setPricedOnly] = useState(false);
  const [maxPrice, setMaxPrice] = useState(priceCeiling);
  const [selMakes, setSelMakes] = useState<string[]>([]);
  const [selBodies, setSelBodies] = useState<BodyStyle[]>([]);
  const [selFuels, setSelFuels] = useState<FuelType[]>([]);
  const [condition, setCondition] = useState<Condition | "All">("All");
  const [sort, setSort] = useState<SortKey>("recent");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result = vehicles.filter((v) => {
      if (condition !== "All" && v.condition !== condition) return false;
      if (pricedOnly && v.priceUsd === null) return false;
      if (v.priceUsd !== null && v.priceUsd > maxPrice) return false;
      if (selMakes.length && !selMakes.includes(v.make)) return false;
      if (selBodies.length && !selBodies.includes(v.bodyStyle)) return false;
      if (selFuels.length && !selFuels.includes(v.fuelType)) return false;
      if (q) {
        const haystack = `${v.make} ${v.model} ${v.exteriorColor ?? ""}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      if (sort === "price-asc") return (a.priceUsd ?? Infinity) - (b.priceUsd ?? Infinity);
      if (sort === "price-desc") return (b.priceUsd ?? -Infinity) - (a.priceUsd ?? -Infinity);
      return b.year - a.year || a.mileage - b.mileage;
    });

    return result;
  }, [vehicles, search, pricedOnly, maxPrice, selMakes, selBodies, selFuels, condition, sort]);

  function clearAll() {
    setSearch("");
    setPricedOnly(false);
    setMaxPrice(priceCeiling);
    setSelMakes([]);
    setSelBodies([]);
    setSelFuels([]);
    setCondition("All");
  }

  return (
    <div>
      {/* Toolbar: condition chips + search + sort */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
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

        <div className="flex items-center gap-3">
          <label className="border-border bg-surface flex items-center gap-2 rounded-full border px-4 py-2">
            <SearchIcon />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search make, model, or color"
              className="text-foreground placeholder:text-faint w-52 bg-transparent text-sm outline-none"
            />
          </label>
          <label className="border-border bg-surface flex items-center gap-2 rounded-full border px-4 py-2 text-sm">
            <span className="eyebrow">Sort</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="text-foreground bg-transparent font-medium outline-none"
            >
              {Object.entries(SORTS).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {/* Body: sidebar + grid */}
      <div className="mt-8 grid gap-6 lg:grid-cols-[260px_1fr]">
        <aside className="border-border bg-surface h-fit rounded-[var(--radius-card)] border p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Filter</h2>
            <button
              type="button"
              onClick={clearAll}
              className="text-faint hover:text-foreground text-sm transition-colors"
            >
              Clear
            </button>
          </div>

          <FilterGroup label="Availability">
            <label className="text-muted flex cursor-pointer items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={pricedOnly}
                onChange={(e) => setPricedOnly(e.target.checked)}
                className="accent-foreground size-4"
              />
              Priced listings only
            </label>
          </FilterGroup>

          <FilterGroup label="Price range">
            <input
              type="range"
              min={0}
              max={priceCeiling}
              step={5000}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="accent-foreground w-full"
            />
            <div className="text-faint mt-2 flex justify-between font-mono text-[11px]">
              <span>$0</span>
              <span>up to {formatPrice(maxPrice)}</span>
            </div>
          </FilterGroup>

          {makes.length > 0 && (
            <FilterGroup label="Make">
              <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                {makes.map((make) => (
                  <Check
                    key={make}
                    label={make}
                    checked={selMakes.includes(make)}
                    onChange={() => setSelMakes((s) => toggle(s, make))}
                  />
                ))}
              </div>
            </FilterGroup>
          )}

          {bodies.length > 0 && (
            <FilterGroup label="Body">
              <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                {bodies.map((body) => (
                  <Check
                    key={body}
                    label={body}
                    checked={selBodies.includes(body)}
                    onChange={() => setSelBodies((s) => toggle(s, body))}
                  />
                ))}
              </div>
            </FilterGroup>
          )}

          {fuels.length > 0 && (
            <FilterGroup label="Fuel" last>
              <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                {fuels.map((fuel) => (
                  <Check
                    key={fuel}
                    label={fuel}
                    checked={selFuels.includes(fuel)}
                    onChange={() => setSelFuels((s) => toggle(s, fuel))}
                  />
                ))}
              </div>
            </FilterGroup>
          )}
        </aside>

        <div>
          {filtered.length === 0 ? (
            <div className="border-border flex h-64 flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed text-center">
              <p className="text-foreground">No vehicles found.</p>
              <button
                type="button"
                onClick={clearAll}
                className="text-muted hover:text-foreground mt-3 text-sm underline underline-offset-4"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((vehicle, i) => (
                <ListingCard key={vehicle.id} vehicle={vehicle} priority={i < 3} />
              ))}
            </div>
          )}

          <div className="border-border text-faint mt-10 flex items-center justify-between border-t pt-6 text-sm">
            <p>
              Showing {filtered.length === 0 ? 0 : 1}–{filtered.length} of {filtered.length}
            </p>
            <p className="font-mono tracking-[0.1em]">01 / 01</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterGroup({
  label,
  last,
  children,
}: {
  label: string;
  last?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`mt-6 ${last ? "" : "border-border border-b pb-6"}`}>
      <p className="eyebrow mb-3">{label}</p>
      {children}
    </div>
  );
}

function Check({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="text-muted flex cursor-pointer items-center gap-2 text-sm">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="accent-foreground size-4"
      />
      {label}
    </label>
  );
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="m20 20-3.2-3.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}
