"use client";

import { useState } from "react";

const STEPS = [
  {
    n: "01",
    t: "Initial conversation",
    d: "A private conversation to understand your profile, intended use, and what fits your moment. No obligation.",
  },
  {
    n: "02",
    t: "Tailored curation",
    d: "We present options from our inventory or source the exact car you want, domestically and internationally. Every candidate is vetted before it reaches you.",
  },
  {
    n: "03",
    t: "Inspection and paperwork",
    d: "Pre-purchase inspection, mechanical check, and a full documentation review. You receive the verified history before closing.",
  },
  {
    n: "04",
    t: "Delivery",
    d: "Transfer, preparation, and delivery of the vehicle, with insured transport nationwide.",
  },
];

export function ProcessSteps() {
  const [open, setOpen] = useState(1);

  return (
    <div className="border-border border-t">
      {STEPS.map((s, i) => {
        const isOpen = open === i;
        return (
          <div key={s.n} className="border-border border-b">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? -1 : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-4 py-5 text-left"
            >
              <span className="text-faint font-mono text-xs">{s.n}</span>
              <span className="text-foreground flex-1 text-lg font-medium">{s.t}</span>
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
              <p className="text-muted max-w-xl overflow-hidden pl-9 text-sm leading-6">{s.d}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
