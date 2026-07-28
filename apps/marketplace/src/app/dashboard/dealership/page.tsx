import Link from "next/link";
import { SITE } from "@selectcars/shared";
import { fetchDealership } from "@/lib/api";
import { DealershipForm } from "@/components/dashboard/dealership-form";

export const metadata = {
  title: `Dealership · ${SITE.name}`,
};

/**
 * The seller side of the platform, in one screen: who this dealership is to a buyer.
 *
 * It is deliberately separate from inventory. Cars come and go daily; the storefront is
 * edited rarely, and mixing the two would put a "rename the store" control next to a
 * "publish this car" one.
 */
export default async function DealershipPage() {
  const result = await fetchDealership();

  return (
    <div className="mx-auto max-w-[900px]">
      <Link
        href="/dashboard"
        className="text-muted hover:text-foreground text-sm transition-colors"
      >
        <span aria-hidden="true">←</span> Back to inventory
      </Link>

      <div className="mt-6">
        <span className="eyebrow">Storefront</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Your dealership</h1>
        <p className="text-muted mt-2 max-w-xl text-sm">
          On SELECTCARS the seller of record is the dealership, not an individual. This is the
          identity buyers see next to every car you publish, and on your own page in the seller
          directory.
        </p>
      </div>

      {result.ok ? (
        <DealershipForm profile={result.data} />
      ) : (
        <div className="border-border bg-surface mt-8 rounded-[var(--radius-card)] border p-14 text-center">
          <h2 className="text-foreground text-lg font-semibold tracking-tight">
            We could not load your dealership
          </h2>
          <p className="text-muted mx-auto mt-2 max-w-sm text-sm">
            {result.status === 403
              ? "Only an owner or a manager can edit the dealership profile."
              : `The API returned ${result.status}. Make sure the API service is running, then refresh.`}
          </p>
        </div>
      )}
    </div>
  );
}
