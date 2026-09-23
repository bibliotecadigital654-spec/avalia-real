import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { z } from "zod";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";
import { mensagemAuth } from "@/lib/erros-auth";
import { cpfValido, mascararCpf } from "@/lib/cpf";
import { CameraCapture } from "@/components/CameraCapture";
import { RodapeInstitucional } from "@/components/RodapeInstitucional";
import { registrarVerificacao } from "@/lib/kyc.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AvaliaReal — ganhe avaliando empresas" },
      {
        name: "description",
        content:
          "Responda pesquisas e ofertas online das marcas parceiras e receba em reais direto na sua carteira.",
      },
      { property: "og:title", content: "AvaliaReal — ganhe avaliando empresas" },
      {
        property: "og:description",
        content: "Microtarefas pagas de avaliação de empresas, com saldo e resgate em reais.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const cadastroSchema = z.object({
  nome_completo: z.string().trim().min(3, { message: "Informe seu nome completo" }).max(120),
  email: z.string().trim().email({ message: "E-mail inválido" }).max(255),
  senha: z.string().min(6, { message: "A senha precisa de ao menos 6 caracteres" }).max(72),
  pix_key: z.string().trim().max(140).optional(),
});

const loginSchema = z.object({
  email: z.string().trim().email({ message: "E-mail inválido" }).max(255),
  senha: z.string().min(6, { message: "A senha precisa de ao menos 6 caracteres" }).max(72),
});

