"use client";

import { useState } from "react";

type Item = {
  q: string;
  a: string;
  bullets?: string[];
};

const ITEMS: Item[] = [
  {
    q: "Como funciona o processo de compra na SELECTCARS?",
    a: "Tudo começa com uma conversa privada para entender seu perfil, preferências e o uso pretendido. A partir daí podemos:",
    bullets: [
      "Apresentar opções do nosso estoque atual no showroom",
      "Buscar no mercado interno e internacional o carro exato que você procura",
      "Conduzir todo o processo: laudo técnico, documentação, transferência e entrega",
    ],
  },
  {
    q: "Vocês fazem importação de modelos específicos?",
    a: "Sim. Grande parte do nosso acervo vem de sourcing internacional. Localizamos o modelo, ano e configuração que você procura na Europa, Estados Unidos ou Ásia, com importação e documentação completas.",
  },
  {
    q: "Como funciona a consignação?",
    a: "Cuidamos da avaliação, da apresentação editorial e da negociação do seu veículo, com acesso a uma rede de compradores verificados e total discrição.",
  },
  {
    q: "Posso financiar a compra?",
    a: "Sim. Trabalhamos com parceiros para financiamento e seguro sob medida para veículos de alto valor. Apresentamos as opções no momento da proposta.",
  },
  {
    q: "Vocês entregam fora de São Paulo?",
    a: "Sim. Conduzimos toda a negociação à distância e organizamos o transporte porta a porta, com seguro total, para qualquer estado.",
  },
];

export function Faq() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="space-y-3">
      {ITEMS.map((item, i) => {
        const isOpen = open === i;
        return (
          <div
            key={item.q}
            className="rounded-[var(--radius-card)] bg-surface px-6 py-1"
          >
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              aria-expanded={isOpen}
              className="flex w-full items-center gap-4 py-5 text-left"
            >
              <span className="font-mono text-xs text-faint">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex-1 text-base font-medium text-foreground">
                {item.q}
              </span>
              <span
                className={`grid size-7 shrink-0 place-items-center rounded-full text-base transition-colors ${
                  isOpen
                    ? "bg-foreground text-background"
                    : "border border-border text-muted"
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
                <p className="max-w-2xl text-sm leading-7 text-muted">
                  {item.a}
                </p>
                {item.bullets && (
                  <ul className="mt-3 space-y-1.5">
                    {item.bullets.map((b) => (
                      <li
                        key={b}
                        className="flex gap-2 text-sm leading-6 text-muted"
                      >
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
