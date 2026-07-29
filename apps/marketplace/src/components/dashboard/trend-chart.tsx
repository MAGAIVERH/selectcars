"use client";

import { useId, useState } from "react";

/**
 * One month, already reduced to what a chart needs: a number to plot and a string to show.
 *
 * The formatting happens on the server. Props crossing into a Client Component are
 * **serialized**, so a `format` callback cannot travel with the data: React refuses it, and
 * rightly, since a function has no meaning on the other side of the wire. Sending the display
 * string alongside the value keeps currency formatting in one place and the chart dumb.
 */
export type ChartPoint = {
  key: string;
  label: string;
  value: number;
  display: string;
};

/**
 * One measure over time.
 *
 * Deliberately **one series per chart**. Units sold and gross live on scales three orders of
 * magnitude apart, and putting them on one plot with two y-axes would invent a correlation
 * the data does not contain. Small multiples share the x axis instead, which is the honest
 * way to read two measures together.
 *
 * Drawn as inline SVG rather than with a charting library: three small line charts do not
 * justify a dependency, and the marks then obey the same tokens as the rest of the product.
 */
export function TrendChart({
  title,
  points,
  emphasis = "Latest",
}: {
  title: string;
  points: ChartPoint[];
  emphasis?: string;
}) {
  const clipId = useId();
  const [hovered, setHovered] = useState<number | null>(null);

  const max = Math.max(1, ...points.map((point) => point.value));

  // A viewBox in abstract units, scaled by CSS: the chart stays crisp at any card width and
  // the geometry below never has to know how wide it ended up.
  const W = 320;
  const H = 96;
  const padX = 6;
  const padY = 10;

  const x = (i: number) =>
    points.length === 1 ? W / 2 : padX + (i * (W - padX * 2)) / (points.length - 1);
  const y = (v: number) => H - padY - (v / max) * (H - padY * 2);

  const line = points.map((point, i) => `${x(i)},${y(point.value)}`).join(" ");
  const area = `${padX},${H - padY} ${line} ${W - padX},${H - padY}`;

  const last = points[points.length - 1];
  const active = hovered === null ? null : points[hovered];

  return (
    <figure className="border-border bg-surface m-0 rounded-[var(--radius-card)] border p-5">
      <figcaption className="flex items-baseline justify-between gap-3">
        <span className="text-faint font-mono text-[11px] tracking-[0.12em] uppercase">
          {title}
        </span>
        <span className="text-muted text-xs">
          {emphasis} {last ? last.display : "—"}
        </span>
      </figcaption>

      <div className="relative mt-4">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          role="img"
          aria-label={`${title} over the last ${points.length} months. The table below has every value.`}
          className="h-24 w-full overflow-visible"
          onMouseLeave={() => setHovered(null)}
        >
          <defs>
            <clipPath id={clipId}>
              <rect x="0" y="0" width={W} height={H} />
            </clipPath>
          </defs>

          {/* A single hairline baseline. Solid, one shade off the surface: a grid of dashes
              reads as a threshold that is not there. */}
          <line
            x1={padX}
            y1={H - padY}
            x2={W - padX}
            y2={H - padY}
            stroke="var(--border-strong)"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
          />

          <polygon
            points={area}
            fill="var(--foreground)"
            opacity="0.06"
            clipPath={`url(#${clipId})`}
          />
          <polyline
            points={line}
            fill="none"
            stroke="var(--foreground)"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />

          {/* The endpoint is the only marker that is always drawn: the reader's eye goes to
              "where are we now", and a dot on every month is noise. */}
          {last && (
            <circle
              cx={x(points.length - 1)}
              cy={y(last.value)}
              r="4"
              fill="var(--foreground)"
              stroke="var(--surface)"
              strokeWidth="2"
            />
          )}

          {active && hovered !== null && (
            <>
              <line
                x1={x(hovered)}
                y1={padY - 6}
                x2={x(hovered)}
                y2={H - padY}
                stroke="var(--border-strong)"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
              <circle
                cx={x(hovered)}
                cy={y(active.value)}
                r="4"
                fill="var(--foreground)"
                stroke="var(--surface)"
                strokeWidth="2"
              />
            </>
          )}

          {/* Hit areas are full-height columns, so a value is reachable without landing on a
              4px dot. */}
          {points.map((point, i) => (
            <rect
              key={point.key}
              x={i === 0 ? 0 : x(i) - (W - padX * 2) / (points.length - 1) / 2}
              y="0"
              width={(W - padX * 2) / Math.max(1, points.length - 1)}
              height={H}
              fill="transparent"
              onMouseEnter={() => setHovered(i)}
            />
          ))}
        </svg>

        {active && (
          <div
            role="status"
            className="border-border-strong bg-surface text-foreground pointer-events-none absolute -top-2 rounded-[8px] border px-2.5 py-1.5 text-xs shadow-[0_8px_24px_-16px_rgba(0,0,0,0.5)]"
            style={{
              left: `${(hovered! / Math.max(1, points.length - 1)) * 100}%`,
              transform: "translateX(-50%)",
            }}
          >
            <span className="text-faint font-mono text-[10px] tracking-[0.1em] uppercase">
              {active.label}
            </span>{" "}
            {active.display}
          </div>
        )}
      </div>

      <div className="text-faint mt-2 flex justify-between font-mono text-[10px] tracking-[0.1em] uppercase">
        <span>{points[0]?.label}</span>
        <span>{last?.label}</span>
      </div>
    </figure>
  );
}
