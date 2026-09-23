import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useConta } from "@/hooks/useConta";
import { LicencaGate } from "@/components/LicencaGate";

type NavItem = { to: string; label: string; glyph: string };

export const WHATSAPP_SUPORTE =
  "https://wa.me/573151495373?text=Ol%C3%A1!%20Preciso%20de%20ajuda%20com%20o%20AvaliaReal.";

function saudacao(): string {
  const h = new Date().getHours();
  if (h >= 5 && h < 12) return "Bom dia";
  if (h >= 12 && h < 18) return "Boa tarde";
  return "Boa noite";
}

const NAV: NavItem[] = [
  { to: "/tarefas", label: "Tarefas", glyph: "☰" },
  { to: "/ofertas", label: "Ofertas", glyph: "◆" },
  { to: "/carteira", label: "Carteira", glyph: "◍" },
];

export function AppShell({
  children,
  nome,
  isAdmin,
}: {
  children: ReactNode;
  nome?: string | undefined;
  isAdmin?: boolean | undefined;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: conta } = useConta();

  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <LicencaGate userId={conta?.userId}>
      <div className="min-h-screen bg-background pb-28 text-foreground">
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-brand-light/40 blur-3xl" />
          <div className="absolute top-32 -right-12 h-64 w-64 rounded-full bg-accent/25 blur-3xl" />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-md px-5 pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="grid size-9 place-items-center rounded-[10px] bg-gradient-brand text-primary-foreground shadow-brand">
                <span className="font-display text-sm font-semibold tracking-tight">AR</span>
              </div>
              <div className="leading-none">
                <p className="font-display text-base font-semibold tracking-tight">AvaliaReal</p>
                <p className="text-[11px] font-medium text-muted-foreground">
                  {nome ? `${saudacao()}, ${nome}!` : "microtarefas pagas"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin ? (
                <Link
                  to="/admin"
                  className="rounded-full bg-card px-3 py-1.5 text-[11px] font-semibold text-brand ring-1 ring-border"
                >
                  Admin
                </Link>
              ) : null}
              <button
                onClick={sair}
                className="rounded-full bg-card px-3 py-1.5 text-[11px] font-semibold text-muted-foreground ring-1 ring-border transition-transform active:scale-95"
              >
                Sair
              </button>
            </div>
          </div>

          {children}

          <section className="mt-8 rounded-[18px] bg-card p-4 ring-1 ring-border">
            <p className="font-display text-sm font-semibold tracking-tight">Suporte e Ajuda</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Dúvidas sobre tarefas, planos ou saques? Fale com a nossa equipe.
            </p>
            <a
              href={WHATSAPP_SUPORTE}
              target="_blank"
              rel="noreferrer"
              className="mt-3 block rounded-full bg-gradient-safe py-3 text-center text-sm font-semibold text-primary-foreground shadow-safe"
            >
              Falar no WhatsApp
            </a>
          </section>
        </div>

        <nav className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md px-5 pb-5">
          <div className="flex items-center justify-around rounded-[18px] bg-card/85 px-2 py-2 ring-1 ring-border backdrop-blur">
            {NAV.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex flex-1 flex-col items-center gap-1 rounded-[12px] py-1.5 text-muted-foreground transition-transform active:scale-95"
                activeProps={{ className: "text-brand" }}
              >
                <span className="font-display text-sm leading-none font-semibold">{item.glyph}</span>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>
      </div>
    </LicencaGate>
  );
}
