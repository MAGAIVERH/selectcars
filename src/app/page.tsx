import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Faq } from "@/components/faq";
import { FeaturedCar } from "@/components/featured-car";
import { ShowroomGrid } from "@/components/showroom-grid";
import { ProcessSteps } from "@/components/process-steps";
import { ContactForm } from "@/components/contact-form";
import { cars } from "@/lib/cars";

// showroom preview shows the six vehicles with real photography
const showroomCars = cars.slice(0, 6);

const testimonials = [
  {
    name: "R. M.",
    role: "Empresário · São Paulo",
    quote:
      "Procurei um Porsche específico por dois anos antes de chegar à SELECTCARS. Em três semanas eles encontraram a unidade certa, na cor certa, com o histórico certo. Atendimento de outro nível.",
  },
  {
    name: "C. A.",
    role: "Investidor · Rio de Janeiro",
    quote:
      "O que mais me impressionou foi a discrição. Comprei dois carros pela SELECTCARS e em nenhum momento me senti um número. O processo é silencioso, preciso e respeita o seu tempo.",
  },
  {
    name: "F. L.",
    role: "Colecionador · Belo Horizonte",
    quote:
      "Já tive experiências ruins comprando importados. Aqui foi diferente desde o primeiro contato. Eles realmente entendem o produto e tratam o carro como peça, não como estoque.",
  },
];

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main className="flex-1">
        {/* Hero — cinematic, text-behind-subject */}
        <section className="relative overflow-hidden border-b border-border">
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
                <h1 className="text-5xl leading-[0.98] font-semibold tracking-[-0.03em] text-foreground sm:text-6xl xl:text-7xl">
                  Carros que não se encontram.
                </h1>
                <p className="mt-3 text-3xl font-medium tracking-tight text-muted sm:text-4xl">
                  Se reconhecem.
                </p>
                <div className="mt-10 flex flex-wrap gap-3">
                  <Link
                    href="/colecao"
                    className="rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
                  >
                    Ver a coleção
                  </Link>
                  <Link
                    href="#agendar"
                    className="rounded-full border border-border-strong bg-background/60 px-6 py-3 text-sm font-medium text-foreground backdrop-blur transition-colors hover:bg-surface"
                  >
                    Agendar visita
                  </Link>
                </div>
              </div>
            </div>

            {/* bottom bar */}
            <div className="relative z-10 flex items-center justify-between gap-6 border-t border-border/60 py-5">
              <p className="eyebrow hidden sm:block">
                Porsche · Ferrari · Lamborghini · Aston Martin · Bentley
              </p>
              <p className="max-w-xs text-sm leading-6 text-muted lg:text-right">
                Uma curadoria para quem entende a diferença entre possuir e
                pertencer.
              </p>
            </div>
          </div>
        </section>

        {/* Sobre / manifesto */}
        <section id="sobre" className="mx-auto max-w-[1280px] px-6 py-16">
          {/* eyebrow + headline */}
          <div className="grid gap-6 lg:grid-cols-[1fr_2fr] lg:items-start">
            <p className="eyebrow pt-3">01 / Sobre</p>
            <h2 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
              Não vendemos carros.
              <br />
              Entregamos exceções.
            </h2>
          </div>

          {/* 5% + descrição */}
          <div className="mt-16 grid gap-12 lg:grid-cols-[1fr_2fr] lg:gap-16">
            <div>
              <p className="text-8xl leading-none font-light tracking-tight text-foreground sm:text-9xl">
                5%
              </p>
              <p className="eyebrow mt-5 max-w-[13rem] leading-relaxed">
                Percentual de carros avaliados que chegam ao showroom
              </p>
            </div>
            <div className="max-w-2xl">
              <div className="space-y-5 text-base leading-7 text-muted">
                <p>
                  A SELECTCARS nasceu da convicção de que um carro extraordinário
                  merece um processo à altura. Cada veículo no nosso showroom
                  passou por uma seleção criteriosa: procedência verificada,
                  histórico documentado, condição mecânica e estética dentro de
                  padrões que não admitem concessões.
                </p>
                <p>
                  Trabalhamos com um número limitado de unidades por mês. Por
                  escolha. Porque atender bem importa mais do que vender muito.
                </p>
              </div>
              <Link
                href="#processo"
                className="mt-8 inline-flex items-center gap-2 border-b border-foreground pb-1 text-sm font-medium text-foreground transition-opacity hover:opacity-70"
              >
                Conheça o processo
                <span aria-hidden="true">→</span>
              </Link>
            </div>
          </div>

          {/* timeline de eras */}
          <div className="mt-20 border-t border-border pt-6">
            <div className="flex items-center justify-between">
              <p className="eyebrow">Eras representadas no acervo</p>
              <p className="eyebrow">1960 a 2024</p>
            </div>
            <div className="mt-6 grid grid-cols-6 border-t border-border pt-4">
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
            <div className="flex items-center justify-center rounded-[var(--radius-card)] bg-surface p-8 sm:p-10">
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
              <p className="eyebrow">Três princípios</p>
              <div className="mt-6 border-t border-border">
                {[
                  {
                    t: "Procedência",
                    d: "Cada veículo é rastreado desde o primeiro proprietário. Documentação completa, histórico de manutenção e laudo técnico independente.",
                  },
                  {
                    t: "Curadoria",
                    d: "Selecionamos menos de 5% dos carros que avaliamos. O que entra no nosso showroom precisa ter algo além de preço alto.",
                  },
                  {
                    t: "Discrição",
                    d: "Atendimento privado, agendado, sem vitrine de rua. O processo de compra é tão exclusivo quanto o carro.",
                  },
                ].map((p) => (
                  <div
                    key={p.t}
                    className="grid gap-2 border-b border-border py-6 sm:grid-cols-[1fr_2fr] sm:gap-8"
                  >
                    <h3 className="text-lg font-medium text-foreground">
                      {p.t}
                    </h3>
                    <p className="text-sm leading-6 text-muted">{p.d}</p>
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
              <p className="eyebrow">02 / Em destaque</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                Cada detalhe contado.
                <br />
                Cada procedência verificada.
              </h2>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="rounded-full border border-border px-4 py-2">
                <span className="eyebrow">Modelo</span>{" "}
                <span className="text-sm font-medium text-foreground">
                  Aston Martin DB12
                </span>
              </div>
              <div className="rounded-full border border-border px-4 py-2">
                <span className="eyebrow">Valor</span>{" "}
                <span className="text-sm font-medium text-foreground">
                  Sob consulta
                </span>
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
              <p className="eyebrow">03 / Coleção</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                Disponíveis no showroom.
              </h2>
              <p className="mt-4 max-w-md text-base leading-7 text-muted">
                Uma seleção atualizada semanalmente. Para a coleção completa,
                agende uma visita privada.
              </p>
            </div>
            <Link
              href="/colecao"
              className="inline-flex w-fit items-center gap-3 rounded-full border border-border bg-surface py-1.5 pr-1.5 pl-5 text-sm font-medium text-foreground transition-colors hover:bg-background"
            >
              Ver coleção completa
              <span className="grid size-8 place-items-center rounded-full bg-foreground text-background">
                →
              </span>
            </Link>
          </div>

          <div className="mt-10">
            <ShowroomGrid cars={showroomCars} />
          </div>

          {/* Não encontrou banner */}
          <div className="mt-10 flex flex-col gap-6 rounded-[var(--radius-card)] border border-border bg-surface p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
            <div>
              <h3 className="text-xl font-semibold tracking-tight text-foreground">
                Não encontrou o que procura?
              </h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted">
                Para modelos específicos, edições limitadas ou unidades em outros
                estados, compartilhe o que você procura. Buscamos no mercado
                interno e internacional.
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-5">
              <Link
                href="#agendar"
                className="inline-flex items-center gap-3 rounded-full bg-foreground py-1.5 pr-1.5 pl-5 text-sm font-medium text-background transition-opacity hover:opacity-90"
              >
                Falar com um curador
                <span className="grid size-8 place-items-center rounded-full bg-background text-foreground">
                  →
                </span>
              </Link>
              <Link
                href="/colecao"
                className="hidden text-sm text-muted transition-colors hover:text-foreground sm:block"
              >
                Ver coleção completa
              </Link>
            </div>
          </div>
        </section>

        {/* 04 — Serviços */}
        <section id="servicos" className="mx-auto max-w-[1280px] px-6 py-16">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="eyebrow">04 / Serviços</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                Para além da venda.
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-6 text-muted lg:text-right">
              Estrutura completa para clientes que veem o automóvel como
              patrimônio, não como mero objeto de consumo.
            </p>
          </div>

          <div className="mt-10 grid gap-4 lg:grid-cols-3">
            {/* sourcing */}
            <div className="relative flex flex-col rounded-[var(--radius-card)] bg-surface p-6">
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
                <p className="eyebrow">Sourcing Internacional</p>
                <p className="mt-3 text-sm leading-6 text-muted">
                  Procura ativa de modelos específicos no mercado europeu,
                  americano e asiático. Importação completa com toda a
                  documentação regularizada.
                </p>
              </div>
            </div>

            {/* consignação (dark) */}
            <div className="relative flex flex-col rounded-[var(--radius-card)] bg-foreground p-8 text-background">
              <span
                className="absolute top-6 right-6 grid size-8 place-items-center rounded-full border border-background/25 text-background/70"
                aria-hidden="true"
              >
                ↗
              </span>
              <p className="font-mono text-[11px] tracking-[0.14em] text-background/50 uppercase">
                Consignação premium
              </p>
              <h3 className="mt-4 max-w-sm text-2xl leading-snug font-semibold tracking-tight">
                Vendemos o seu carro do jeito que ele merece ser apresentado.
              </h3>
              <div className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6">
                {[
                  ["Avaliação justa", "Laudo técnico independente"],
                  ["Apresentação editorial", "Fotografia · vídeo · ficha"],
                  ["Rede qualificada", "Compradores verificados"],
                  ["Discrição total", "Sem exposição em vitrine"],
                ].map(([t, d]) => (
                  <div key={t}>
                    <p className="text-sm font-medium">{t}</p>
                    <p className="mt-1 text-xs text-background/50">{d}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* gestão */}
            <div className="flex flex-col justify-between rounded-[var(--radius-card)] bg-surface p-8">
              <div>
                <p className="eyebrow">Para coleções</p>
                <p className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
                  Gestão
                </p>
                <p className="eyebrow mt-4 leading-relaxed">
                  Climatização · Manutenção · Documentação
                </p>
              </div>
              <Link
                href="#agendar"
                className="mt-8 inline-flex items-center justify-between gap-3 rounded-full border border-border py-1.5 pr-1.5 pl-5 text-sm font-medium text-foreground transition-colors hover:bg-background"
              >
                Gestão de coleção
                <span className="grid size-7 place-items-center rounded-full bg-foreground text-background">
                  ↗
                </span>
              </Link>
            </div>
          </div>

          <p className="mt-10 text-center text-lg text-muted">
            Patrimônio merece estrutura à altura.
          </p>
        </section>

        {/* Statement banner */}
        <section className="border-y border-border bg-surface">
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
              <p className="eyebrow">Edição rara · Acervo SELECTCARS</p>
              <p className="mt-4 text-2xl leading-snug font-semibold tracking-tight text-foreground sm:text-3xl">
                Comprar um carro deveria ser tão refinado quanto dirigi-lo.
              </p>
              <p className="mt-4 max-w-xl text-sm leading-6 text-muted">
                Sem pressa, sem ruído, sem cláusulas escondidas. Cada etapa do
                processo SELECTCARS é desenhada para que você reconheça o carro
                certo, sem nunca ser empurrado para nenhum.
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-3 font-mono text-sm tracking-[0.22em] text-faint">
              <span className="h-px w-6 bg-faint" aria-hidden="true" />
              SELECT
            </span>
          </div>
        </section>

        {/* 05 — O Processo */}
        <section
          id="processo"
          className="mx-auto max-w-[1280px] scroll-mt-24 px-6 py-16"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="eyebrow">05 / O Processo</p>
              <h2 className="mt-3 max-w-2xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Comprar um carro deveria ser tão refinado quanto dirigi-lo.
              </h2>
            </div>
            <p className="max-w-xs text-sm leading-6 text-muted lg:text-right">
              Quatro etapas pensadas para entregar previsibilidade,
              transparência e o tempo adequado para cada decisão importante.
            </p>
          </div>

          <div className="mt-12 grid items-start gap-8 lg:grid-cols-[1.3fr_1fr] lg:gap-12">
            <div className="flex flex-col justify-between rounded-[var(--radius-card)] bg-surface p-5">
              <div className="relative h-60 w-full sm:h-72">
                <Image
                  src="/porsche-hero.png"
                  alt="Porsche 911 GT3 RS"
                  fill
                  sizes="(max-width: 1024px) 100vw, 48vw"
                  className="object-contain"
                />
              </div>
              <div className="mt-8 flex items-center justify-between border-t border-border pt-5">
                <p className="eyebrow">04 etapas · 1 padrão</p>
                <div className="flex gap-2">
                  <span
                    className="grid size-8 place-items-center rounded-full border border-border text-muted"
                    aria-hidden="true"
                  >
                    ‹
                  </span>
                  <span
                    className="grid size-8 place-items-center rounded-full border border-border text-muted"
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
              <p className="eyebrow">06 / Clientes</p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
                O que nos define é
                <br />
                quem confia em nós.
              </h2>
            </div>
            <div className="hidden gap-2 sm:flex">
              <span
                className="grid size-9 place-items-center rounded-full border border-border text-muted"
                aria-hidden="true"
              >
                ‹
              </span>
              <span
                className="grid size-9 place-items-center rounded-full border border-border text-muted"
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
                      <p
                        className={`text-xs ${
                          dark ? "text-background/50" : "text-faint"
                        }`}
                      >
                        {t.role}
                      </p>
                    </div>
                    {dark && (
                      <span
                        className="grid size-8 place-items-center rounded-full border border-background/25 text-background/70"
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
        <section id="perguntas" className="border-t border-border bg-surface/40">
          <div className="mx-auto max-w-[1280px] px-6 py-20 sm:py-24">
            <p className="eyebrow text-center">Perguntas frequentes</p>
            <h2 className="mt-4 text-center text-5xl font-semibold tracking-tight text-foreground sm:text-6xl">
              Antes de agendar.
            </h2>
            <div className="mx-auto mt-12 max-w-3xl">
              <Faq />
            </div>
          </div>
        </section>

        {/* 07 — Próximo passo */}
        <section
          id="agendar"
          className="mx-auto max-w-[1280px] scroll-mt-20 px-6 py-20 sm:py-24"
        >
          <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <p className="eyebrow">07 / Próximo passo</p>
              <h2 className="mt-4 text-4xl leading-[1.05] font-semibold tracking-tight text-foreground sm:text-5xl">
                Encontre o seu próximo.
                <br />
                <span className="text-muted">
                  Ou o que você ainda não sabia que era o seu.
                </span>
              </h2>
              <p className="mt-6 max-w-md text-base leading-7 text-muted">
                Seja para uma compra específica, uma consignação ou uma conversa
                sobre o que faz sentido para o seu momento, estamos disponíveis.
                Atendimento privado, sob agendamento.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="#agendar"
                  className="inline-flex items-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
                >
                  Falar com um curador
                  <span aria-hidden="true">→</span>
                </Link>
                <Link
                  href="/colecao"
                  className="rounded-full border border-border-strong px-6 py-3 text-sm font-medium text-foreground transition-colors hover:bg-surface"
                >
                  Ver coleção
                </Link>
              </div>

              <div className="mt-12 grid gap-8 border-t border-border pt-8 sm:grid-cols-3">
                {[
                  {
                    t: "Showroom",
                    lines: ["São Paulo · SP", "Endereço enviado no agendamento"],
                  },
                  {
                    t: "Horário",
                    lines: ["Seg a sex · 10h às 19h", "Sábado · 10h às 14h"],
                  },
                  {
                    t: "Contato direto",
                    lines: ["+55 11 0000-0000", "contato@selectcars.com.br"],
                  },
                ].map((c) => (
                  <div key={c.t}>
                    <p className="eyebrow">{c.t}</p>
                    <div className="mt-3 space-y-1 text-sm text-muted">
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