function useSaldoTempoReal(userId: string | null) {
  const [saldo, setSaldo] = useState<number | null>(null);

  useEffect(() => {
    if (!userId) {
      setSaldo(null);
      return;
    }
    let ativo = true;

    const carregar = async () => {
      const { data } = await supabase
        .from("wallets")
        .select("saldo_atual")
        .eq("user_id", userId)
        .maybeSingle();
      if (ativo) setSaldo(Number(data?.saldo_atual ?? 0));
    };
    void carregar();

    const canal = supabase
      .channel(`carteira-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "wallets", filter: `user_id=eq.${userId}` },
        (payload) => {
          const novo = (payload.new as { saldo_atual?: number } | null)?.saldo_atual;
          if (novo !== undefined && ativo) setSaldo(Number(novo));
        },
      )
      .subscribe();

    return () => {
      ativo = false;
      void supabase.removeChannel(canal);
    };
  }, [userId]);

  return saldo;
}

function Index() {
  const { session, user, carregando } = useAuth();
  const navigate = useNavigate();
  const saldo = useSaldoTempoReal(user?.id ?? null);
  const enviarVerificacao = useServerFn(registrarVerificacao);

  const [modo, setModo] = useState<"criar" | "entrar" | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<string | null>(null);
  const [nomeCompleto, setNomeCompleto] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [cpf, setCpf] = useState("");
  const [selfie, setSelfie] = useState<string | null>(null);
  const [termos, setTermos] = useState(false);
  const [pix, setPix] = useState("");
  const [enviando, setEnviando] = useState(false);

  const campo =
    "mt-1.5 w-full rounded-[12px] bg-background px-3 py-2.5 text-sm ring-1 ring-border outline-none focus:ring-2 focus:ring-ring";

  function falhar(msg: string) {
    setSucesso(null);
    setErro(msg);
    toast.error(msg);
  }

  const cpfOk = cpfValido(cpf);
  const cadastroLiberado =
    nomeCompleto.trim().length >= 3 &&
    email.trim().length > 3 &&
    senha.length >= 6 &&
    cpfOk &&
    !!selfie &&
    termos;

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    setSucesso(null);
    try {
      if (modo === "criar") {
        const parsed = cadastroSchema.safeParse({
          nome_completo: nomeCompleto,
          email,
          senha,
          pix_key: pix,
        });
        if (!parsed.success) {
          falhar(parsed.error.issues[0]?.message ?? "Confira os dados");
          return;
        }
        if (!cpfOk) {
          falhar("Informe um CPF válido");
          return;
        }
        if (!selfie) {
          falhar("Tire a selfie segurando o seu documento com foto");
          return;
        }
        if (!termos) {
          falhar("É preciso aceitar os Termos de Serviço e a Política de Privacidade");
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.senha,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              nome_completo: parsed.data.nome_completo,
              nome: parsed.data.nome_completo,
              pix_key: parsed.data.pix_key ?? "",
            },
          },
        });
        if (error) throw error;
        setSenha("");

        const novoId = data.user?.id;
        if (novoId) {
          try {
            await enviarVerificacao({
              data: { userId: novoId, cpf, selfie, termos: true },
            });
          } catch (err) {
            toast.error(
              err instanceof Error
                ? `Conta criada, mas a verificação falhou: ${err.message}`
                : "Conta criada, mas a verificação falhou.",
            );
          }
        }

        if (!data.session) {
          setSucesso(
            `Conta criada para ${parsed.data.email}! Enviamos um e-mail de confirmação — clique no link para entrar.`,
          );
          toast.success("Conta criada! Confirme seu e-mail.");
          return;
        }
        setSucesso("Conta criada e verificada! Você já está conectado.");
        toast.success("Conta criada!");
      } else {
        const parsed = loginSchema.safeParse({ email, senha });
        if (!parsed.success) {
          falhar(parsed.error.issues[0]?.message ?? "Confira os dados");
          return;
        }
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.senha,
        });
        if (error) throw error;
        toast.success("Bem-vindo de volta!");
        setModo(null);
      }
    } catch (err) {
      falhar(mensagemAuth(err));
    } finally {
      setEnviando(false);
    }
  }

  const logado = !carregando && !!session;

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-brand-light/40 blur-3xl" />
        <div className="absolute top-52 -right-12 h-72 w-72 rounded-full bg-accent/25 blur-3xl" />
      </div>

      <main className="relative z-10 mx-auto flex w-full max-w-md flex-col justify-center px-5 py-12">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-[10px] bg-gradient-brand text-primary-foreground shadow-brand">
            <span className="font-display text-sm font-semibold tracking-tight">AR</span>
          </div>
          <p className="font-display text-base font-semibold tracking-tight">AvaliaReal</p>
        </div>

        <h1 className="mt-8 font-display text-4xl leading-tight font-semibold tracking-tight text-pretty">
          Avalie empresas. Receba em reais.
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Escolha uma pesquisa ou oferta disponível, responda às perguntas das marcas parceiras e
          veja o saldo acumular direto na sua carteira virtual.
        </p>

        <div className="mt-7 rounded-[22px] bg-gradient-safe p-5 text-primary-foreground shadow-safe">
          <p className="text-xs font-medium tracking-[0.18em] text-primary-foreground/60 uppercase">
            Saldo acumulado
          </p>
          <p className="balance-pop mt-2 font-display text-5xl leading-none font-semibold tracking-tight">
            {logado ? brl(saldo ?? 0) : "R$ 1.248,00"}
          </p>
          <p className="mt-1 text-xs text-primary-foreground/60">
            {logado
              ? "Seu saldo atualiza sozinho a cada recompensa confirmada"
              : "Exemplo do que dá para juntar avaliando no dia a dia"}
          </p>
        </div>

        <div className="mt-7 space-y-3">
          {logado ? (
            <Link
              to="/tarefas"
              className="block rounded-full bg-gradient-brand py-3.5 text-center text-sm font-semibold text-primary-foreground shadow-brand transition-transform active:scale-[.98]"
            >
              Ver minhas tarefas
            </Link>
          ) : (
            <>
              <button
                onClick={() => {
                  setModo("criar");
                  setSenha("");
                  setErro(null);
                  setSucesso(null);
                }}
                className="block w-full rounded-full bg-gradient-brand py-3.5 text-center text-sm font-semibold text-primary-foreground shadow-brand transition-transform active:scale-[.98]"
              >
                Criar conta grátis
              </button>
              <button
                onClick={() => {
                  setModo("entrar");
                  setSenha("");
                  setErro(null);
                  setSucesso(null);
                }}
                className="block w-full rounded-full bg-card py-3 text-center text-sm font-semibold text-foreground ring-1 ring-border transition-transform active:scale-[.98]"
              >
                Já tenho conta
              </button>
            </>
          )}
        </div>
      </main>

      <RodapeInstitucional />

      {modo ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-4 backdrop-blur-sm sm:items-center">
          <div className="max-h-[92vh] w-full max-w-md overflow-y-auto rounded-[24px] bg-card p-5 ring-1 ring-border">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-semibold tracking-tight">
                  {modo === "criar" ? "Criar conta grátis" : "Entrar na sua conta"}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {modo === "criar"
                    ? "Cadastro verificado: CPF e selfie com documento."
                    : "Use o e-mail e a senha do seu cadastro."}
                </p>
              </div>
              <button
                onClick={() => {
                  setModo(null);
                  setErro(null);
                  setSucesso(null);
                }}
                aria-label="Fechar"
                className="rounded-full px-2 py-1 text-sm text-muted-foreground"
              >
                ✕
              </button>
            </div>

            {sucesso ? (
              <div
                role="status"
                className="mt-4 rounded-[16px] bg-gradient-safe p-4 text-primary-foreground shadow-safe"
              >
                <p className="text-sm font-semibold">✓ Tudo certo!</p>
                <p className="mt-1 text-xs text-primary-foreground/80">{sucesso}</p>
                <button
                  type="button"
                  onClick={() => {
                    setSucesso(null);
                    setModo(session ? null : "entrar");
                  }}
                  className="mt-3 w-full rounded-full bg-background/90 py-2.5 text-xs font-semibold text-foreground"
                >
                  {session ? "Continuar" : "Ir para o login"}
                </button>
              </div>
            ) : null}

            {erro ? (
              <div
                role="alert"
                className="mt-4 rounded-[16px] bg-destructive/10 p-3 text-xs font-medium text-destructive ring-1 ring-destructive/30"
              >
                {erro}
              </div>
            ) : null}

            <form onSubmit={enviar} className="mt-4 space-y-3.5">
              {modo === "criar" ? (
                <div>
                  <label className="text-xs font-semibold text-foreground/70">Nome Completo</label>
                  <input
                    value={nomeCompleto}
                    onChange={(e) => setNomeCompleto(e.target.value)}
                    maxLength={120}
                    placeholder="Marina Souza"
                    className={campo}
                  />
                </div>
              ) : null}

              <div>
                <label className="text-xs font-semibold text-foreground/70">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  maxLength={255}
                  placeholder="voce@email.com"
                  className={campo}
                />
              </div>

              {modo === "criar" ? (
                <div>
                  <label className="text-xs font-semibold text-foreground/70">CPF</label>
                  <input
                    value={cpf}
                    onChange={(e) => setCpf(mascararCpf(e.target.value))}
                    inputMode="numeric"
                    placeholder="000.000.000-00"
                    className={campo}
                  />
                  {cpf.length > 0 && !cpfOk ? (
                    <p className="mt-1 text-[11px] font-medium text-destructive">
                      CPF inválido — confira os números.
                    </p>
                  ) : null}
                </div>
              ) : null}

              <div>
                <label className="text-xs font-semibold text-foreground/70">Senha</label>
                <input
                  type="password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  maxLength={72}
                  placeholder="mínimo de 6 caracteres"
                  className={campo}
                />
              </div>

              {modo === "criar" ? (
                <>
                  <CameraCapture
                    rotulo="Selfie segurando um documento com foto"
                    ajuda="Segure o RG ou a CNH ao lado do rosto. A foto é usada só para verificação antifraude."
                    textoBotao="Capturar selfie"
                    onCapturar={(foto) => setSelfie(foto)}
                  />

                  <div>
                    <label className="text-xs font-semibold text-foreground/70">
                      Chave Pix (opcional)
                    </label>
                    <input
                      value={pix}
                      onChange={(e) => setPix(e.target.value)}
                      maxLength={140}
                      placeholder="e-mail, CPF ou telefone"
                      className={campo}
                    />
                  </div>

                  <label className="flex items-start gap-2.5 rounded-[12px] bg-background p-3 ring-1 ring-border">
                    <input
                      type="checkbox"
                      checked={termos}
                      onChange={(e) => setTermos(e.target.checked)}
                      className="mt-0.5 size-4 accent-current"
                    />
                    <span className="text-[11px] leading-4 text-muted-foreground">
                      Li e aceito os Termos de Serviço e Política de Privacidade.
                    </span>
                  </label>
                </>
              ) : null}

              <button
                type="submit"
                disabled={enviando || (modo === "criar" && !cadastroLiberado)}
                className="w-full rounded-full bg-gradient-brand py-3.5 text-sm font-semibold text-primary-foreground shadow-brand transition-transform active:scale-[.98] disabled:opacity-60"
              >
                {enviando ? "Aguarde…" : modo === "criar" ? "Criar conta" : "Entrar"}
              </button>

              <button
                type="button"
                onClick={() => navigate({ to: "/auth" })}
                className="w-full text-center text-xs font-semibold text-brand"
              >
                Prefiro entrar com o Google
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
