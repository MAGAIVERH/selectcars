"use client";

import { useState } from "react";

const STEPS = [
  {
    n: "01",
    t: "Conversa inicial",
    d: "Uma conversa privada para entender seu perfil, o uso pretendido e o que faz sentido para o seu momento. Sem compromisso.",
  },
  {
    n: "02",
    t: "Curadoria personalizada",
    d: "Apresentamos opções do nosso estoque ou buscamos no mercado interno e internacional o carro exato que você procura. Cada candidato é avaliado antes de chegar até você.",
  },
  {
    n: "03",
    t: "Inspeção e documentação",
    d: "Laudo cautelar, inspeção mecânica e checagem documental completa. Você recebe todo o histórico verificado antes de fechar negócio.",
  },
  {
    n: "04",
    t: "Entrega",
    d: "Transferência, preparação e entrega do veículo, com transporte assegurado para qualquer estado.",
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
