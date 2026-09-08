import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { useConta } from "@/hooks/useConta";
import { brl, dataHora } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/carteira")({
  component: CarteiraPage,
});

function CarteiraPage() {
  const { data: conta } = useConta();
  const queryClient = useQueryClient();
  const [valor, setValor] = useState("");
  const [enviando, setEnviando] = useState(false);

  const { data: extrato } = useQuery({
    queryKey: ["extrato"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("transactions")
        .select("id, descricao, valor, tipo, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
  });

  const { data: resgates } = useQuery({
    queryKey: ["resgates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payouts")
        .select("id, valor, status, created_at")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  async function solicitar() {
    const numero = Number(valor.replace(",", "."));
    if (!Number.isFinite(numero) || numero <= 0) {
      toast.error("Informe um valor válido para resgatar");
      return;
    }
    if (numero > (conta?.saldo ?? 0)) {
      toast.error("Você não tem saldo suficiente para esse valor");
      return;
    }
    setEnviando(true);
    try {
      const { error } = await supabase.rpc("solicitar_resgate", { _valor: numero });
      if (error) throw error;
      setValor("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["conta"] }),
        queryClient.invalidateQueries({ queryKey: ["resgates"] }),
        queryClient.invalidateQueries({ queryKey: ["extrato"] }),
      ]);
      toast.success("Resgate solicitado! O pagamento cai em até 2 dias úteis.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível solicitar o resgate");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <AppShell nome={conta?.nome} isAdmin={conta?.isAdmin}>
      <section className="mt-5 rounded-[22px] bg-gradient-safe p-5 text-primary-foreground shadow-safe">
        <p className="text-xs font-medium tracking-[0.18em] text-primary-foreground/60 uppercase">
          Saldo disponível
        </p>
        <p className="balance-pop mt-2 font-display text-5xl leading-none font-semibold tracking-tight">
          {brl(conta?.saldo ?? 0)}
        </p>
        <p className="mt-1 text-xs text-primary-foreground/60">
          Valores aprovados pela equipe já entram aqui
        </p>

        <div className="mt-4 flex gap-2">
          <input
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="Quanto quer resgatar?"
            className="min-w-0 flex-1 rounded-full bg-primary-foreground/10 px-4 py-3 text-sm text-primary-foreground placeholder:text-primary-foreground/50 outline-none ring-1 ring-primary-foreground/20 focus:ring-2"
          />
          <button
            onClick={solicitar}
            disabled={enviando}
            className="shrink-0 rounded-full bg-coin px-5 py-3 text-sm font-semibold text-ink shadow-coin transition-transform active:scale-[.98] disabled:opacity-60"
          >
            {enviando ? "…" : "Resgatar"}
          </button>
        </div>
      </section>

      <section className="mt-7">
        <h1 className="font-display text-lg font-semibold tracking-tight">Meus resgates</h1>
        <div className="mt-3 space-y-2">
          {(resgates ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Você ainda não pediu nenhum resgate.</p>
          ) : null}
          {(resgates ?? []).map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-[14px] bg-card px-4 py-3 ring-1 ring-border"
            >
              <div>
                <p className="text-sm font-medium">{brl(Number(r.valor))}</p>
                <p className="text-[11px] text-muted-foreground">{dataHora(r.created_at)}</p>
              </div>
              <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-semibold text-brand">
                {r.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-7">
        <h2 className="font-display text-lg font-semibold tracking-tight">Extrato</h2>
        <div className="mt-3 space-y-2">
          {(extrato ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Assim que uma tarefa for aprovada, o valor aparece aqui.
            </p>
          ) : null}
          {(extrato ?? []).map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-[14px] bg-card px-4 py-3 ring-1 ring-border"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{t.descricao}</p>
                <p className="text-[11px] text-muted-foreground">{dataHora(t.created_at)}</p>
              </div>
              <p
                className={
                  Number(t.valor) < 0
                    ? "shrink-0 font-display text-sm font-semibold text-muted-foreground"
                    : "shrink-0 font-display text-sm font-semibold text-safe"
                }
              >
                {Number(t.valor) < 0 ? "" : "+"}
                {brl(Number(t.valor))}
              </p>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
