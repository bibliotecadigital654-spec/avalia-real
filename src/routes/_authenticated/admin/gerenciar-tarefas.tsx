import { useEffect } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { GerenciarTarefas } from "@/components/GerenciarTarefas";
import { useAuth } from "@/hooks/useAuth";
import { useConta } from "@/hooks/useConta";
import { isAdminMaster } from "@/lib/licenca-vitalicia";

export const Route = createFileRoute("/_authenticated/admin/gerenciar-tarefas")({
  head: () => ({
    meta: [
      { title: "Gerenciar Tarefas | AvaliaReal" },
      { name: "description", content: "Cadastro e remoção das missões do AvaliaReal." },
      { property: "og:title", content: "Gerenciar Tarefas | AvaliaReal" },
      { property: "og:description", content: "Cadastro e remoção das missões do AvaliaReal." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: GerenciarTarefasPage,
});

function GerenciarTarefasPage() {
  const { user, carregando } = useAuth();
  const { data: conta } = useConta();
  const navigate = useNavigate();
  const autorizado = isAdminMaster(user?.email);

  useEffect(() => {
    if (!carregando && user && !autorizado) navigate({ to: "/tarefas", replace: true });
  }, [carregando, user, autorizado, navigate]);

  if (!autorizado) return null;

  return (
    <AppShell nome={conta?.nome}>
      <div className="mt-6 flex items-center justify-between">
        <h1 className="font-display text-xl font-semibold tracking-tight">Gerenciar Tarefas</h1>
        <Link to="/admin" className="text-xs font-semibold text-brand">Painel completo →</Link>
      </div>
      <GerenciarTarefas />
    </AppShell>
  );
}
