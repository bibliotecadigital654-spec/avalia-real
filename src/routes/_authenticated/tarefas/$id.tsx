import { useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useConta } from "@/hooks/useConta";
import { brl } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/tarefas/$id")({
  component: TarefaDetalhe,
});

const OPCOES = ["Ruim", "Regular", "Ótimo"] as const;

const schema = z.object({
  experiencia: z.enum(OPCOES),
  comentario: z
    .string()
    .trim()
    .min(10, { message: "Escreva pelo menos 10 caracteres" })
    .max(1000, { message: "Máximo de 1000 caracteres" }),
});

function TarefaDetalhe() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: conta } = useConta();

  const [experiencia, setExperiencia] = useState<(typeof OPCOES)[number]>("Ótimo");
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);

  const { data: tarefa, isLoading } = useQuery({
    queryKey: ["tarefa", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  async function enviar() {
    if (!tarefa || !conta) return;
    const parsed = schema.safeParse({ experiencia, comentario });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Confira as respostas");
      return;
    }

    setEnviando(true);
    try {
      const { error } = await supabase.from("submissions").insert({
        task_id: tarefa.id,
        user_id: conta.userId,
        experiencia: parsed.data.experiencia,
        comentario: parsed.data.comentario,
        
        valor: tarefa.valor,
      });
      if (error) throw error;

      await queryClient.invalidateQueries({ queryKey: ["meus-envios"] });
      toast.success("Tarefa enviada! Assim que for aprovada o valor entra no seu saldo.");
      navigate({ to: "/tarefas" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível enviar");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AppShell nome={conta?.nome} isAdmin={conta?.isAdmin}>
      <section className="mt-5">
        <div className="overflow-hidden rounded-[20px] bg-card ring-1 ring-border">
          {isLoading || !tarefa ? (
            <p className="p-4 text-sm text-muted-foreground">Carregando tarefa…</p>
          ) : (
            <>
              <div className="border-b border-border px-4 py-3">
                <div className="flex items-center justify-between">
                  <Link to="/tarefas" className="text-xs font-semibold text-muted-foreground">
                    ← Voltar
                  </Link>
                  <span className="rounded-full bg-coin/20 px-2.5 py-1 text-[11px] font-semibold ring-1 ring-coin/40">
                    {brl(Number(tarefa.valor))}
                  </span>
                </div>
                <h1 className="mt-2 font-display text-lg leading-tight font-semibold tracking-tight text-pretty">
                  {tarefa.titulo}
                </h1>
                <p className="mt-1 text-xs text-muted-foreground">
                  {tarefa.empresa} · {tarefa.tempo_estimado} · prazo {tarefa.prazo}
                </p>
                {tarefa.descricao ? (
                  <p className="mt-2 text-xs text-muted-foreground">{tarefa.descricao}</p>
                ) : null}
              </div>

              <div className="space-y-4 px-4 py-4">
                <div>
                  <label className="text-xs font-semibold text-foreground/70">
                    Como foi sua experiência?
                  </label>
                  <div className="mt-1.5 grid grid-cols-3 gap-2 text-center text-xs font-semibold">
                    {OPCOES.map((op) => (
                      <button
                        key={op}
                        type="button"
                        onClick={() => setExperiencia(op)}
                        className={
                          op === experiencia
                            ? "rounded-[10px] bg-gradient-brand py-2 text-primary-foreground ring-1 ring-brand/40"
                            : "rounded-[10px] py-2 text-muted-foreground ring-1 ring-border"
                        }
                      >
                        {op}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground/70">
                    O que mais chamou sua atenção?
                  </label>
                  <textarea
                    value={comentario}
                    onChange={(e) => setComentario(e.target.value)}
                    maxLength={1000}
                    placeholder="Conte em poucas palavras…"
                    className="mt-1.5 h-24 w-full resize-none rounded-[12px] bg-background p-3 text-sm ring-1 ring-border outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>

                <button
                  onClick={enviar}
                  disabled={enviando}
                  className="w-full rounded-full bg-gradient-brand py-3.5 text-sm font-semibold text-primary-foreground shadow-brand transition-transform active:scale-[.98] disabled:opacity-60"
                >
                  {enviando
                    ? "Enviando…"
                    : `Enviar tarefa e receber ${brl(Number(tarefa.valor))}`}
                </button>
              </div>
            </>
          )}
        </div>
      </section>
    </AppShell>
  );
}
