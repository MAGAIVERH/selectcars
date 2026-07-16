import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Faq } from "@/components/faq";
import { FeaturedCar } from "@/components/featured-car";
import { ShowroomGrid } from "@/components/showroom-grid";
import { ProcessSteps } from "@/components/process-steps";
import { ContactForm } from "@/components/contact-form";
import { fetchPublicVehicles } from "@/lib/public-api";

const testimonials = [
  {
    name: "R. M.",
    role: "Business owner · Austin, TX",
    quote:
      "I searched for a specific Porsche for two years before I found SELECTCARS. In three weeks they located the right unit, in the right color, with the right history. Service on another level.",
  },
  {
    name: "C. A.",
    role: "Investor · New York, NY",
    quote:
      "What impressed me most was the discretion. I bought two cars through SELECTCARS and never once felt like a number. The process is quiet, precise, and respects your time.",
  },
  {
    name: "F. L.",
    role: "Collector · Los Angeles, CA",
    quote:
      "I had bad experiences buying imports before. This was different from the first contact. They truly understand the product and treat the car as a piece, not as stock.",
  },
];

export default async function Home() {
  // Home preview: the six most recent published listings, live from the database.
  const showroomVehicles = (await fetchPublicVehicles()).slice(0, 6);

  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        {/* Hero — cinematic, text-behind-subject */}
        <section className="border-border relative overflow-hidden border-b">
          {/* soft spotlight behind the car */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-[70%] h-[80vh] w-[80vh] -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(20,20,20,0.10), rgba(20,20,20,0.03) 45%, transparent 66%)",
            }}
          />

          <div className="relative mx-auto flex min-h-[calc(100vh-4rem)] max-w-[1280px] flex-col px-6">
            {/* stage */}
            <div className="relative flex flex-1 items-center py-8">
              {/* car — large, on the right */}
              <div
                data-hero-anim
                className="pointer-events-none absolute top-1/2 right-0 z-[1] w-[88%] max-w-[540px] -translate-y-1/2 sm:w-[62%] sm:max-w-[720px] lg:w-[58%] lg:max-w-[880px]"
                style={{ animation: "heroCar 1.1s cubic-bezier(0.2,0.7,0.2,1) both" }}
              >
                <Image
                  src="/Image (Porsche 911 GT3 RS).png"
                  alt="Porsche 911 GT3 RS"
                  width={754}
                  height={473}
                  priority
                  className="h-auto w-full"
                  style={{
                    filter: "drop-shadow(0 55px 55px rgba(0,0,0,0.24))",
                  }}
                />
              </div>

              {/* text — left */}
              <div
                data-hero-anim
                className="relative z-10 max-w-[86%] sm:max-w-[52%] lg:max-w-[42%]"
                style={{ animation: "heroReveal 0.9s ease both" }}
              >
                <h1 className="text-foreground text-5xl leading-[0.98] font-semibold tracking-[-0.03em] sm:text-6xl xl:text-7xl">
                  Cars you will not find.
                </h1>
                <p className="text-muted mt-3 text-3xl font-medium tracking-tight sm:text-4xl">
                  You will recognize them.
                </p>
                <div className="mt-10 flex flex-wrap gap-3">
                  <Link
                    href="/colecao"
                    className="bg-foreground text-background rounded-full px-6 py-3 text-sm font-medium transition-opacity hover:opacity-90"
                  >
                    View the collection
                  </Link>
                  <Link
                    href="#agendar"
                    className="border-border-strong bg-background/60 text-foreground hover:bg-surface rounded-full border px-6 py-3 text-sm font-medium backdrop-blur transition-colors"
                  >
                    Book a visit
                  </Link>
                </div>
              </div>
            </div>

            {/* bottom bar */}
            <div className="border-border/60 relative z-10 flex items-center justify-between gap-6 border-t py-5">
              <p className="eyebrow hidden sm:block">
                Porsche · Ferrari · Lamborghini · Aston Martin · Bentley
              </p>
              <p className="text-muted max-w-xs text-sm leading-6 lg:text-right">
                A curation for those who understand the difference between owning and belonging.
              </p>
            </div>
          </div>
        </section>

        {/* Sobre / manifesto */}
        <section id="sobre" className="mx-auto max-w-[1280px] px-6 py-16">
          {/* eyebrow + headline */}
          <div className="grid gap-6 lg:grid-cols-[1fr_2fr] lg:items-start">
            <p className="eyebrow pt-3">01 / About</p>
            <h2 className="text-foreground text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
              We do not sell cars.
              <br />
              We deliver exceptions.
            </h2>
          </div>

          {/* 5% + descrição */}
          <div className="mt-16 grid gap-12 lg:grid-cols-[1fr_2fr] lg:gap-16">
            <div>
              <p className="text-foreground text-8xl leading-none font-light tracking-tight sm:text-9xl">
                5%
              </p>
              <p className="eyebrow mt-5 max-w-[13rem] leading-relaxed">
                Share of appraised cars that reach the showroom
              </p>
            </div>
            <div className="max-w-2xl">
              <div className="text-muted space-y-5 text-base leading-7">
                <p>
                  SELECTCARS was born from the conviction that an extraordinary car deserves a
                  process to match. Every vehicle in our showroom has passed a rigorous selection:
                  verified provenance, documented history, and mechanical and cosmetic condition
                  held to standards that make no concessions.
                </p>
                <p>
                  We work with a limited number of units per month. By choice. Because serving well
                  matters more than selling in volume.
                </p>
              </div>
              <Link
                href="#processo"
                className="border-foreground text-foreground mt-8 inline-flex items-center gap-2 border-b pb-1 text-sm font-medium transition-opacity hover:opacity-70"
              >
                See the process
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>

          {/* timeline de eras */}
          <div className="border-border mt-20 border-t pt-6">
            <div className="flex items-center justify-between">
              <p className="eyebrow">Eras represented in the inventory</p>
              <p className="eyebrow">1960 to 2024</p>
            </div>
            <div className="border-border mt-6 grid grid-cols-6 border-t pt-4">
              {["1960", "1970", "1980", "1990", "2000", "2010"].map((year) => (
                <span
                  key={year}
                  className={`font-mono text-sm ${
                    year === "1970" ? "text-foreground" : "text-faint"
                  }`}
                >
                  {year}
                </span>
              ))}
            </div>
          </div>

          {/* imagem + três princípios */}
          <div className="mt-16 grid gap-10 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
            <div className="bg-surface flex items-center justify-center rounded-[var(--radius-card)] p-8 sm:p-10">
              <div className="relative h-[200px] w-full sm:h-[240px]">
                <Image
                  src="/porsche-hero.png"
                  alt="Porsche 911 GT3 RS"
                  fill
                  sizes="(max-width: 768px) 100vw, 40vw"
                  className="object-contain"
                />
              </div>
            </div>

            <div>
              <p className="eyebrow">Three principles</p>
              <div className="border-border mt-6 border-t">
                {[
                  {
                    t: "Provenance",
                    d: "Every vehicle is traced back to its first owner. Complete documentation, maintenance history, and an independent technical report.",
                  },
                  {
                    t: "Curation",
                    d: "We select fewer than 5% of the cars we appraise. What enters our showroom must offer more than a high price.",
                  },
                  {
                    t: "Discretion",
                    d: "Private, by-appointment service, with no street showroom. The buying process is as exclusive as the car.",
                  },
                ].map((p) => (
                  <div
                    key={p.t}
                    className="border-border grid gap-2 border-b py-6 sm:grid-cols-[1fr_2fr] sm:gap-8"
                  >
                    <h3 className="text-foreground text-lg font-medium">{p.t}</h3>
                    <p className="text-muted text-sm leading-6">{p.d}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Em destaque — showcase */}
        <section id="destaque" className="mx-auto max-w-[1280px] px-6 py-16">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="eyebrow">02 / Featured</p>
              <h2 className="text-foreground mt-3 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                Every detail accounted for.
                <br />
                Every provenance verified.
              </h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="border-border rounded-full border px-4 py-2">
                <span className="eyebrow">Model</span>{" "}
                <span className="text-foreground text-sm font-medium">Aston Martin DB12</span>
              </div>
              <div className="border-border rounded-full border px-4 py-2">
                <span className="eyebrow">Price</span>{" "}
                <span className="text-foreground text-sm font-medium">Inquire</span>
              </div>
            </div>
          </div>

          <div className="mt-12">
            <FeaturedCar />
          </div>
        </section>

        {/* Coleção — disponíveis no showroom */}
        <section id="colecao" className="mx-auto max-w-[1280px] px-6 py-16">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="eyebrow">03 / Collection</p>
              <h2 className="text-foreground mt-3 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                Available in the showroom.
              </h2>
              <p className="text-muted mt-4 max-w-md text-base leading-7">
                A selection updated weekly. For the full collection, book a private visit.
              </p>
            </div>
            <Link
              href="/colecao"
              className="border-border bg-surface text-foreground hover:bg-background inline-flex w-fit items-center gap-3 rounded-full border py-1.5 pr-1.5 pl-5 text-sm font-medium transition-colors"
            >
              View full collection
              <span className="bg-foreground text-background grid size-8 place-items-center rounded-full">
                →
              </span>
            </Link>
          </div>

          <div className="mt-10">
            <ShowroomGrid vehicles={showroomVehicles} />
          </div>

          {/* Não encontrou banner */}
          <div className="border-border bg-surface mt-10 flex flex-col gap-6 rounded-[var(--radius-card)] border p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
            <div>
              <h3 className="text-foreground text-xl font-semibold tracking-tight">
                Did not find what you are looking for?
              </h3>
              <p className="text-muted mt-2 max-w-xl text-sm leading-6">
                For specific models, limited editions, or units in other states, tell us what you
                are looking for. We search the domestic and international market.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-5">
              <Link
                href="#agendar"
                className="bg-foreground text-background inline-flex items-center gap-3 rounded-full py-1.5 pr-1.5 pl-5 text-sm font-medium transition-opacity hover:opacity-90"
              >
                Talk to a curator
                <span className="bg-background text-foreground grid size-8 place-items-center rounded-full">
                  →
                </span>
              </Link>
              <Link
                href="/colecao"
                className="text-muted hover:text-foreground hidden text-sm transition-colors sm:block"
              >
                View full collection
              </Link>
            </div>
          </div>
        </section>

        {/* 04 — Serviços */}
        <section id="servicos" className="mx-auto max-w-[1280px] px-6 py-16">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="eyebrow">04 / Services</p>
              <h2 className="text-foreground mt-3 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                Beyond the sale.
              </h2>
            </div>
            <p className="text-muted max-w-sm text-sm leading-6 lg:text-right">
              Full support for clients who see the automobile as an asset, not a mere object of
              consumption.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {/* sourcing */}
            <div className="bg-surface relative flex flex-col rounded-[var(--radius-card)] p-6">
              <div className="relative h-36 w-full">
                <Image
                  src="/porsche-hero.png"
                  alt="Porsche 911 GT3 RS"
                  fill
                  sizes="(max-width: 1024px) 100vw, 33vw"
                  className="object-contain"
                />
              </div>
              <div className="mt-6">
                <p className="eyebrow">International Sourcing</p>
                <p className="text-muted mt-3 text-sm leading-6">
                  Active search for specific models across the European, American, and Asian
                  markets. Full import with all paperwork handled.
                </p>
              </div>
            </div>

            {/* consignação (dark) */}
            <div className="bg-foreground text-background relative flex flex-col rounded-[var(--radius-card)] p-8">
              <span
                className="border-background/25 text-background/70 absolute top-6 right-6 grid size-8 place-items-center rounded-full border"
                aria-hidden="true"
              >
                ↗
              </span>
              <p className="text-background/50 font-mono text-[11px] tracking-[0.14em] uppercase">
                Premium consignment
              </p>
              <h3 className="mt-4 max-w-sm text-2xl leading-snug font-semibold tracking-tight">
                We sell your car the way it deserves to be presented.
              </h3>
              <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6">
                {[
                  ["Fair appraisal", "Independent technical report"],
                  ["Editorial presentation", "Photography · video · spec sheet"],
                  ["Qualified network", "Verified buyers"],
                  ["Full discretion", "No street showroom"],
                ].map(([t, d]) => (
                  <div key={t}>
                    <p className="text-sm font-medium">{t}</p>
                    <p className="text-background/50 mt-1 text-xs">{d}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* gestão */}
            <div className="bg-surface flex flex-col justify-between rounded-[var(--radius-card)] p-8">
              <div>
                <p className="eyebrow">For collections</p>
                <p className="text-foreground mt-4 text-4xl font-semibold tracking-tight">
                  Management
                </p>
                <p className="eyebrow mt-4 leading-relaxed">
                  Climate storage · Maintenance · Paperwork
                </p>
              </div>
              <Link
                href="#agendar"
                className="border-border text-foreground hover:bg-background mt-8 inline-flex items-center justify-between gap-3 rounded-full border py-1.5 pr-1.5 pl-5 text-sm font-medium transition-colors"
              >
                Collection management
                <span className="bg-foreground text-background grid size-7 place-items-center rounded-full">
                  ↗
                </span>
              </Link>
            </div>
          </div>

          <p className="text-muted mt-10 text-center text-lg">
            An asset deserves structure to match.
          </p>
        </section>

        {/* Statement banner */}
        <section className="border-border bg-surface border-y">
          <div className="mx-auto flex max-w-[1280px] flex-col items-center gap-8 px-6 py-14 lg:flex-row lg:gap-12">
            <div className="relative h-28 w-52 shrink-0">
              <Image
                src="/porsche-hero.png"
                alt="Porsche 911 GT3 RS"
                fill
                sizes="240px"
                className="object-contain"
              />
            </div>
            <div className="flex-1">
              <p className="eyebrow">Rare edition · SELECTCARS inventory</p>
              <p className="text-foreground mt-4 text-2xl leading-snug font-semibold tracking-tight sm:text-3xl">
                Buying a car should be as refined as driving one.
              </p>
              <p className="text-muted mt-4 max-w-xl text-sm leading-6">
                No pressure, no noise, no hidden clauses. Every step of the SELECTCARS process is
                designed so you recognize the right car, without ever being pushed toward any.
              </p>
            </div>
            <span className="text-faint inline-flex shrink-0 items-center gap-3 font-mono text-sm tracking-[0.22em]">
              <span className="bg-faint h-px w-6" aria-hidden="true" />
              SELECT
            </span>
          </div>
        </section>

        {/* 05 — O Processo */}
        <section id="processo" className="mx-auto max-w-[1280px] scroll-mt-24 px-6 py-16">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="eyebrow">05 / The Process</p>
              <h2 className="text-foreground mt-3 max-w-2xl text-3xl font-semibold tracking-tight sm:text-4xl">
                Buying a car should be as refined as driving one.
              </h2>
            </div>
            <p className="text-muted max-w-xs text-sm leading-6 lg:text-right">
              Four steps designed to deliver predictability, transparency, and the right time for
              every important decision.
            </p>
          </div>

          <div className="mt-12 grid items-start gap-8 lg:grid-cols-[1.3fr_1fr] lg:gap-12">
            <div className="bg-surface flex flex-col justify-between rounded-[var(--radius-card)] p-5">
              <div className="relative h-60 w-full sm:h-72">
                <Image
                  src="/porsche-hero.png"
                  alt="Porsche 911 GT3 RS"
                  fill
                  sizes="(max-width: 1024px) 100vw, 48vw"
                  className="object-contain"
                />
              </div>
              <div className="border-border mt-8 flex items-center justify-between border-t pt-5">
                <p className="eyebrow">4 steps · 1 standard</p>
                <div className="flex gap-2">
                  <span
                    className="border-border text-muted grid size-8 place-items-center rounded-full border"
                    aria-hidden="true"
                  >
                    ‹
                  </span>
                  <span
                    className="border-border text-muted grid size-8 place-items-center rounded-full border"
                    aria-hidden="true"
                  >
                    ›
                  </span>
                </div>
              </div>
            </div>
            <ProcessSteps />
          </div>
        </section>

        {/* 06 — Clientes */}
        <section className="mx-auto max-w-[1280px] px-6 py-16">
          <div className="flex items-end justify-between gap-6">
            <div>
              <p className="eyebrow">06 / Clients</p>
              <h2 className="text-foreground mt-3 text-3xl font-semibold tracking-tight sm:text-4xl lg:text-5xl">
                What defines us is
                <br />
                who trusts us.
              </h2>
            </div>
            <div className="hidden gap-2 sm:flex">
              <span
                className="border-border text-muted grid size-9 place-items-center rounded-full border"
                aria-hidden="true"
              >
                ‹
              </span>
              <span
                className="border-border text-muted grid size-9 place-items-center rounded-full border"
                aria-hidden="true"
              >
                ›
              </span>
            </div>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {testimonials.map((t, i) => {
              const dark = i === 1;
              return (
                <div
                  key={t.name}
                  className={`rounded-[var(--radius-card)] p-8 ${
                    dark ? "bg-foreground text-background" : "bg-surface"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">{t.name}</p>
                      <p className={`text-xs ${dark ? "text-background/50" : "text-faint"}`}>
                        {t.role}
                      </p>
                    </div>
                    {dark && (
                      <span
                        className="border-background/25 text-background/70 grid size-8 place-items-center rounded-full border"
                        aria-hidden="true"
                      >
                        ↗
                      </span>
                    )}
                  </div>
                  <p
                    className={`mt-4 text-sm tracking-[0.15em] ${
                      dark ? "text-background/70" : "text-faint"
                    }`}
                  >
                    ★★★★★
                  </p>
                  <p
                    className={`mt-4 text-sm leading-6 ${
                      dark ? "text-background/80" : "text-muted"
                    }`}
                  >
                    {t.quote}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Perguntas / FAQ */}
        <section id="perguntas" className="border-border bg-surface/40 border-t">
          <div className="mx-auto max-w-[1280px] px-6 py-20 sm:py-24">
            <p className="eyebrow text-center">Frequently asked</p>
            <h2 className="text-foreground mt-4 text-center text-5xl font-semibold tracking-tight sm:text-6xl">
              Before you book.
            </h2>
            <div className="mx-auto mt-12 max-w-3xl">
              <Faq />
            </div>
          </div>
        </section>

        {/* 07 — Próximo passo */}
        <section id="agendar" className="mx-auto max-w-[1280px] scroll-mt-20 px-6 py-20 sm:py-24">
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="eyebrow">07 / Next step</p>
              <h2 className="text-foreground mt-4 text-4xl leading-[1.05] font-semibold tracking-tight sm:text-5xl">
                Find your next one.
                <br />
                <span className="text-muted">Or the one you did not yet know was yours.</span>
              </h2>
              <p className="text-muted mt-6 max-w-md text-base leading-7">
                Whether it is a specific purchase, a consignment, or a conversation about what fits
                your moment, we are available. Private service, by appointment.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="#agendar"
                  className="bg-foreground text-background inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-opacity hover:opacity-90"
                >
                  Talk to a curator
                  <span aria-hidden="true">→</span>
                </Link>
                <Link
                  href="/colecao"
                  className="border-border-strong text-foreground hover:bg-surface rounded-full border px-6 py-3 text-sm font-medium transition-colors"
                >
                  View collection
                </Link>
              </div>

              <div className="border-border mt-12 grid gap-8 border-t pt-8 sm:grid-cols-3">
                {[
                  {
                    t: "Showroom",
                    lines: ["Miami · FL", "Address shared upon appointment"],
                  },
                  {
                    t: "Hours",
                    lines: ["Mon to Fri · 10am to 7pm", "Saturday · 10am to 2pm"],
                  },
                  {
                    t: "Direct contact",
                    lines: ["+1 (305) 000-0000", "contact@selectcars.com"],
                  },
                ].map((c) => (
                  <div key={c.t}>
                    <p className="eyebrow">{c.t}</p>
                    <div className="text-muted mt-3 space-y-1 text-sm">
                      {c.lines.map((l) => (
                        <p key={l}>{l}</p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <ContactForm />
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
