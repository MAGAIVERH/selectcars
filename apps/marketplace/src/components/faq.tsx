"use client";

import { useState } from "react";

type Item = {
  q: string;
  a: string;
  bullets?: string[];
};

const ITEMS: Item[] = [
  {
    q: "How does buying at SELECTCARS work?",
    a: "It starts with a private conversation to understand your profile, preferences, and intended use. From there we can:",
    bullets: [
      "Present options from our current showroom inventory",
      "Source the exact car you want, domestically and internationally",
      "Handle the full process: inspection, paperwork, title transfer, and delivery",
    ],
  },
  {
    q: "Do you import specific models?",
    a: "Yes. A large part of our inventory comes from international sourcing. We locate the model, year, and specification you want in Europe, the US, or Asia, with full import and paperwork.",
  },
  {
    q: "How does consignment work?",
    a: "We handle the appraisal, editorial presentation, and negotiation of your vehicle, with access to a network of verified buyers and complete discretion.",
  },
  {
    q: "Can I finance the purchase?",
    a: "Yes. We work with partners for financing and insurance tailored to high-value vehicles. We present the options at the offer stage.",
  },
  {
    q: "Do you deliver outside Miami?",
    a: "Yes. We handle the entire deal remotely and arrange door-to-door transport, fully insured, nationwide.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {ITEMS.map((item, i) => {
        const isOpen = open === i;
        return (
          <div key={item.q} className="bg-surface rounded-[var(--radius-card)] px-6 py-1">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-4 py-5 text-left"
            >
              <span className="text-faint font-mono text-xs">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-foreground flex-1 text-base font-medium">{item.q}</span>
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-full text-base transition-colors ${
                  isOpen ? "bg-foreground text-background" : "border-border text-muted border"
                }`}
                aria-hidden="true"
              >
                {isOpen ? "−" : "+"}
              </span>
            </button>
            <div
              className={`grid transition-all duration-300 ${
                isOpen ? "grid-rows-[1fr] pb-6" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden pl-9">
                <p className="text-muted max-w-2xl text-sm leading-7">{item.a}</p>
                {item.bullets && (
                  <ul className="mt-3 space-y-1.5">
                    {item.bullets.map((b) => (
                      <li key={b} className="text-muted flex gap-2 text-sm leading-6">
                        <span className="text-faint">·</span>
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
