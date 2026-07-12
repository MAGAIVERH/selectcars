"use client";

import { useState } from "react";

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
      <p className="eyebrow">Agendar visita ao showroom</p>
      <p className="text-muted mt-3 text-base leading-7">
        Compartilhe o que você procura. Respondemos no mesmo dia útil.
      </p>

      {sent ? (
        <div className="border-border mt-8 rounded-[var(--radius-card)] border p-8 text-center">
          <p className="text-foreground text-lg font-medium">Mensagem enviada.</p>
          <p className="text-muted mt-2 text-sm">Um curador entra em contato em breve.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-3">
          <input required placeholder="Nome completo" className={inputClass} />
          <input required type="email" placeholder="E-mail" className={inputClass} />
          <input placeholder="WhatsApp: DDD + número" className={inputClass} />
          <textarea
            rows={4}
            placeholder="Conte um pouco sobre o que procura: modelo, ano, faixa de valor"
            className="border-border bg-background text-foreground placeholder:text-faint focus:border-border-strong w-full resize-none rounded-[20px] border px-5 py-3 text-sm transition-colors outline-none"
          />
          <button
            type="submit"
            className="bg-foreground text-background w-full rounded-full py-3.5 text-sm font-medium transition-opacity hover:opacity-90"
          >
            Enviar mensagem
          </button>
        </form>
      )}

      <p className="text-faint mt-4 text-center text-xs">
        Resposta em até 1 dia útil · Atendimento confidencial
      </p>
    </div>
  );
}
