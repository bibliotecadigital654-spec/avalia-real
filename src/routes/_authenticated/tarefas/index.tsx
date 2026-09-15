import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useConta } from "@/hooks/useConta";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/tarefas/")({
  head: () => ({
    meta: [
      { title: "Tarefas disponíveis | AvaliaReal" },
      { name: "description", content: "Escolha tarefas digitais e acompanhe seus ganhos." },
      { property: "og:title", content: "Tarefas disponíveis | AvaliaReal" },
      {
        property: "og:description",
        content: "Escolha tarefas digitais e acompanhe seus ganhos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: TarefasPage,
});

function TarefasPage() {
  const { data: conta } = useConta();

  const { data: tarefas, isLoading } = useQuery({
    queryKey: ["tarefas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, titulo, empresa, local, valor, tempo_estimado, prazo")
        .eq("ativa", true)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const { data: meus } = useQuery({
    queryKey: ["meus-envios"],
    queryFn: async () => {
      const { data, error } = await supabase.from("submissions").select("task_id, status");
      if (error) throw error;
      return data;
    },
  });

  const enviadas = new Set((meus ?? []).map((s) => s.task_id));

  return (
    <AppShell nome={conta?.nome} isAdmin={conta?.isAdmin}>
      <section className="mt-5">
        <div className="rounded-[22px] bg-gradient-safe p-5 text-primary-foreground shadow-safe">
          <p className="text-xs font-medium tracking-[0.18em] text-primary-foreground/60 uppercase">
            Saldo acumulado
          </p>
          <p className="balance-pop mt-2 font-display text-4xl leading-none font-semibold tracking-tight">
            {brl(conta?.saldo ?? 0)}
          </p>
          <Link
            to="/carteira"
            className="mt-4 block rounded-full bg-coin py-3 text-center text-sm font-semibold text-ink shadow-coin transition-transform active:scale-[.98]"
          >
            Ir para a carteira
          </Link>
        </div>
      </section>

      <section className="mt-7">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-lg font-semibold tracking-tight">Tarefas disponíveis</h1>
          <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-semibold text-brand">
            {tarefas?.length ?? 0} abertas
          </span>
        </div>

        <div className="mt-3 space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando tarefas…</p>
          ) : null}

          {(tarefas ?? []).map((t) => (
            <Link
              key={t.id}
              to="/tarefas/$id"
              params={{ id: t.id }}
              className="block rounded-[16px] bg-card p-4 ring-1 ring-border transition-transform active:scale-[.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-pretty">{t.titulo}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {t.empresa} · {t.local}
                  </p>
                </div>
                <div className="shrink-0 rounded-[10px] bg-coin/20 px-2.5 py-1.5 text-right ring-1 ring-coin/40">
                  <p className="font-display text-base leading-none font-semibold">
                    {brl(Number(t.valor))}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3 text-[11px] font-medium text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-brand/40" />
                  {t.tempo_estimado}
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="size-1.5 rounded-full bg-brand/40" />
                  Prazo: {t.prazo}
                </span>
                <span className="ml-auto text-brand">
                  {enviadas.has(t.id) ? "Enviada ✓" : "Abrir →"}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
