"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

function slugify(value: string): string {
  const base = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const suffix = Math.random().toString(36).slice(2, 6);
  return `${base || "dealership"}-${suffix}`;
}

export function CreateDealership() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const created = await authClient.organization.create({ name, slug: slugify(name) });
      if (created.error || !created.data) {
        setError(created.error?.message ?? "Could not create the dealership.");
        return;
      }
      const activated = await authClient.organization.setActive({
        organizationId: created.data.id,
      });
      if (activated.error) {
        setError(activated.error.message ?? "Could not activate the dealership.");
        return;
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <label className="block">
        <span className="text-muted mb-1.5 block font-mono text-[11px] tracking-[0.16em] uppercase">
          Dealership name
        </span>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Miami Prestige Motors"
          className="border-border-strong bg-surface text-foreground focus:border-foreground w-full rounded-[10px] border px-3.5 py-2.5 text-sm outline-none"
        />
      </label>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="bg-foreground text-background hover:bg-foreground/90 rounded-[10px] px-5 py-2.5 text-sm font-medium transition-colors disabled:opacity-50"
      >
        {pending ? "Creating" : "Create dealership"}
      </button>
    </form>
  );
}
