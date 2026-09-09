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
  const [mostrarPix, setMostrarPix] = useState(false);
  const [ativando, setAtivando] = useState(false);
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

  async function confirmar() {
    setAtivando(true);
    try {
      const { error } = await supabase.rpc("ativar_licenca");
      if (error) throw error;
      await queryClient.invalidateQueries();
      toast.success("Licença ativada por 1 ano!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível ativar");
    } finally {
      setAtivando(false);
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

          {mostrarPix ? (
            <div className="mt-5 rounded-[16px] bg-background p-4 ring-1 ring-border">
              <p className="text-xs font-semibold text-foreground/70">Pix copia e cola (simulado)</p>
              <p className="mt-2 break-all rounded-[12px] bg-card p-3 font-mono text-[11px] text-muted-foreground ring-1 ring-border">
                {PIX_FICTICIO}
              </p>
              <button
                onClick={confirmar}
                disabled={ativando}
                className="mt-3 w-full rounded-full bg-gradient-safe py-3.5 text-sm font-semibold text-primary-foreground shadow-safe transition-transform active:scale-[.98] disabled:opacity-60"
              >
                {ativando ? "Confirmando…" : "Já paguei — confirmar ativação"}
              </button>
            </div>
          ) : (
            <button
              onClick={() => setMostrarPix(true)}
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
