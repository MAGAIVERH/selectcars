"use client";

import { useMemo, useState } from "react";
import {
  type Car,
  type Body,
  type Fuel,
  type Transmission,
  bodies,
  brands,
  formatPrice,
  fuels,
  transmissions,
} from "@/lib/cars";
import { CarCard } from "@/components/car-card";

const PRICE_MAX = 350_000;

const CHIPS = [
  "All",
  "Sports",
  "Classics",
  "Premium SUV",
  "Limited editions",
  "Just arrived",
] as const;
type Chip = (typeof CHIPS)[number];

const SORTS = {
  recent: "Just arrived",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
} as const;
type SortKey = keyof typeof SORTS;

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

function matchesChip(car: Car, chip: Chip): boolean {
  switch (chip) {
    case "All":
      return true;
    case "Sports":
      return car.body === "Coupe" || car.body === "GT";
    case "Classics":
      return car.year <= 2015;
    case "Premium SUV":
      return car.body === "SUV";
    case "Limited editions":
      return car.badge === "RARE" || car.badge === "FINAL UNIT" || car.badge === "RESERVED";
    case "Just arrived":
      return car.badge === "NEW";
  }
}

export function CollectionBrowser({ cars }: { cars: Car[] }) {
  const [search, setSearch] = useState("");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [maxPrice, setMaxPrice] = useState(PRICE_MAX);
  const [selBrands, setSelBrands] = useState<string[]>([]);
  const [selBodies, setSelBodies] = useState<Body[]>([]);
  const [selTransmissions, setSelTransmissions] = useState<Transmission[]>([]);
  const [selFuels, setSelFuels] = useState<Fuel[]>([]);
  const [chip, setChip] = useState<Chip>("All");
  const [sort, setSort] = useState<SortKey>("recent");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result = cars.filter((car) => {
      if (!matchesChip(car, chip)) return false;
      if (onlyAvailable && car.price === null) return false;
      if (car.price !== null && car.price > maxPrice) return false;
      if (selBrands.length && !selBrands.includes(car.brand)) return false;
      if (selBodies.length && !selBodies.includes(car.body)) return false;
      if (selTransmissions.length && !selTransmissions.includes(car.transmission)) return false;
      if (selFuels.length && !selFuels.includes(car.fuel)) return false;
      if (q) {
        const haystack = `${car.brand} ${car.model} ${car.color}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      if (sort === "price-asc") return (a.price ?? Infinity) - (b.price ?? Infinity);
      if (sort === "price-desc") return (b.price ?? -Infinity) - (a.price ?? -Infinity);
      // just arrived: newest first, then lowest mileage
      return b.year - a.year || a.mileage - b.mileage;
    });

    return result;
  }, [
    cars,
    search,
    onlyAvailable,
    maxPrice,
    selBrands,
    selBodies,
    selTransmissions,
    selFuels,
    chip,
    sort,
  ]);

  function clearAll() {
    setSearch("");
    setOnlyAvailable(false);
    setMaxPrice(PRICE_MAX);
    setSelBrands([]);
    setSelBodies([]);
    setSelTransmissions([]);
    setSelFuels([]);
    setChip("All");
  }

  return (
    <div>
      {/* Toolbar: chips + search + sort */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap gap-2">
          {CHIPS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setChip(c)}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                chip === c
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
                checked={onlyAvailable}
                onChange={(e) => setOnlyAvailable(e.target.checked)}
                className="accent-foreground size-4"
              />
              Available for viewing only
            </label>
          </FilterGroup>

          <FilterGroup label="Price range">
            <input
              type="range"
              min={0}
              max={PRICE_MAX}
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

          <FilterGroup label="Make">
            <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
              {brands.map((brand) => (
                <Check
                  key={brand}
                  label={brand}
                  checked={selBrands.includes(brand)}
                  onChange={() => setSelBrands((s) => toggle(s, brand))}
                />
              ))}
            </div>
          </FilterGroup>

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

          <FilterGroup label="Transmission">
            <div className="flex flex-wrap gap-2">
              {transmissions.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelTransmissions((s) => toggle(s, t))}
                  className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                    selTransmissions.includes(t)
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted hover:border-border-strong"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </FilterGroup>

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
              {filtered.map((car) => (
                <CarCard key={car.id} car={car} />
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
