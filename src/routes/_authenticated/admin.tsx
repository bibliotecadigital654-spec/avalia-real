import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useConta } from "@/hooks/useConta";
import { brl, dataHora } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

type Envio = {
  id: string;
  experiencia: string;
  comentario: string;
  foto_url: string | null;
  valor: number;
  status: string;
  created_at: string;
  user_id: string;
  tasks: { titulo: string; empresa: string } | null;
  profiles?: { nome: string | null } | null;
};

function AdminPage() {
  const { data: conta, isLoading: carregandoConta } = useConta();
  const queryClient = useQueryClient();
  const [processando, setProcessando] = useState<string | null>(null);
  const [fotos, setFotos] = useState<Record<string, string>>({});

  const {
    data: envios,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["admin-envios"],
    enabled: !!conta?.isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("submissions")
        .select(
          "id, user_id, experiencia, comentario, foto_url, valor, status, created_at, tasks(titulo, empresa)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;

      const lista = (data ?? []) as unknown as Envio[];
      const ids = [...new Set(lista.map((e) => e.user_id))];
      if (ids.length === 0) return lista;

      const { data: perfis } = await supabase
        .from("profiles")
        .select("id, nome")
        .in("id", ids);
      const mapa = new Map((perfis ?? []).map((p) => [p.id, p.nome] as const));
      return lista.map((e) => ({ ...e, profiles: { nome: mapa.get(e.user_id) ?? null } }));
    },
  });

  useEffect(() => {
    const pendentes = (envios ?? []).filter((e) => e.foto_url && !fotos[e.id]);
    if (pendentes.length === 0) return;
    let ativo = true;
    (async () => {
      const entradas = await Promise.all(
        pendentes.map(async (e) => {
          const { data } = await supabase.storage
            .from("envios")
            .createSignedUrl(e.foto_url as string, 3600);
          return [e.id, data?.signedUrl ?? ""] as const;
        }),
      );
      if (!ativo) return;
      setFotos((atual) => {
        const novo = { ...atual };
        for (const [id, url] of entradas) if (url) novo[id] = url;
        return novo;
      });
    })();
    return () => {
      ativo = false;
    };
  }, [envios, fotos]);

  async function revisar(id: string, aprovar: boolean) {
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

  if (!carregandoConta && !conta?.isAdmin) {
    return (
      <AppShell nome={conta?.nome}>
        <section className="mt-8 rounded-[18px] bg-card p-5 ring-1 ring-border">
          <h1 className="font-display text-lg font-semibold tracking-tight">Área restrita</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Esta tela é só para a equipe de revisão do AvaliaReal.
          </p>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell nome={conta?.nome} isAdmin={conta?.isAdmin}>
      <section className="mt-5">
        <h1 className="font-display text-lg font-semibold tracking-tight">Revisão de envios</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Aprove para creditar o valor na carteira da pessoa ou rejeite o envio.
        </p>

        <div className="mt-4 space-y-3">
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando envios…</p> : null}
          {error ? (
            <p className="text-sm text-muted-foreground">Não foi possível carregar os envios.</p>
          ) : null}
          {!isLoading && (envios ?? []).length === 0 ? (
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

              {e.foto_url ? (
                fotos[e.id] ? (
                  <img
                    src={fotos[e.id]}
                    alt={`Foto enviada em ${e.tasks?.titulo ?? "tarefa"}`}
                    loading="lazy"
                    className="mt-3 aspect-[16/10] w-full rounded-[12px] object-cover ring-1 ring-border"
                  />
                ) : (
                  <div className="mt-3 grid aspect-[16/10] w-full place-items-center rounded-[12px] bg-background text-[11px] text-muted-foreground ring-1 ring-border">
                    carregando foto…
                  </div>
                )
              ) : null}

              <p className="mt-3 text-xs text-muted-foreground">
                Valor da tarefa:{" "}
                <span className="font-display font-semibold text-foreground">
                  {brl(Number(e.valor))}
                </span>
              </p>

              {e.status === "pendente" ? (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => revisar(e.id, true)}
                    disabled={processando === e.id}
                    className="flex-1 rounded-full bg-gradient-safe py-2.5 text-sm font-semibold text-primary-foreground shadow-safe transition-transform active:scale-[.98] disabled:opacity-60"
                  >
                    Aprovar tarefa
                  </button>
                  <button
                    onClick={() => revisar(e.id, false)}
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
    </AppShell>
  );
}
