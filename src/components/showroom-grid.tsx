"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { type Car, formatKm, formatPrice } from "@/lib/cars";

const CHIPS = [
  "Todos",
  "Esportivos",
  "Clássicos",
  "SUV Premium",
  "Edições limitadas",
  "Recém-chegados",
] as const;
type Chip = (typeof CHIPS)[number];

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

export function ShowroomGrid({ cars }: { cars: Car[] }) {
  const [chip, setChip] = useState<Chip>("Todos");
  const filtered = useMemo(
    () => cars.filter((c) => matchesChip(c, chip)),
    [cars, chip],
  );

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
        <div className="mt-8 flex h-48 flex-col items-center justify-center rounded-[var(--radius-card)] border border-dashed border-border text-center">
          <p className="text-foreground">
            Nenhum veículo nesta categoria no momento.
          </p>
          <Link
            href="/colecao"
            className="mt-3 text-sm text-muted underline underline-offset-4 hover:text-foreground"
          >
            Ver coleção completa
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
    <article className="flex flex-col rounded-[var(--radius-card)] border border-border bg-surface p-6 transition-shadow hover:shadow-[0_18px_44px_-24px_rgba(0,0,0,0.35)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold tracking-tight text-foreground">
            {car.brand}
          </h3>
          <p className="text-sm text-muted">{car.model}</p>
        </div>
        {car.badge && (
          <span className="shrink-0 rounded-full border border-border-strong px-2.5 py-1 font-mono text-[10px] font-medium tracking-[0.12em] text-foreground">
            {car.badge}
          </span>
        )}
      </div>

      <p className="mt-3 font-mono text-[11px] tracking-[0.1em] text-faint">
        {car.year} · {formatKm(car.km).toUpperCase()} · {car.color.toUpperCase()}
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

      {car.description && (
        <p className="text-sm leading-6 text-muted">{car.description}</p>
      )}

      <div className="mt-6 flex items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-base font-semibold text-foreground">
          {formatPrice(car.price)}
        </p>
        <Link
          href={`/colecao/${car.id}`}
          className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-medium text-background transition-opacity hover:opacity-90"
        >
          Ver detalhes
          <span aria-hidden="true">→</span>
        </Link>
      </div>
    </article>
  );
}
