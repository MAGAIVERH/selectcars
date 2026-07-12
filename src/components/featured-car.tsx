"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

const SPECS = [
  {
    label: "Motor",
    value: "V8 4.0 biturbo",
    note: "680 cv · 0-100 em 3.6s",
    icon: EngineIcon,
  },
  {
    label: "Velocidade máxima",
    value: "325 km/h",
    note: "Modo Sport Plus",
    icon: SpeedIcon,
  },
  {
    label: "Transmissão",
    value: "Tração traseira",
    note: "ZF 8 velocidades",
    icon: GearIcon,
  },
  {
    label: "Combustível",
    value: "Gasolina",
    note: "12.9 L/100 km · WLTP",
    icon: FuelIcon,
  },
];

const CATEGORIES = ["Exterior", "Interior", "Rodas", "Mecânica", "Documentação"];

const COLORS = [
  { name: "Branco Carrara", hex: "#ededed" },
  { name: "Prata GT", hex: "#c8c8c8" },
  { name: "Cinza Ágata", hex: "#9a9a9a" },
  { name: "Grafite", hex: "#5f5f5f" },
  { name: "Chumbo", hex: "#333333" },
  { name: "Preto Jet", hex: "#141414" },
];

const ANNOTATIONS = [
  { label: "Couro Bridge of Weir", top: "16%", left: "44%" },
  { label: "Capô em alumínio", top: "12%", left: "66%" },
  { label: "Freios carbocerâmicos", top: "36%", left: "72%" },
  { label: "Rodas forjadas 21″", top: "60%", left: "30%" },
];

export function FeaturedCar() {
  const [category, setCategory] = useState("Exterior");
  const [color, setColor] = useState(1);

  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* sidebar */}
        <aside className="h-fit rounded-[var(--radius-card)] bg-surface p-6">
          <button
            type="button"
            className="flex w-full items-center justify-between"
          >
            <span className="eyebrow">Modelo</span>
            <span className="text-muted" aria-hidden="true">
              ↓
            </span>
          </button>
          <p className="mt-3 text-base font-medium text-foreground">
            Aston Martin DB12
          </p>

          <div className="mt-4 flex h-44 items-center justify-center rounded-lg bg-background p-3">
            <div className="relative h-32 w-full">
              <Image
                src="/Image (Aston Martin DB12).png"
                alt="Aston Martin DB12"
                fill
                className="-scale-x-100 object-contain"
                sizes="280px"
              />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <button
              type="button"
              aria-label="Anterior"
              className="grid size-8 place-items-center rounded-full border border-border text-muted transition-colors hover:text-foreground"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Próximo"
              className="grid size-8 place-items-center rounded-full border border-border text-muted transition-colors hover:text-foreground"
            >
              ›
            </button>
          </div>

          <ul className="mt-5 border-t border-border">
            {CATEGORIES.map((cat) => (
              <li key={cat}>
                <button
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`flex w-full items-center justify-between border-b border-border py-3 text-sm transition-colors ${
                    category === cat
                      ? "font-medium text-foreground"
                      : "text-muted hover:text-foreground"
                  }`}
                >
                  {cat}
                  <span aria-hidden="true">→</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        {/* right column: specs + hero image */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {SPECS.map((s) => {
              const Icon = s.icon;
              return (
                <div
                  key={s.label}
                  className="rounded-[var(--radius-card)] bg-surface p-4"
                >
                  <div className="flex items-center gap-2 text-faint">
                    <Icon />
                    <span className="eyebrow">{s.label}</span>
                  </div>
                  <p className="mt-3 text-sm font-medium text-foreground">
                    {s.value}
                  </p>
                  <p className="mt-1 text-xs text-faint">{s.note}</p>
                </div>
              );
            })}
          </div>

          <div className="relative overflow-hidden rounded-[var(--radius-card)] bg-surface">
            <div className="relative aspect-[16/10] w-full">
              <Image
                src="/Image (Aston Martin DB12).png"
                alt="Aston Martin DB12"
                fill
                priority
                className="object-contain p-2"
                sizes="(max-width: 1024px) 100vw, 60vw"
                style={{ transform: "scaleX(-1.12) scaleY(1.12)" }}
              />
            </div>
            {ANNOTATIONS.map((a) => (
              <span
                key={a.label}
                className="absolute flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-border bg-background/90 px-3 py-1.5 text-xs text-foreground backdrop-blur"
                style={{ top: a.top, left: a.left }}
              >
                <span className="text-faint">+</span>
                {a.label}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* bottom controls — aligned under the image column */}
      <div className="mt-6 grid gap-4 lg:grid-cols-[280px_1fr]">
        <div className="hidden lg:block" />
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
          <span className="rounded-full bg-foreground px-4 py-2 font-mono text-[11px] tracking-[0.14em] text-background uppercase">
            Cores
          </span>
          <div className="flex items-center gap-2">
            {COLORS.map((c, i) => (
              <button
                key={c.name}
                type="button"
                onClick={() => setColor(i)}
                title={c.name}
                aria-label={c.name}
                className={`size-6 rounded-full transition-all ${
                  color === i
                    ? "ring-2 ring-foreground ring-offset-2 ring-offset-background"
                    : "ring-1 ring-border-strong"
                }`}
                style={{ backgroundColor: c.hex }}
              />
            ))}
          </div>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/colecao"
            className="rounded-full border border-border-strong px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-surface"
          >
            Ver coleção completa
          </Link>
          <Link
            href="#agendar"
            className="inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Solicitar proposta
            <span aria-hidden="true">→</span>
          </Link>
        </div>
        </div>
      </div>
    </div>
  );
}

/* minimal line icons */
function EngineIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M4 12h3l2-3h4l2 3h4v4h-3l-2 3H9l-2-3H4z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function SpeedIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M4 15a8 8 0 1 1 16 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="m12 15 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}
function GearIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 3v3M12 18v3M3 12h3M18 12h3M5.5 5.5l2 2M16.5 16.5l2 2M18.5 5.5l-2 2M7.5 16.5l-2 2"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}
function FuelIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 21c3.3 0 5-2.2 5-5 0-3-5-9-5-9s-5 6-5 9c0 2.8 1.7 5 5 5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
