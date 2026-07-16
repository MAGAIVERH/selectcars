"use client";

import { useState } from "react";
import Image from "next/image";
import type { VehiclePhoto } from "@selectcars/shared";

/** Listing gallery: a large primary image with a selectable thumbnail strip. */
export function ListingGallery({ photos, alt }: { photos: VehiclePhoto[]; alt: string }) {
  const ordered = [...photos].sort(
    (a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.position - b.position,
  );
  const [active, setActive] = useState(0);

  if (ordered.length === 0) {
    return (
      <div className="bg-surface border-border text-faint grid aspect-[3/2] w-full place-items-center rounded-[var(--radius-card)] border font-mono text-xs tracking-[0.12em] uppercase">
        Photo on request
      </div>
    );
  }

  const current = ordered[Math.min(active, ordered.length - 1)];

  return (
    <div>
      <div className="bg-surface border-border relative aspect-[3/2] w-full overflow-hidden rounded-[var(--radius-card)] border">
        <Image
          src={current.url}
          alt={current.alt ?? alt}
          fill
          priority
          sizes="(max-width: 1024px) 100vw, 60vw"
          className="object-cover"
        />
      </div>

      {ordered.length > 1 && (
        <div className="mt-4 grid grid-cols-4 gap-3 sm:grid-cols-5">
          {ordered.map((photo, i) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => setActive(i)}
              aria-label={`View photo ${i + 1}`}
              aria-current={i === active ? "true" : undefined}
              className={`bg-surface relative aspect-[3/2] overflow-hidden rounded-[10px] border transition-colors ${
                i === active ? "border-foreground" : "border-border hover:border-border-strong"
              }`}
            >
              <Image
                src={photo.url}
                alt={photo.alt ?? alt}
                fill
                sizes="120px"
                className="object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
