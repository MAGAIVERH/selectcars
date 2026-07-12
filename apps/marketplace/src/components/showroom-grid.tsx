"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { type Car, formatMileage, formatPrice } from "@/lib/cars";

const CHIPS = [
  "All",
  "Sports",
  "Classics",
  "Premium SUV",
  "Limited editions",
  "Just arrived",
] as const;
type Chip = (typeof CHIPS)[number];

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

export function ShowroomGrid({ cars }: { cars: Car[] }) {
  const [chip, setChip] = useState<Chip>("All");
  const filtered = useMemo(() => cars.filter((c) => matchesChip(c, chip)), [cars, chip]);

  return (
    <div>
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
          {filtered.map((car) => (
            <ShowroomCard key={car.id} car={car} />
          ))}
        </div>
      )}
    </div>
  );
}

function ShowroomCard({ car }: { car: Car }) {
  return (
    <article className="border-border bg-surface flex flex-col rounded-[var(--radius-card)] border p-6 transition-shadow hover:shadow-[0_18px_44px_-24px_rgba(0,0,0,0.35)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-foreground text-xl font-semibold tracking-tight">{car.brand}</h3>
          <p className="text-muted text-sm">{car.model}</p>
        </div>
        {car.badge && (
          <span className="border-border-strong text-foreground shrink-0 rounded-full border px-2.5 py-1 font-mono text-[10px] font-medium tracking-[0.12em]">
            {car.badge}
          </span>
        )}
      </div>

      <p className="text-faint mt-3 font-mono text-[11px] tracking-[0.1em]">
        {car.year} · {formatMileage(car.mileage).toUpperCase()} · {car.color.toUpperCase()}
      </p>

      <div className="relative my-6 h-40 w-full">
        <Image
          src={car.image}
          alt={`${car.brand} ${car.model}`}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          className="object-contain"
        />
      </div>

      {car.description && <p className="text-muted text-sm leading-6">{car.description}</p>}

      <div className="border-border mt-6 flex items-center justify-between gap-3 border-t pt-4">
        <p className="text-foreground text-base font-semibold">{formatPrice(car.price)}</p>
        <Link
          href={`/colecao/${car.id}`}
          className="bg-foreground text-background inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-opacity hover:opacity-90"
        >
          View details
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
