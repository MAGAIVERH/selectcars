"use client";

import { useState } from "react";
import { Button } from "@selectcars/ui";

const inputClass =
  "w-full rounded-full border border-border bg-background px-5 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-faint focus:border-border-strong";

export function ContactForm() {
  const [sent, setSent] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSent(true);
  }

  return (
    <div className="bg-surface rounded-[var(--radius-card)] p-8 sm:p-10">
      <p className="eyebrow">Book a showroom visit</p>
      <p className="text-muted mt-3 text-base leading-7">
        Tell us what you are looking for. We reply the same business day.
      </p>

      {sent ? (
        <div className="border-border mt-8 rounded-[var(--radius-card)] border p-8 text-center">
          <p className="text-foreground text-lg font-medium">Message sent.</p>
          <p className="text-muted mt-2 text-sm">A curator will reach out shortly.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input required placeholder="Full name" className={inputClass} />
          <input required type="email" placeholder="Email" className={inputClass} />
          <input placeholder="Phone number" className={inputClass} />
          <textarea
            rows={4}
            placeholder="Tell us a bit about what you are looking for: model, year, budget"
            className="border-border bg-background text-foreground placeholder:text-faint focus:border-border-strong w-full resize-none rounded-[20px] border px-5 py-3 text-sm transition-colors outline-none"
          />
          <Button type="submit" size="lg" className="w-full">
            Send message
          </Button>
        </form>
      )}

      <p className="text-faint mt-4 text-center text-xs">
        Reply within one business day · Confidential
      </p>
    </div>
  );
}
