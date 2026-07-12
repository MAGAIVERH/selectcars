import Link from "next/link";

const NAV = [
  { label: "Início", href: "/" },
  { label: "Sobre", href: "/#sobre" },
  { label: "Coleção", href: "/colecao" },
  { label: "Destaque", href: "/#destaque" },
  { label: "Processo", href: "/#processo" },
  { label: "Perguntas", href: "/#perguntas" },
];

export function SiteHeader() {
  return (
    <header className="border-border/70 bg-background/80 sticky top-0 z-50 border-b backdrop-blur">
      <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between gap-6 px-6">
        <Link
          href="/"
          className="text-foreground font-mono text-sm font-semibold tracking-[0.22em]"
        >
          SELECTCARS
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-muted hover:text-foreground text-sm transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <button
            type="button"
            className="text-muted hover:text-foreground hidden items-center gap-2 text-sm transition-colors sm:flex"
            aria-label="Buscar"
          >
            <SearchIcon />
            Buscar
          </button>
          <button
            type="button"
            aria-label="Conta"
            className="text-muted hover:text-foreground transition-colors"
          >
            <UserIcon />
          </button>
          <Link
            href="/#agendar"
            className="bg-foreground text-background rounded-full px-4 py-2 text-sm font-medium transition-opacity hover:opacity-90"
          >
            Agendar visita
          </Link>
        </div>
      </div>
    </header>
  );
}

function SearchIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.8" />
      <path d="m20 20-3.2-3.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="3.4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}
