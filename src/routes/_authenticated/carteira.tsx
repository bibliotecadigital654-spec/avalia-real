import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "@/components/AppShell";
import { CameraCapture } from "@/components/CameraCapture";
import { useConta } from "@/hooks/useConta";
import { useAuth } from "@/hooks/useAuth";
import { isAdminMaster as ehAdminMaster } from "@/lib/licenca-vitalicia";
import { brl, dataHora } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/carteira")({
  head: () => ({
    meta: [
      { title: "Minha carteira | AvaliaReal" },
      { name: "description", content: "Acompanhe seu saldo, extrato e solicitações de saque Pix." },
      { property: "og:title", content: "Minha carteira | AvaliaReal" },
      {
        property: "og:description",
        content: "Acompanhe seu saldo, extrato e solicitações de saque Pix.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
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
const DIAS_ENTRE_SAQUES = 7;

function CarteiraPage() {
  const { data: conta } = useConta();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [valor, setValor] = useState("");
  const [pixTipo, setPixTipo] = useState<string>("cpf");
  const [pixChave, setPixChave] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [modalFacial, setModalFacial] = useState(false);
  const [rostoCapturado, setRostoCapturado] = useState<string | null>(null);
  const isento = ehAdminMaster(user?.email);

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

  const diasRestantes = useMemo(() => {
    if (isento) return 0;
    const ultimo = (resgates ?? []).find((r) => r.status !== "rejeitado");
    if (!ultimo) return 0;
    const passados = (Date.now() - new Date(ultimo.created_at).getTime()) / 86_400_000;
    return Math.max(0, Math.ceil(DIAS_ENTRE_SAQUES - passados));
  }, [resgates, isento]);

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

  function validar(): number | null {
    const numero = Number(valor.replace(",", "."));
    if (!Number.isFinite(numero) || numero <= 0) {
      toast.error("Informe um valor válido para sacar");
      return null;
    }
    if ((conta?.saldo ?? 0) < SAQUE_MINIMO || numero < SAQUE_MINIMO) {
      toast.error("Saldo insuficiente. O valor mínimo para saque é de R$ 20,00.");
      return null;
    }
    if (numero > (conta?.saldo ?? 0)) {
      toast.error("Saldo insuficiente. O valor mínimo para saque é de R$ 20,00.");
      return null;
    }
    if (pixChave.trim().length < 4) {
      toast.error("Informe a sua chave Pix");
      return null;
    }
    if (diasRestantes > 0) {
      toast.error(
        `Você só pode pedir um saque a cada 7 dias. Faltam ${diasRestantes} dia(s) para liberar.`,
      );
      return null;
    }
    return numero;
  }

  function iniciarSaque() {
    const numero = validar();
    if (numero === null) return;
    if (isento) {
      void solicitar(numero);
      return;
    }
    setRostoCapturado(null);
    setModalFacial(true);
  }

  async function solicitar(numero: number) {
    setEnviando(true);
    try {
      const payload = {
        _valor: numero,
        _pix_tipo: pixTipo,
        _pix_chave: pixChave.trim(),
      };
      const { error } = await supabase.rpc("solicitar_resgate", payload);
      if (error) throw error;
      setValor("");
      setPixChave("");
      setModalFacial(false);
      setRostoCapturado(null);
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

  const bloqueado = diasRestantes > 0;

  return (
    <AppShell nome={conta?.nome}>
      <section className="mt-5 rounded-[22px] bg-gradient-safe p-5 text-foreground shadow-safe">
        <p className="text-xs font-medium tracking-[0.18em] text-foreground/60 uppercase">
          Saldo disponível
        </p>
        <p className="balance-pop mt-2 font-display text-5xl leading-none font-semibold tracking-tight">
          {brl(conta?.saldo ?? 0)}
        </p>
        <p className="mt-1 text-xs text-foreground/60">
          Valores aprovados pela equipe já entram aqui
        </p>

        <div className="mt-4 space-y-2 rounded-[16px] bg-foreground/10 p-3">
          <input
            inputMode="decimal"
            value={valor}
            onChange={(e) => setValor(e.target.value)}
            placeholder="Quanto quer sacar? (mín. R$ 20,00)"
            className="w-full rounded-full bg-foreground/10 px-4 py-3 text-sm text-foreground ring-1 ring-foreground/20 outline-none placeholder:text-foreground/50 focus:ring-2"
          />
          <select
            value={pixTipo}
            onChange={(e) => setPixTipo(e.target.value)}
            className="w-full rounded-full bg-foreground/10 px-4 py-3 text-sm text-foreground ring-1 ring-foreground/20 outline-none focus:ring-2"
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
            className="w-full rounded-full bg-foreground/10 px-4 py-3 text-sm text-foreground ring-1 ring-foreground/20 outline-none placeholder:text-foreground/50 focus:ring-2"
          />
          <button
            onClick={iniciarSaque}
            disabled={enviando || bloqueado}
            className="w-full rounded-full bg-coin px-5 py-3 text-sm font-semibold text-ink shadow-coin transition-transform active:scale-[.98] disabled:opacity-60"
          >
            {bloqueado
              ? `Liberado em ${diasRestantes} dia(s)`
              : enviando
                ? "Enviando…"
                : "Solicitar Saque via Pix"}
          </button>
          <p className="text-[11px] text-foreground/60">
            Valor mínimo de saque: {brl(SAQUE_MINIMO)} · 1 solicitação a cada 7 dias
            {isento ? " (livre para o administrador)" : ""}
          </p>
        </div>
      </section>

      {modalFacial ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/50 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-md rounded-[24px] bg-card p-5 ring-1 ring-border">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-semibold tracking-tight">
                  Verificação facial obrigatória
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  Para a sua segurança contra fraudes, confirme o seu rosto antes de liberar a
                  transferência Pix.
                </p>
              </div>
              <button
                onClick={() => setModalFacial(false)}
                aria-label="Fechar"
                className="rounded-full px-2 py-1 text-sm text-muted-foreground"
              >
                ✕
              </button>
            </div>

            <div className="mt-4">
              <CameraCapture
                rotulo="Olhe para a câmera"
                ajuda="Mantenha o rosto centralizado e bem iluminado."
                textoBotao="Confirmar meu rosto"
                onCapturar={(foto) => setRostoCapturado(foto)}
              />
            </div>

            <button
              onClick={() => {
                const numero = validar();
                if (numero !== null) void solicitar(numero);
              }}
              disabled={!rostoCapturado || enviando}
              className="mt-4 w-full rounded-full bg-gradient-safe py-3.5 text-sm font-semibold text-foreground shadow-safe disabled:opacity-60"
            >
              {enviando ? "Processando…" : "Liberar saque verificado"}
            </button>
          </div>
        </div>
      ) : null}

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
