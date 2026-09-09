import { useEffect, useState } from "react";
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

const TIPOS_PIX = [
  { valor: "cpf", label: "CPF" },
  { valor: "cnpj", label: "CNPJ" },
  { valor: "email", label: "E-mail" },
  { valor: "celular", label: "Celular" },
  { valor: "chave_aleatoria", label: "Chave aleatória" },
] as const;

const SAQUE_MINIMO = 20;

function CarteiraPage() {
  const { data: conta } = useConta();
  const queryClient = useQueryClient();
  const [valor, setValor] = useState("");
  const [pixTipo, setPixTipo] = useState<string>("cpf");
  const [pixChave, setPixChave] = useState("");
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
        .select("id, valor, status, created_at, pix_tipo, pix_chave")
        .order("created_at", { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const canal = supabase
      .channel("carteira-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "payouts" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["resgates"] });
        void queryClient.invalidateQueries({ queryKey: ["conta"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["extrato"] });
        void queryClient.invalidateQueries({ queryKey: ["conta"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["conta"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [queryClient]);

  async function solicitar() {
    const numero = Number(valor.replace(",", "."));
    if (!Number.isFinite(numero) || numero <= 0) {
      toast.error("Informe um valor válido para sacar");
      return;
    }
    if ((conta?.saldo ?? 0) < SAQUE_MINIMO || numero < SAQUE_MINIMO) {
      toast.error("Saldo insuficiente. O valor mínimo para saque é de R$ 20,00.");
      return;
    }
    if (numero > (conta?.saldo ?? 0)) {
      toast.error("Saldo insuficiente. O valor mínimo para saque é de R$ 20,00.");
      return;
    }
    if (pixChave.trim().length < 4) {
      toast.error("Informe a sua chave Pix");
      return;
    }
    setEnviando(true);
    try {
      const { error } = await supabase.rpc("solicitar_resgate", {
        _valor: numero,
        _pix_tipo: pixTipo,
        _pix_chave: pixChave.trim(),
      });
      if (error) throw error;
      setValor("");
      setPixChave("");
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

        <div className="mt-4 space-y-2 rounded-[16px] bg-primary-foreground/10 p-3">
          <input
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="Quanto quer sacar? (mín. R$ 20,00)"
            className="w-full rounded-full bg-primary-foreground/10 px-4 py-3 text-sm text-primary-foreground placeholder:text-primary-foreground/50 outline-none ring-1 ring-primary-foreground/20 focus:ring-2"
          />
          <select
            value={pixTipo}
            onChange={(e) => setPixTipo(e.target.value)}
            className="w-full rounded-full bg-primary-foreground/10 px-4 py-3 text-sm text-primary-foreground outline-none ring-1 ring-primary-foreground/20 focus:ring-2"
          >
            {TIPOS_PIX.map((t) => (
              <option key={t.valor} value={t.valor} className="text-ink">
                {t.label}
              </option>
            ))}
          </select>
          <input
            value={pixChave}
            onChange={(e) => setPixChave(e.target.value)}
            placeholder="Sua chave Pix"
            className="w-full rounded-full bg-primary-foreground/10 px-4 py-3 text-sm text-primary-foreground placeholder:text-primary-foreground/50 outline-none ring-1 ring-primary-foreground/20 focus:ring-2"
          />
          <button
            onClick={solicitar}
            disabled={enviando}
            className="w-full rounded-full bg-coin px-5 py-3 text-sm font-semibold text-ink shadow-coin transition-transform active:scale-[.98] disabled:opacity-60"
          >
            {enviando ? "Enviando…" : "Solicitar Saque via Pix"}
          </button>
          <p className="text-[11px] text-primary-foreground/60">
            Valor mínimo de saque: {brl(SAQUE_MINIMO)}
          </p>
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
