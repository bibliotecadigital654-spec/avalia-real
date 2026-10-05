import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useConta } from "@/hooks/useConta";
import { useAuth } from "@/hooks/useAuth";
import { temLicencaVitalicia } from "@/lib/licenca-vitalicia";
import { brl, dataHora } from "@/lib/format";
import { GerenciarTarefas } from "@/components/GerenciarTarefas";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Painel Master | AvaliaReal" },
      { name: "description", content: "Gestão restrita de usuários, tarefas e saques do AvaliaReal." },
      { property: "og:title", content: "Painel Master | AvaliaReal" },
      {
        property: "og:description",
        content: "Gestão restrita de usuários, tarefas e saques do AvaliaReal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminPage,
});

type Envio = {
  id: string;
  experiencia: string;
  comentario: string;
  valor: number;
  status: string;
  created_at: string;
  user_id: string;
  tasks: { titulo: string; empresa: string } | null;
  profiles?: { nome: string | null } | null;
};

function AdminPage() {
  const { data: conta } = useConta();
  const { user, carregando: carregandoAuth } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [processando, setProcessando] = useState<string | null>(null);

  const autorizado = temLicencaVitalicia(user?.email);

  useEffect(() => {
    if (!carregandoAuth && user && !autorizado) {
      navigate({ to: "/", replace: true });
    }
  }, [carregandoAuth, user, autorizado, navigate]);

  const { data: visao } = useQuery({
    queryKey: ["admin-visao"],
    enabled: autorizado,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_visao_geral");
      if (error) throw error;
      return data?.[0] ?? null;
    },
  });

  const { data: usuarios } = useQuery({
    queryKey: ["admin-usuarios"],
    enabled: autorizado,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_usuarios");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: saques } = useQuery({
    queryKey: ["admin-saques"],
    enabled: autorizado,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_resgates");
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: envios } = useQuery({
    queryKey: ["admin-envios"],
    enabled: autorizado,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submissions")
        .select(
          "id, user_id, experiencia, comentario, valor, status, created_at, tasks(titulo, empresa)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;

      const lista = (data ?? []) as unknown as Envio[];
      const ids = [...new Set(lista.map((e) => e.user_id))];
      if (ids.length === 0) return lista;

      const { data: perfis } = await supabase.from("profiles").select("id, nome").in("id", ids);
      const mapa = new Map((perfis ?? []).map((p) => [p.id, p.nome] as const));
      return lista.map((e) => ({ ...e, profiles: { nome: mapa.get(e.user_id) ?? null } }));
    },
  });

  useEffect(() => {
    if (!autorizado) return;
    const canal = supabase
      .channel("admin-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "payouts" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["admin-saques"] });
        void queryClient.invalidateQueries({ queryKey: ["admin-visao"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] });
        void queryClient.invalidateQueries({ queryKey: ["admin-visao"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "submissions" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["admin-envios"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [autorizado, queryClient]);

  async function revisarSaque(id: string, aprovar: boolean) {
    setProcessando(id);
    try {
      const { error } = await supabase.rpc("revisar_resgate", {
        _payout_id: id,
        _aprovar: aprovar,
      });
      if (error) throw error;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["admin-saques"] }),
        queryClient.invalidateQueries({ queryKey: ["admin-usuarios"] }),
      ]);
      toast.success(aprovar ? "Saque aprovado." : "Saque rejeitado e saldo devolvido.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível concluir a revisão");
    } finally {
      setProcessando(null);
    }
  }

  async function revisarEnvio(id: string, aprovar: boolean) {
    setProcessando(id);
    try {
      const { error } = await supabase.rpc("revisar_envio", {
        _submission_id: id,
        _aprovar: aprovar,
      });
      if (error) throw error;
      await queryClient.invalidateQueries({ queryKey: ["admin-envios"] });
      toast.success(aprovar ? "Tarefa aprovada e valor creditado." : "Tarefa rejeitada.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível concluir a revisão");
    } finally {
      setProcessando(null);
    }
  }

  if (!autorizado) {
    return (
      <AppShell nome={conta?.nome}>
        <section className="mt-8 rounded-[18px] bg-card p-5 ring-1 ring-border">
          <h1 className="font-display text-lg font-semibold tracking-tight">Área restrita</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Redirecionando para a página inicial…
          </p>
        </section>
      </AppShell>
    );
  }

  const pendentes = (saques ?? []).filter(
    (s) => s.status === "pendente" || s.status === "solicitado",
  );

  return (
    <AppShell nome={conta?.nome}>
      <section className="mt-5">
        <h1 className="font-display text-lg font-semibold tracking-tight">Painel Master</h1>
        <p className="mt-1 text-sm text-muted-foreground">Controle geral do AvaliaReal.</p>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <div className="rounded-[16px] bg-card p-4 ring-1 ring-border">
            <p className="text-[11px] text-muted-foreground">Usuários cadastrados</p>
            <p className="mt-1 font-display text-2xl font-semibold">
              {Number(visao?.total_usuarios ?? 0)}
            </p>
          </div>
          <div className="rounded-[16px] bg-card p-4 ring-1 ring-border">
            <p className="text-[11px] text-muted-foreground">Licenças ativas</p>
            <p className="mt-1 font-display text-2xl font-semibold">
              {Number(visao?.licencas_ativas ?? 0)}
            </p>
          </div>
          <div className="rounded-[16px] bg-card p-4 ring-1 ring-border">
            <p className="text-[11px] text-muted-foreground">Lucro estimado</p>
            <p className="mt-1 font-display text-xl font-semibold text-safe">
              {brl(Number(visao?.lucro_estimado ?? 0))}
            </p>
          </div>
          <div className="rounded-[16px] bg-card p-4 ring-1 ring-border">
            <p className="text-[11px] text-muted-foreground">Saques pendentes</p>
            <p className="mt-1 font-display text-2xl font-semibold text-brand">
              {Number(visao?.saques_pendentes ?? 0)}
            </p>
          </div>
        </div>
      </section>

      <section className="mt-7">
        <h2 className="font-display text-lg font-semibold tracking-tight">
          Solicitações de Saque Pix
        </h2>
        <div className="mt-3 space-y-3">
          {pendentes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum saque pendente agora.</p>
          ) : null}
          {pendentes.map((s) => (
            <article key={s.id} className="rounded-[16px] bg-card p-4 ring-1 ring-border">
              <p className="text-sm font-medium">{s.email}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">{dataHora(s.created_at)}</p>
              <dl className="mt-3 space-y-1 rounded-[12px] bg-background p-3 text-xs">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Tipo da chave</dt>
                  <dd className="font-medium">{s.pix_tipo}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Chave Pix</dt>
                  <dd className="font-mono break-all">{s.pix_chave}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">Valor</dt>
                  <dd className="font-display font-semibold">{brl(Number(s.valor))}</dd>
                </div>
              </dl>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => revisarSaque(s.id, true)}
                  disabled={processando === s.id}
                  className="flex-1 rounded-full bg-gradient-safe py-2.5 text-sm font-semibold text-foreground shadow-safe transition-transform active:scale-[.98] disabled:opacity-60"
                >
                  Aprovar Saque
                </button>
                <button
                  onClick={() => revisarSaque(s.id, false)}
                  disabled={processando === s.id}
                  className="flex-1 rounded-full bg-card py-2.5 text-sm font-semibold text-destructive ring-1 ring-destructive/30 transition-transform active:scale-[.98] disabled:opacity-60"
                >
                  Rejeitar Saque
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-7">
        <h2 className="font-display text-lg font-semibold tracking-tight">Usuários cadastrados</h2>
        <div className="mt-3 space-y-2">
          {(usuarios ?? []).map((u) => (
            <div key={u.user_id} className="rounded-[14px] bg-card px-4 py-3 ring-1 ring-border">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{u.nome || "Sem nome"}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{u.email}</p>
                </div>
                <span
                  className={
                    u.status_licenca === "ativo"
                      ? "shrink-0 rounded-full bg-safe/15 px-2.5 py-1 text-[11px] font-semibold text-safe"
                      : "shrink-0 rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-semibold text-destructive"
                  }
                >
                  {u.status_licenca === "ativo" ? "ativa" : "inativa"}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Saldo:{" "}
                <span className="font-display font-semibold text-foreground">
                  {brl(Number(u.saldo))}
                </span>
              </p>
            </div>
          ))}
          {(usuarios ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum usuário cadastrado ainda.</p>
          ) : null}
        </div>
      </section>

      <section className="mt-7">
        <h2 className="font-display text-lg font-semibold tracking-tight">Revisão de envios</h2>
        <div className="mt-3 space-y-3">
          {(envios ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum envio por enquanto.</p>
          ) : null}
          {(envios ?? []).map((e) => (
            <article key={e.id} className="rounded-[16px] bg-card p-4 ring-1 ring-border">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-pretty">
                    {e.tasks?.titulo ?? "Tarefa removida"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {e.profiles?.nome ?? "Usuário"} · {dataHora(e.created_at)}
                  </p>
                </div>
                <span
                  className={
                    e.status === "aprovada"
                      ? "shrink-0 rounded-full bg-safe/15 px-2.5 py-1 text-[11px] font-semibold text-safe"
                      : e.status === "rejeitada"
                        ? "shrink-0 rounded-full bg-destructive/10 px-2.5 py-1 text-[11px] font-semibold text-destructive"
                        : "shrink-0 rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-semibold text-brand"
                  }
                >
                  {e.status}
                </span>
              </div>

              <dl className="mt-3 space-y-1.5 rounded-[12px] bg-background p-3 text-xs">
                <div className="flex gap-2">
                  <dt className="font-semibold text-foreground/70">Experiência:</dt>
                  <dd className="text-muted-foreground">{e.experiencia}</dd>
                </div>
                <div>
                  <dt className="font-semibold text-foreground/70">Comentário:</dt>
                  <dd className="mt-0.5 text-muted-foreground">{e.comentario}</dd>
                </div>
              </dl>

              <p className="mt-3 text-xs text-muted-foreground">
                Valor da tarefa:{" "}
                <span className="font-display font-semibold text-foreground">
                  {brl(Number(e.valor))}
                </span>
              </p>

              {e.status === "pendente" ? (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => revisarEnvio(e.id, true)}
                    disabled={processando === e.id}
                    className="flex-1 rounded-full bg-gradient-safe py-2.5 text-sm font-semibold text-foreground shadow-safe transition-transform active:scale-[.98] disabled:opacity-60"
                  >
                    Aprovar tarefa
                  </button>
                  <button
                    onClick={() => revisarEnvio(e.id, false)}
                    disabled={processando === e.id}
                    className="flex-1 rounded-full bg-card py-2.5 text-sm font-semibold text-destructive ring-1 ring-destructive/30 transition-transform active:scale-[.98] disabled:opacity-60"
                  >
                    Rejeitar tarefa
                  </button>
                </div>
              ) : null}
            </article>
          ))}
        </div>
      </section>
      <GerenciarTarefas />
    </AppShell>
  );
}
