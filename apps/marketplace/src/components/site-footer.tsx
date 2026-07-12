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
            <p className="text-3xl font-semibold tracking-[0.14em]">SELECTCARS</p>
            <p className="text-background/60 mt-5 max-w-xs text-sm leading-6">
              Curadoria de automóveis premium para o colecionador exigente. Atemporal. Discreta.
              Inconfundível.
            </p>
            <p className="text-background/40 mt-6 font-mono text-[11px] tracking-[0.16em] uppercase">
              São Paulo · Brasil
            </p>
          </div>

          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-background/40 font-mono text-[11px] tracking-[0.16em] uppercase">
                {col.title}
              </p>
              <ul className="mt-5 space-y-3">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-background/80 hover:text-background text-sm transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <p className="text-background/40 font-mono text-[11px] tracking-[0.16em] uppercase">
              Contato
            </p>
            <ul className="text-background/80 mt-5 space-y-3 text-sm">
              <li>+55 11 0000-0000</li>
              <li>contato@selectcars.com.br</li>
              <li className="text-background/50">Endereço enviado no agendamento</li>
            </ul>
            <div className="mt-5 flex flex-wrap gap-2">
              {SOCIALS.map((s) => (
                <a
                  key={s}
                  href="#"
                  className="border-background/20 text-background/80 hover:border-background/50 hover:text-background inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors"
                >
                  {s}
                  <span aria-hidden="true">↗</span>
                </a>
              ))}
            </div>
          </div>
        </div>

        <div className="border-background/15 text-background/50 mt-16 flex flex-col gap-4 border-t pt-6 text-xs sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} SELECTCARS · Todos os direitos reservados.</p>
          <p className="order-last sm:order-none">
            Feito por <span className="text-background/80">Magaiver Magalhães</span>
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <a href="#" className="hover:text-background transition-colors">
              Política de Privacidade
            </a>
            <a href="#" className="hover:text-background transition-colors">
              Termos de Uso
            </a>
            <a href="#" className="hover:text-background transition-colors">
              Cookies
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
