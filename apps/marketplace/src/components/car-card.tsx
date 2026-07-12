import Image from "next/image";
import Link from "next/link";
import { type Car, formatMileage, formatPrice } from "@/lib/cars";

export function CarCard({ car }: { car: Car }) {
  const specs = [String(car.year), car.body, car.transmission, car.fuel];

  return (
    <article className="border-border bg-surface flex flex-col rounded-[var(--radius-card)] border p-5 transition-shadow hover:shadow-[0_18px_44px_-24px_rgba(0,0,0,0.35)]">
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow leading-relaxed">
          {formatMileage(car.mileage).toUpperCase()} · {car.color.toUpperCase()}
        </p>
        {car.badge && (
          <span className="border-border-strong text-foreground shrink-0 rounded-full border px-2.5 py-1 font-mono text-[10px] font-medium tracking-[0.12em]">
            {car.badge}
          </span>
        )}
      </div>

      <h3 className="text-foreground mt-3 text-xl font-semibold tracking-tight">{car.brand}</h3>
      <p className="text-muted text-sm">{car.model}</p>

      <div className="my-6 h-44 w-full">
        <Image
          src={car.image}
          alt={`${car.brand} ${car.model}`}
          width={760}
          height={473}
          sizes="(max-width: 768px) 100vw, 33vw"
          className="h-full w-full object-contain"
        />
      </div>

      <div className="border-border mt-auto border-t pt-4">
        <p className="text-faint font-mono text-[11px] tracking-[0.1em]">
          {specs.join("  ·  ").toUpperCase()}
        </p>
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-foreground text-base font-semibold">{formatPrice(car.price)}</p>
          <Link
            href={`/colecao/${car.id}`}
            className="bg-foreground text-background inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-medium transition-opacity hover:opacity-90"
          >
            View details
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
