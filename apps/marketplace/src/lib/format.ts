/** US-market display formatters, shared across the marketplace and dashboard UI. */

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

/** A USD price, or "Inquire" when the price is withheld (null). */
export function formatPrice(price: number | null): string {
  return price === null ? "Inquire" : usd.format(price);
}

/** Mileage in US miles, e.g. "12,500 mi". */
export function formatMileage(mileage: number): string {
  return `${new Intl.NumberFormat("en-US").format(mileage)} mi`;
}
