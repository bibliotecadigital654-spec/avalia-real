import { useEffect, useRef, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useLicenca } from "@/hooks/useLicenca";
import { useAuth } from "@/hooks/useAuth";
import { temLicencaVitalicia } from "@/lib/licenca-vitalicia";
import { criarCobrancaLicenca } from "@/lib/licenca.functions";


export function LicencaGate({ userId, children }: { userId?: string | undefined; children: ReactNode }) {
  const { licenca, carregando } = useLicenca(userId ?? null);
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const criarCobranca = useServerFn(criarCobrancaLicenca);
  const [abrirForm, setAbrirForm] = useState(false);
  const [nome, setNome] = useState("");
  const [documento, setDocumento] = useState("");
  const [gerando, setGerando] = useState(false);
  const [cobranca, setCobranca] = useState<{
    paymentId: string;
    url: string | null;
    pixQrCode?: string | null;
    pixCopiaECola?: string | null;
  } | null>(null);
  const vitalicia = temLicencaVitalicia(user?.email);
  const sincronizado = useRef(false);

  useEffect(() => {
    if (!vitalicia || !userId || sincronizado.current) return;
    sincronizado.current = true;
    void supabase.rpc("aplicar_licenca_vitalicia");
  }, [vitalicia, userId]);

  if (vitalicia) return <>{children}</>;
  if (!userId || carregando || !licenca) return <>{children}</>;
  if (licenca.ativa) return <>{children}</>;

  async function gerarCobranca() {
    setGerando(true);
    try {
      const res = await criarCobranca({ data: { nome, cpfCnpj: documento } });
      setCobranca({
        paymentId: res.paymentId,
        url: res.url,
        pixQrCode: res.pixQrCode,
        pixCopiaECola: res.pixCopiaECola,
      });
      await queryClient.invalidateQueries();
      toast.success("Pix gerado! Escaneie o QR Code ou copie o código.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível gerar a cobrança");
    } finally {
      setGerando(false);
    }
  }

  const expirada = licenca.status === "ativo" && !!licenca.validade;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background/95 backdrop-blur-sm">
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col justify-center px-5 py-10">
        <div className="rounded-[24px] bg-card p-6 ring-1 ring-border">
          <span className="inline-block rounded-full bg-brand/10 px-3 py-1 text-[11px] font-semibold text-brand">
            {expirada ? "Licença expirada" : "Licença inativa"}
          </span>
          <h1 className="mt-3 font-display text-2xl leading-tight font-semibold tracking-tight">
            Licença Inativa ou Expirada
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            O AvaliaReal cobra uma taxa mínima anual para manutenção dos servidores, verificação
            antifraude dos envios e acesso exclusivo às tarefas das marcas parceiras. Enquanto a
            licença não estiver ativa, o mural de tarefas fica bloqueado.
          </p>
          {licenca.validade ? (
            <p className="mt-2 text-xs text-muted-foreground">
              Validade anterior: {new Date(licenca.validade).toLocaleDateString("pt-BR")}
            </p>
          ) : null}

          {cobranca ? (
            <div className="mt-5 flex flex-col items-center rounded-[16px] bg-background p-4 text-center ring-1 ring-border">
              <p className="text-xs font-semibold text-foreground/70">Pague com Pix</p>
              {cobranca.pixQrCode ? (
                <img
                  src={cobranca.pixQrCode}
                  alt="QR Code Pix da licença anual do AvaliaReal"
                  className="mt-3 h-52 w-52 rounded-[12px] bg-card p-2 ring-1 ring-border"
                />
              ) : null}
              {cobranca.pixCopiaECola ? (
                <>
                  <p className="mt-4 w-full rounded-[12px] bg-card px-3 py-2.5 font-mono text-[11px] break-all ring-1 ring-border">
                    {cobranca.pixCopiaECola}
                  </p>
                  <button
                    onClick={() => {
                      void navigator.clipboard.writeText(cobranca.pixCopiaECola!);
                      toast.success("Código Pix copiado!");
                    }}
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
          ) : abrirForm ? (
            <div className="mt-5 space-y-3 rounded-[16px] bg-background p-4 ring-1 ring-border">
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
                onClick={gerarCobranca}
                disabled={gerando || nome.trim().length < 2 || documento.replace(/\D/g, "").length < 11}
                className="w-full rounded-full bg-gradient-safe py-3.5 text-sm font-semibold text-primary-foreground shadow-safe transition-transform active:scale-[.98] disabled:opacity-60"
              >
                {gerando ? "Gerando cobrança…" : "Gerar cobrança de R$ 49,90"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAbrirForm(true)}
              className="mt-6 w-full rounded-full bg-gradient-brand py-3.5 text-sm font-semibold text-primary-foreground shadow-brand transition-transform active:scale-[.98]"
            >
              Ativar Licença por 1 Ano
            </button>
          )}


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
