import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLicenca } from "@/hooks/useLicenca";
import { useAuth } from "@/hooks/useAuth";
import { temLicencaVitalicia } from "@/lib/licenca-vitalicia";
import { PLANOS, type PlanoId } from "@/lib/planos";
import { brl } from "@/lib/format";
import { criarCobrancaLicenca } from "@/lib/licenca.functions";

function formatarValidade(valor: string | null | undefined) {
  if (!valor) return null;
  return new Date(valor).toLocaleDateString("pt-BR");
}

export function LicencaGate({ userId, children }: { userId?: string | undefined; children: ReactNode }) {
  const { licenca, carregando } = useLicenca(userId ?? null);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const criarCobranca = useServerFn(criarCobrancaLicenca);
  const [planoEscolhido, setPlanoEscolhido] = useState<PlanoId | null>(null);
  const [nome, setNome] = useState("");
  const [documento, setDocumento] = useState("");
  const [gerando, setGerando] = useState(false);
  const [cobranca, setCobranca] = useState<{
    paymentId: string;
    pixQrCode?: string | null;
    pixCopiaECola?: string | null;
  } | null>(null);
  const vitalicia = temLicencaVitalicia(user?.email);
  const sincronizado = useRef(false);

  useEffect(() => {
    if (!vitalicia || !userId || sincronizado.current) return;
    sincronizado.current = true;
    void supabase.rpc("aplicar_licenca_vitalicia").then(() => {
      void queryClient.invalidateQueries({ queryKey: ["licenca"] });
    });
  }, [vitalicia, userId, queryClient]);

  useEffect(() => {
    if (!cobranca) return;
    const id = setInterval(() => {
      void queryClient.invalidateQueries({ queryKey: ["licenca"] });
    }, 8000);
    return () => clearInterval(id);
  }, [cobranca, queryClient]);

  async function gerarCobranca(plano: PlanoId) {
    setGerando(true);
    try {
      const res = await criarCobranca({ data: { nome, cpfCnpj: documento, plano } });
      setCobranca({
        paymentId: res.paymentId,
        pixQrCode: res.pixQrCode,
        pixCopiaECola: res.pixCopiaECola,
      });
      toast.success("Pix gerado! Escaneie o QR Code ou copie o código.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível gerar a cobrança");
    } finally {
      setGerando(false);
    }
  }

  function copiarCodigoPix(codigo: string) {
    void navigator.clipboard.writeText(codigo);
    toast.success("Código Pix copiado!");
  }

  if (vitalicia) return <>{children}</>;
  if (!userId || carregando) return <>{children}</>;
  if (licenca?.ativa) return <>{children}</>;

  const statusLicenca = licenca?.status ?? "inativo";
  const validadeAnterior = formatarValidade(licenca?.validade);
  const expirada = statusLicenca === "ativo" && !!licenca?.validade;
  const pixQrCode = cobranca?.pixQrCode ?? undefined;
  const pixCopiaECola = cobranca?.pixCopiaECola ?? undefined;
  const documentoOk = documento.replace(/\D/g, "").length >= 11;
  const nomeOk = nome.trim().length >= 2;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-5 py-10">
        <div className="rounded-[24px] bg-card p-6 ring-1 ring-border">
          <span className="inline-block rounded-full bg-brand/10 px-3 py-1 text-[11px] font-semibold text-brand">
            {expirada ? "Plano expirado" : "Acesso bloqueado"}
          </span>
          <h1 className="mt-3 font-display text-2xl leading-tight font-semibold tracking-tight">
            Escolha seu plano para liberar o Robô IA
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            O AvaliaReal cobra uma anuidade para manter os servidores, a verificação antifraude e o
            acesso exclusivo às tarefas das redes parceiras. Enquanto o plano não estiver ativo, a
            área interna fica bloqueada.
          </p>
          {validadeAnterior ? (
            <p className="mt-2 text-xs text-muted-foreground">Validade anterior: {validadeAnterior}</p>
          ) : null}

          {cobranca ? (
            <div className="mt-5 flex flex-col items-center rounded-[16px] bg-background p-4 text-center ring-1 ring-border">
              <p className="text-xs font-semibold text-foreground/70">Pague com Pix</p>
              {pixQrCode ? (
                <img
                  src={pixQrCode}
                  alt="QR Code Pix do plano AvaliaReal"
                  className="mt-3 h-52 w-52 rounded-[12px] bg-card p-2 ring-1 ring-border"
                />
              ) : null}
              {pixCopiaECola ? (
                <>
                  <p className="mt-4 w-full rounded-[12px] bg-card px-3 py-2.5 font-mono text-[11px] break-all ring-1 ring-border">
                    {pixCopiaECola}
                  </p>
                  <button
                    onClick={() => copiarCodigoPix(pixCopiaECola)}
                    className="mt-3 w-full rounded-full bg-gradient-safe py-3.5 text-sm font-semibold text-primary-foreground shadow-safe transition-transform active:scale-[.98]"
                  >
                    Copiar Código Pix
                  </button>
                </>
              ) : null}
              <p className="mt-4 text-xs text-muted-foreground">
                Aguardando pagamento... Assim que concluir no app do seu banco, seu acesso será
                liberado automaticamente.
              </p>
            </div>
          ) : (
            <>
              <div className="mt-5 space-y-3">
                {PLANOS.map((p) => {
                  const ativo = planoEscolhido === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setPlanoEscolhido(p.id)}
                      className={
                        ativo
                          ? "w-full rounded-[18px] bg-gradient-brand p-4 text-left text-primary-foreground shadow-brand"
                          : "w-full rounded-[18px] bg-background p-4 text-left ring-1 ring-border"
                      }
                    >
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="font-display text-base font-semibold tracking-tight">
                          Plano {p.nome}
                        </p>
                        <p className="font-display text-lg font-semibold">
                          {brl(p.valor)}
                          <span className="text-[11px] font-medium opacity-70">/ano</span>
                        </p>
                      </div>
                      <p className={ativo ? "mt-1 text-xs opacity-90" : "mt-1 text-xs text-brand"}>
                        {p.destaque}
                      </p>
                      <ul
                        className={
                          ativo
                            ? "mt-2 space-y-0.5 text-[11px] opacity-80"
                            : "mt-2 space-y-0.5 text-[11px] text-muted-foreground"
                        }
                      >
                        {p.beneficios.map((b) => (
                          <li key={b}>• {b}</li>
                        ))}
                      </ul>
                    </button>
                  );
                })}
              </div>

              {planoEscolhido ? (
                <div className="mt-4 space-y-3 rounded-[16px] bg-background p-4 ring-1 ring-border">
                  <div>
                    <label className="text-xs font-semibold text-foreground/70">Nome completo</label>
                    <input
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      className="mt-1 w-full rounded-[12px] bg-card px-3 py-2.5 text-sm ring-1 ring-border outline-none"
                      placeholder="Seu nome"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-foreground/70">CPF ou CNPJ</label>
                    <input
                      value={documento}
                      onChange={(e) => setDocumento(e.target.value)}
                      inputMode="numeric"
                      className="mt-1 w-full rounded-[12px] bg-card px-3 py-2.5 text-sm ring-1 ring-border outline-none"
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <button
                    onClick={() => gerarCobranca(planoEscolhido)}
                    disabled={gerando || !nomeOk || !documentoOk}
                    className="w-full rounded-full bg-gradient-safe py-3.5 text-sm font-semibold text-primary-foreground shadow-safe transition-transform active:scale-[.98] disabled:opacity-60"
                  >
                    {gerando ? "Gerando cobrança…" : "Gerar Pix do plano escolhido"}
                  </button>
                </div>
              ) : null}
            </>
          )}

          <a
            href="https://wa.me/573151495373?text=Ol%C3%A1!%20Preciso%20de%20ajuda%20com%20o%20AvaliaReal."
            target="_blank"
            rel="noreferrer"
            className="mt-4 block w-full rounded-full bg-background py-3 text-center text-xs font-semibold text-brand ring-1 ring-border"
          >
            Falar com o suporte no WhatsApp
          </a>

          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.href = "/auth";
            }}
            className="mt-3 w-full text-center text-xs font-semibold text-muted-foreground"
          >
            Sair da conta
          </button>
        </div>
      </div>
    </div>
  );
}
