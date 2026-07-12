"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

const SPECS = [
  {
    label: "Engine",
    value: "4.0L twin-turbo V8",
    note: "680 hp · 0-60 in 3.5s",
    icon: EngineIcon,
  },
  {
    label: "Top speed",
    value: "202 mph",
    note: "Sport Plus mode",
    icon: SpeedIcon,
  },
  {
    label: "Drivetrain",
    value: "Rear-wheel drive",
    note: "ZF 8-speed",
    icon: GearIcon,
  },
  {
    label: "Fuel",
    value: "Gas",
    note: "18 mpg combined",
    icon: FuelIcon,
  },
];

const CATEGORIES = ["Exterior", "Interior", "Wheels", "Mechanical", "Documents"];

const COLORS = [
  { name: "Carrara White", hex: "#ededed" },
  { name: "GT Silver", hex: "#c8c8c8" },
  { name: "Agate Grey", hex: "#9a9a9a" },
  { name: "Graphite", hex: "#5f5f5f" },
  { name: "Lead Grey", hex: "#333333" },
  { name: "Jet Black", hex: "#141414" },
];

const ANNOTATIONS = [
  { label: "Bridge of Weir leather", top: "16%", left: "44%" },
  { label: "Aluminum hood", top: "12%", left: "66%" },
  { label: "Carbon-ceramic brakes", top: "36%", left: "72%" },
  { label: '21" forged wheels', top: "60%", left: "30%" },
];

export function FeaturedCar() {
  const [category, setCategory] = useState("Exterior");
  const [color, setColor] = useState(1);

  return (
    <div>
      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* sidebar */}
        <aside className="bg-surface h-fit rounded-[var(--radius-card)] p-6">
          <button type="button" className="flex w-full items-center justify-between">
            <span className="eyebrow">Model</span>
            <span className="text-muted" aria-hidden="true">
              ↓
            </span>
          </button>
          <p className="text-foreground mt-3 text-base font-medium">Aston Martin DB12</p>

          <div className="bg-background mt-4 flex h-44 items-center justify-center rounded-lg p-3">
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
              aria-label="Previous"
              className="border-border text-muted hover:text-foreground grid size-8 place-items-center rounded-full border transition-colors"
            >
              ‹
            </button>
            <button
              type="button"
              aria-label="Next"
              className="border-border text-muted hover:text-foreground grid size-8 place-items-center rounded-full border transition-colors"
            >
              ›
            </button>
          </div>

          <ul className="border-border mt-5 border-t">
            {CATEGORIES.map((cat) => (
              <li key={cat}>
                <button
                  type="button"
                  onClick={() => setCategory(cat)}
                  className={`border-border flex w-full items-center justify-between border-b py-3 text-sm transition-colors ${
                    category === cat
                      ? "text-foreground font-medium"
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
                <div key={s.label} className="bg-surface rounded-[var(--radius-card)] p-4">
                  <div className="text-faint flex items-center gap-2">
                    <Icon />
                    <span className="eyebrow">{s.label}</span>
                  </div>
                  <p className="text-foreground mt-3 text-sm font-medium">{s.value}</p>
                  <p className="text-faint mt-1 text-xs">{s.note}</p>
                </div>
              );
            })}
          </div>

          <div className="bg-surface relative overflow-hidden rounded-[var(--radius-card)]">
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
                className="border-border bg-background/90 text-foreground absolute flex -translate-x-1/2 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs backdrop-blur"
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
            <span className="bg-foreground text-background rounded-full px-4 py-2 font-mono text-[11px] tracking-[0.14em] uppercase">
              Colors
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
                      ? "ring-foreground ring-offset-background ring-2 ring-offset-2"
                      : "ring-border-strong ring-1"
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/colecao"
              className="border-border-strong text-foreground hover:bg-surface rounded-full border px-5 py-2.5 text-sm font-medium transition-colors"
            >
              View full collection
            </Link>
            <Link
              href="#agendar"
              className="bg-foreground text-background inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-opacity hover:opacity-90"
            >
              Request an offer
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
      <path
        d="M4 15a8 8 0 1 1 16 0"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
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
