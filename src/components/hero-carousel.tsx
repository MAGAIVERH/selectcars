"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";

type Slide = {
  brand: string;
  model: string;
  year: number;
  color: string;
  km: string;
  image: string;
  /** natural pixel dimensions of the asset (for correct aspect ratio) */
  w: number;
  h: number;
  /** mirror horizontally so the car faces left */
  flip?: boolean;
};

const SLIDES: Slide[] = [
  {
    brand: "Porsche",
    model: "911 GT3 RS",
    year: 2024,
    color: "Branco Carrara",
    km: "1.200 km",
    image: "/Image (Porsche 911 GT3 RS).png",
    w: 754,
    h: 473,
  },
  {
    brand: "Ferrari",
    model: "296 GTB",
    year: 2023,
    color: "Rosso Corsa",
    km: "3.400 km",
    image: "/Image (Ferrari 296 GTB).png",
    w: 709,
    h: 473,
  },
  {
    brand: "Lamborghini",
    model: "Huracán Tecnica",
    year: 2024,
    color: "Verde Mantis",
    km: "880 km",
    image: "/Image (Lamborghini Huracán Tecnica).png",
    w: 752,
    h: 473,
    flip: true, // asset faces right
  },
  {
    brand: "Aston Martin",
    model: "DB12",
    year: 2024,
    color: "British Racing Green",
    km: "1.500 km",
    image: "/Image (Aston Martin DB12).png",
    w: 776,
    h: 473,
  },
];

export function HeroCarousel() {
  const [index, setIndex] = useState(0); // always starts on the white Porsche
  const slide = SLIDES[index];
  const go = (dir: number) =>
    setIndex((i) => (i + dir + SLIDES.length) % SLIDES.length);

  // auto-advance; the timer resets whenever the slide changes (manual or auto)
  useEffect(() => {
    const timer = setInterval(
      () => setIndex((i) => (i + 1) % SLIDES.length),
      4500,
    );
    return () => clearInterval(timer);
  }, [index]);

  return (
    <div>
      {/* single white card — car vertically centered, info + actions overlaid at the base */}
      <div className="relative flex h-[400px] items-center justify-center rounded-[var(--radius-card)] bg-surface px-6 sm:h-[540px] sm:px-10">
        <div className="relative h-[320px] w-full max-w-6xl sm:h-[470px]">
          <Image
            key={slide.image}
            src={slide.image}
            alt={`${slide.brand} ${slide.model}`}
            fill
            priority
            quality={100}
            sizes="(max-width: 1280px) 100vw, 1200px"
            className={`object-contain ${slide.flip ? "-scale-x-100" : ""}`}
            style={{ animation: "heroFade 500ms ease" }}
          />
        </div>

        <div className="absolute bottom-6 left-6 sm:bottom-8 sm:left-8">
          <p className="font-mono text-[11px] tracking-[0.14em] text-faint uppercase">
            {slide.brand} {slide.model} · {slide.year}
          </p>
          <p className="mt-1 text-lg font-medium text-foreground">
            {slide.color} · {slide.km}
          </p>
        </div>

        <div className="absolute right-6 bottom-6 flex items-center gap-2 sm:right-8 sm:bottom-8">
          <Link
            href="/colecao"
            className="inline-flex items-center gap-2 rounded-full border border-border-strong px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-background"
          >
            Ver coleção
            <span aria-hidden="true">→</span>
          </Link>
          <button
            type="button"
            onClick={() => go(1)}
            aria-label="Próximo veículo"
            className="grid size-11 place-items-center rounded-full bg-foreground text-background transition-opacity hover:opacity-90"
          >
            <span aria-hidden="true">→</span>
          </button>
        </div>
      </div>

      {/* controls row */}
      <div className="mt-5 flex items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Anterior"
              className="grid size-8 place-items-center rounded-full border border-border text-muted transition-colors hover:border-border-strong hover:text-foreground"
            >
              <span aria-hidden="true">‹</span>
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Próximo"
              className="grid size-8 place-items-center rounded-full border border-border text-muted transition-colors hover:border-border-strong hover:text-foreground"
            >
              <span aria-hidden="true">›</span>
            </button>
          </div>
          <p className="font-mono text-xs tracking-[0.14em] text-faint">
            {String(index + 1).padStart(2, "0")} / {String(SLIDES.length).padStart(2, "0")}
          </p>
        </div>

        <p className="hidden font-mono text-[11px] tracking-[0.12em] text-faint uppercase sm:block">
          Porsche · Ferrari · Lamborghini · Aston Martin · Bentley · McLaren
        </p>
      </div>
    </div>
  );
}
