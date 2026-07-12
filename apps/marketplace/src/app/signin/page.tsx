import Link from "next/link";
import { redirect } from "next/navigation";
import { SITE } from "@selectcars/shared";
import { getSession } from "@/lib/session";
import { SignInForm } from "@/components/auth/sign-in-form";

export const metadata = {
  title: `Sign in · ${SITE.name}`,
};

export default async function SignInPage() {
  const session = await getSession();
  if (session) redirect("/account");

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-[400px]">
        <div className="mb-10 text-center">
          <Link
            href="/"
            className="text-foreground font-mono text-sm font-semibold tracking-[0.22em]"
          >
            SELECTCARS
          </Link>
          <h1 className="mt-8 text-2xl font-semibold tracking-tight">Dealer access</h1>
          <p className="text-muted mt-2 text-sm">
            Sign in to manage your showroom inventory and leads.
          </p>
        </div>

        <SignInForm />
      </div>
    </main>
  );
}
