import Link from "next/link";

const COLUMNS = [
  {
    title: "Navegação",
    links: [
      { label: "Coleção", href: "/colecao" },
      { label: "Marcas", href: "/colecao" },
      { label: "Serviços", href: "/#servicos" },
      { label: "Sobre", href: "/#sobre" },
      { label: "Contato", href: "/#agendar" },
    ],
  },
  {
    title: "Serviços",
    links: [
      { label: "Sourcing Internacional", href: "/#servicos" },
      { label: "Consignação premium", href: "/#servicos" },
      { label: "Gestão de coleção", href: "/#servicos" },
      { label: "Financiamento e seguro", href: "/#agendar" },
    ],
  },
];

const SOCIALS = ["Instagram", "LinkedIn", "WhatsApp"];

export function SiteFooter() {
  return (
    <footer className="bg-foreground text-background">
      <div className="mx-auto max-w-[1280px] px-6 py-16">
        <div className="grid gap-12 lg:grid-cols-[2fr_1fr_1fr_1.2fr]">
          <div>
            <p className="text-3xl font-semibold tracking-[0.14em]">
              SELECTCARS
            </p>
            <p className="mt-5 max-w-xs text-sm leading-6 text-background/60">
              Curadoria de automóveis premium para o colecionador exigente.
              Atemporal. Discreta. Inconfundível.
            </p>
            <p className="mt-6 font-mono text-[11px] tracking-[0.16em] text-background/40 uppercase">
              São Paulo · Brasil
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="font-mono text-[11px] tracking-[0.16em] text-background/40 uppercase">
                {col.title}
              </p>
              <ul className="mt-5 space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-background/80 transition-colors hover:text-background"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <p className="font-mono text-[11px] tracking-[0.16em] text-background/40 uppercase">
              Contato
            </p>
            <ul className="mt-5 space-y-3 text-sm text-background/80">
              <li>+55 11 0000-0000</li>
              <li>contato@selectcars.com.br</li>
              <li className="text-background/50">
                Endereço enviado no agendamento
              </li>
            </ul>
            <div className="mt-5 flex flex-wrap gap-2">
              {SOCIALS.map((s) => (
                <a
                  key={s}
                  href="#"
                  className="inline-flex items-center gap-1.5 rounded-full border border-background/20 px-3 py-1.5 text-xs text-background/80 transition-colors hover:border-background/50 hover:text-background"
                >
                  {s}
                  <span aria-hidden="true">↗</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-background/15 pt-6 text-xs text-background/50 sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} SELECTCARS · Todos os direitos reservados.</p>
          <p className="order-last sm:order-none">
            Feito por{" "}
            <span className="text-background/80">Magaiver Magalhães</span>
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <a href="#" className="transition-colors hover:text-background">
              Política de Privacidade
            </a>
            <a href="#" className="transition-colors hover:text-background">
              Termos de Uso
            </a>
            <a href="#" className="transition-colors hover:text-background">
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
