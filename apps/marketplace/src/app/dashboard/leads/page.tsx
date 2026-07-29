import Link from "next/link";
import { redirect } from "next/navigation";
import { LEAD_STATUS_LABELS, leadStatusSchema, SITE, type LeadStatus } from "@selectcars/shared";
import { fetchLeads } from "@/lib/api";
import { getSession } from "@/lib/session";
import { getTeamMembers } from "@/lib/dashboard";
import { LeadRow } from "@/components/dashboard/lead-row";

export const metadata = {
  title: `Leads · ${SITE.name}`,
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function parseStatus(value: string | string[] | undefined): LeadStatus | null {
  if (typeof value !== "string") return null;
  const parsed = leadStatusSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/**
 * The pipeline.
 *
 * Ordered by the API with untouched enquiries first, because this screen is a queue before it
 * is a record: the question a salesperson opens it with is "who has not been answered yet".
 */
export default async function LeadsPage({ searchParams }: { searchParams: SearchParams }) {
  const status = parseStatus((await searchParams).status);

  const session = await getSession();
  if (!session) redirect("/signin");
  const tenantId = session.session.activeOrganizationId;
  if (!tenantId) redirect("/account");

  // The pipeline comes from the API (tenant-scoped, RBAC), the team from the auth tables this
  // app owns. The API returns an assignee id; the names live here.
  const [result, team] = await Promise.all([fetchLeads(), getTeamMembers(tenantId)]);

  if (!result.ok) {
    return (
      <div className="border-border bg-surface rounded-[var(--radius-card)] border p-14 text-center">
        <h1 className="text-foreground text-lg font-semibold tracking-tight">
          We could not load your leads
        </h1>
        <p className="text-muted mx-auto mt-2 max-w-sm text-sm">
          The API returned {result.status}. Make sure the API service is running, then refresh.
        </p>
      </div>
    );
  }

  const leads = result.data;
  const shown = status ? leads.filter((lead) => lead.status === status) : leads;
  const counts = leadStatusSchema.options.map((option) => ({
    status: option,
    count: leads.filter((lead) => lead.status === option).length,
  }));

  return (
    <div>
      <div>
        <span className="eyebrow">Leads</span>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">
          {leads.length} {leads.length === 1 ? "enquiry" : "enquiries"}
        </h1>
        <p className="text-muted mt-2 max-w-xl text-sm">
          Every message a buyer sends about one of your cars lands here, newest and unanswered
          first.
        </p>
      </div>

      <nav
        className="border-border mt-8 flex flex-wrap items-center gap-1 border-b"
        aria-label="Filter by stage"
      >
        <FilterLink
          label={`All (${leads.length})`}
          href="/dashboard/leads"
          active={status === null}
        />
        {counts.map((entry) => (
          <FilterLink
            key={entry.status}
            label={`${LEAD_STATUS_LABELS[entry.status]} (${entry.count})`}
            href={`/dashboard/leads?status=${entry.status}`}
            active={status === entry.status}
          />
        ))}
      </nav>

      <div className="mt-8">
        {shown.length === 0 ? (
          <div className="border-border bg-surface rounded-[var(--radius-card)] border border-dashed p-14 text-center">
            <h2 className="text-foreground text-lg font-semibold tracking-tight">
              {status ? "Nothing at this stage" : "No enquiries yet"}
            </h2>
            <p className="text-muted mx-auto mt-2 max-w-sm text-sm">
              {status
                ? "Try another stage."
                : "Buyers message you from your listings. Publish a car and the enquiries arrive here."}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-4">
            {shown.map((lead) => (
              <li key={lead.id}>
                <LeadRow lead={lead} team={team} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function FilterLink({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`-mb-px border-b-2 px-3 py-2.5 text-sm transition-colors ${
        active
          ? "border-foreground text-foreground font-medium"
          : "text-muted hover:text-foreground border-transparent"
      }`}
    >
      {label}
    </Link>
  );
}
