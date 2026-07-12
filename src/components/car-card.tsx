import Image from "next/image";
import Link from "next/link";
import { type Car, formatKm, formatPrice } from "@/lib/cars";

export function CarCard({ car }: { car: Car }) {
  const specs = [String(car.year), car.body, car.transmission, car.fuel];

  return (
    <article className="flex flex-col rounded-[var(--radius-card)] border border-border bg-surface p-5 transition-shadow hover:shadow-[0_18px_44px_-24px_rgba(0,0,0,0.35)]">
      <div className="flex items-start justify-between gap-3">
        <p className="eyebrow leading-relaxed">
          {formatKm(car.km).toUpperCase()} · {car.color.toUpperCase()}
        </p>
        {car.badge && (
          <span className="shrink-0 rounded-full border border-border-strong px-2.5 py-1 font-mono text-[10px] font-medium tracking-[0.12em] text-foreground">
            {car.badge}
          </span>
        )}
      </div>

      <h3 className="mt-3 text-xl font-semibold tracking-tight text-foreground">
        {car.brand}
      </h3>
      <p className="text-sm text-muted">{car.model}</p>

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

      <div className="mt-auto border-t border-border pt-4">
        <p className="font-mono text-[11px] tracking-[0.1em] text-faint">
          {specs.join("  ·  ").toUpperCase()}
        </p>
        <div className="mt-4 flex items-center justify-between gap-3">
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
      </div>
    </article>
  );
}
