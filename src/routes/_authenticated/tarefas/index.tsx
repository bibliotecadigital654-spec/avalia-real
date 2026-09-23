import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useConta } from "@/hooks/useConta";
import { brl } from "@/lib/format";
import { obterMuralAdGem } from "@/lib/adgem.functions";

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

const ETAPAS_ROBO = [
  "Conectando ao servidor dos EUA…",
  "Autenticando o seu identificador…",
  "Buscando tarefas com melhor pagamento…",
  "Filtrando ofertas compatíveis com o seu perfil…",
  "Preparando o mural personalizado…",
];

function RoboIA({ userId }: { userId: string | undefined }) {
  const queryClient = useQueryClient();
  const buscarMural = useServerFn(obterMuralAdGem);
  const [rodando, setRodando] = useState(false);
  const [progresso, setProgresso] = useState(0);
  const [muralUrl, setMuralUrl] = useState<string | null>(null);
  const [restantes, setRestantes] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, []);

  async function ligar() {
    if (!userId || rodando) return;
    setRodando(true);
    setProgresso(0);
    setMuralUrl(null);

    const inicio = Date.now();
    timer.current = setInterval(() => {
      const pct = Math.min(100, ((Date.now() - inicio) / 15000) * 100);
      setProgresso(pct);
    }, 100);

    try {
      const [{ data, error }, mural] = await Promise.all([
        supabase.rpc("executar_robo_ia"),
        buscarMural().catch(() => null),
        new Promise((r) => setTimeout(r, 15000)),
      ]);
      if (error) throw error;

      const resultado = Array.isArray(data) ? data[0] : data;
      if (!resultado?.permitido) {
        const limite = resultado?.limite ?? 0;
        toast.error(
          limite === 0
            ? "Seu plano não libera o Robô IA. Escolha um plano para começar."
            : "Você já usou todas as execuções de hoje. Volte amanhã ou faça upgrade do plano.",
        );
        setRestantes(null);
        return;
      }

      const limite = resultado.limite ?? 0;
      setRestantes(
        limite < 0
          ? "Execuções ilimitadas (Plano Ouro)"
          : `${Math.max(0, limite - (resultado.usadas ?? 0))} execuções restantes hoje`,
      );

      if (mural?.configured && mural.url) {
        setMuralUrl(mural.url);
      } else {
        toast.success("Robô finalizado! Abra o mural de ofertas para ver as tarefas.");
      }
      await queryClient.invalidateQueries({ queryKey: ["conta"] });
      await queryClient.invalidateQueries({ queryKey: ["extrato"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível ligar o Robô IA");
    } finally {
      if (timer.current) clearInterval(timer.current);
      setProgresso(100);
      setRodando(false);
    }
  }

  const etapa = ETAPAS_ROBO[Math.min(ETAPAS_ROBO.length - 1, Math.floor(progresso / 20))];

  return (
    <section className="mt-5 overflow-hidden rounded-[22px] bg-card p-5 ring-1 ring-border">
      <p className="text-xs font-medium tracking-[0.18em] text-muted-foreground uppercase">
        Automação inteligente
      </p>
      <h2 className="mt-1 font-display text-lg font-semibold tracking-tight">
        Robô IA de tarefas
      </h2>
      <p className="mt-1 text-xs text-muted-foreground">
        O robô varre as redes parceiras e monta o seu mural com as melhores tarefas do dia.
      </p>

      {rodando ? (
        <div className="mt-4">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-background ring-1 ring-border">
            <div
              className="h-full rounded-full bg-gradient-brand transition-[width] duration-150"
              style={{ width: `${progresso}%` }}
            />
          </div>
          <p className="mt-2 text-[11px] font-medium text-brand">{etapa}</p>
          <p className="text-[11px] text-muted-foreground">{Math.round(progresso)}%</p>
        </div>
      ) : (
        <button
          onClick={ligar}
          className="mt-4 w-full rounded-full bg-gradient-brand py-3.5 text-sm font-semibold text-primary-foreground shadow-brand transition-transform active:scale-[.98]"
        >
          Ligar Robô IA (Servidor EUA)
        </button>
      )}

      {restantes ? <p className="mt-2 text-[11px] text-muted-foreground">{restantes}</p> : null}

      {muralUrl ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/50 p-3 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-md rounded-[22px] bg-card p-3 ring-1 ring-border">
            <div className="flex items-center justify-between px-2 pb-2">
              <p className="font-display text-sm font-semibold tracking-tight">
                Tarefas encontradas pelo Robô
              </p>
              <button
                onClick={() => setMuralUrl(null)}
                aria-label="Fechar"
                className="rounded-full px-2 py-1 text-sm text-muted-foreground"
              >
                ✕
              </button>
            </div>
            <iframe
              src={muralUrl}
              title="Mural de tarefas AdGem"
              className="block h-[70vh] w-full rounded-[16px] bg-background ring-1 ring-border"
              allow="clipboard-write"
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}

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

      <RoboIA userId={conta?.userId} />

      <section className="mt-7">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-lg font-semibold tracking-tight">Tarefas disponíveis</h1>
          <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-semibold text-brand">
            {tarefas?.length ?? 0} abertas
          </span>
        </div>

        <div className="mt-3 space-y-3">
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando tarefas…</p> : null}

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
