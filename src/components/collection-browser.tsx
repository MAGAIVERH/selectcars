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

const PRICE_MAX = 3_450_000;

const CHIPS = [
  "Todos",
  "Esportivos",
  "Clássicos",
  "SUV Premium",
  "Edições limitadas",
  "Recém-chegados",
] as const;
type Chip = (typeof CHIPS)[number];

const SORTS = {
  recentes: "Recém-chegados",
  "menor-preco": "Menor preço",
  "maior-preco": "Maior preço",
} as const;
type SortKey = keyof typeof SORTS;

function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

function matchesChip(car: Car, chip: Chip): boolean {
  switch (chip) {
    case "Todos":
      return true;
    case "Esportivos":
      return car.body === "Coupé" || car.body === "GT";
    case "Clássicos":
      return car.year <= 2015;
    case "SUV Premium":
      return car.body === "SUV";
    case "Edições limitadas":
      return (
        car.badge === "RARO" ||
        car.badge === "ÚLTIMA UNIDADE" ||
        car.badge === "RESERVADO"
      );
    case "Recém-chegados":
      return car.badge === "NOVO";
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
  const [chip, setChip] = useState<Chip>("Todos");
  const [sort, setSort] = useState<SortKey>("recentes");

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const result = cars.filter((car) => {
      if (!matchesChip(car, chip)) return false;
      if (onlyAvailable && car.price === null) return false;
      if (car.price !== null && car.price > maxPrice) return false;
      if (selBrands.length && !selBrands.includes(car.brand)) return false;
      if (selBodies.length && !selBodies.includes(car.body)) return false;
      if (selTransmissions.length && !selTransmissions.includes(car.transmission))
        return false;
      if (selFuels.length && !selFuels.includes(car.fuel)) return false;
      if (q) {
        const haystack = `${car.brand} ${car.model} ${car.color}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      if (sort === "menor-preco")
        return (a.price ?? Infinity) - (b.price ?? Infinity);
      if (sort === "maior-preco")
        return (b.price ?? -Infinity) - (a.price ?? -Infinity);
      // recém-chegados: mais novo primeiro, depois menor km
      return b.year - a.year || a.km - b.km;
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
    setChip("Todos");
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
          <label className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2">
            <SearchIcon />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar marca, modelo ou cor"
              className="w-52 bg-transparent text-sm text-foreground outline-none placeholder:text-faint"
            />
          </label>
          <label className="flex items-center gap-2 rounded-full border border-border bg-surface px-4 py-2 text-sm">
            <span className="eyebrow">Ordenar</span>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortKey)}
              className="bg-transparent font-medium text-foreground outline-none"
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
        <aside className="h-fit rounded-[var(--radius-card)] border border-border bg-surface p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Filtrar por</h2>
            <button
              type="button"
              onClick={clearAll}
              className="text-sm text-faint transition-colors hover:text-foreground"
            >
              Limpar
            </button>
          </div>

          <FilterGroup label="Disponibilidade">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(e) => setOnlyAvailable(e.target.checked)}
                className="size-4 accent-foreground"
              />
              Apenas disponíveis para visita
            </label>
          </FilterGroup>

          <FilterGroup label="Faixa de valor">
            <input
              type="range"
              min={0}
              max={PRICE_MAX}
              step={50000}
              value={maxPrice}
              onChange={(e) => setMaxPrice(Number(e.target.value))}
              className="w-full accent-foreground"
            />
            <div className="mt-2 flex justify-between font-mono text-[11px] text-faint">
              <span>R$ 0</span>
              <span>até {formatPrice(maxPrice)}</span>
            </div>
          </FilterGroup>

          <FilterGroup label="Marca">
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

          <FilterGroup label="Carroceria">
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

          <FilterGroup label="Câmbio">
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

          <FilterGroup label="Combustível" last>
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
            <div className="flex h-64 flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-border text-center">
              <p className="text-foreground">Nenhum veículo encontrado.</p>
              <button
                type="button"
                onClick={clearAll}
                className="mt-3 text-sm text-muted underline underline-offset-4 hover:text-foreground"
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((car) => (
                <CarCard key={car.id} car={car} />
              ))}
            </div>
          )}

          <div className="mt-10 flex items-center justify-between border-t border-border pt-6 text-sm text-faint">
            <p>
              Exibindo {filtered.length === 0 ? 0 : 1}–{filtered.length} de{" "}
              {filtered.length}
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
    <div className={`mt-6 ${last ? "" : "border-b border-border pb-6"}`}>
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
    <label className="flex cursor-pointer items-center gap-2 text-sm text-muted">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="size-4 accent-foreground"
      />
      {label}
    </label>
  );
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="m20 20-3.2-3.2"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
