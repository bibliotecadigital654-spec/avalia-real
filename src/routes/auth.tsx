import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar ou criar conta — AvaliaReal" },
      {
        name: "description",
        content:
          "Acesse sua conta AvaliaReal para responder microtarefas, avaliar empresas e acompanhar seu saldo.",
      },
      { property: "og:title", content: "Entrar ou criar conta — AvaliaReal" },
      {
        property: "og:description",
        content: "Acesse sua conta AvaliaReal e comece a ganhar com microtarefas.",
      },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  nome: z.string().trim().max(80).optional(),
  email: z.string().trim().email({ message: "E-mail inválido" }).max(255),
  senha: z.string().min(6, { message: "A senha precisa de ao menos 6 caracteres" }).max(72),
});

function AuthPage() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ nome, email, senha });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Confira os dados");
      return;
    }
    setEnviando(true);
    try {
      if (modo === "criar") {
        const { data, error } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.senha,
          options: {
            emailRedirectTo: window.location.origin,
            data: { nome: parsed.data.nome || parsed.data.email.split("@")[0] },
          },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Conta criada! Confirme seu e-mail para entrar.");
          setModo("entrar");
          return;
        }
        navigate({ to: "/tarefas" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: parsed.data.email,
          password: parsed.data.senha,
        });
        if (error) throw error;
        navigate({ to: "/tarefas" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Não foi possível continuar");
    } finally {
      setEnviando(false);
    }
  }

  async function entrarComGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Não foi possível entrar com o Google");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/tarefas" });
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-10">
        <Link to="/" className="mb-6 flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-lg bg-gradient-brand text-primary-foreground shadow-brand">
            <span className="font-display text-sm font-semibold tracking-tight">AR</span>
          </div>
          <p className="font-display text-base font-semibold tracking-tight">AvaliaReal</p>
        </Link>

        <h1 className="font-display text-2xl font-semibold tracking-tight">
          {modo === "entrar" ? "Entrar na sua conta" : "Criar sua conta"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Responda microtarefas, avalie empresas e receba em reais.
        </p>

        <form
          onSubmit={enviar}
          className="mt-5 space-y-4 rounded-xl bg-card p-5 ring-1 ring-border"
        >
          {modo === "criar" ? (
            <div>
              <label className="text-xs font-semibold text-foreground/70">Como quer ser chamado</label>
              <input
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                maxLength={80}
                placeholder="Marina"
                className="mt-1.5 w-full rounded-[12px] bg-background px-3 py-2.5 text-sm ring-1 ring-border outline-none focus:ring-2 focus:ring-ring"
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
              className="mt-1.5 w-full rounded-[12px] bg-background px-3 py-2.5 text-sm ring-1 ring-border outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-foreground/70">Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              maxLength={72}
              placeholder="mínimo de 6 caracteres"
              className="mt-1.5 w-full rounded-[12px] bg-background px-3 py-2.5 text-sm ring-1 ring-border outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <button
            type="submit"
            disabled={enviando}
            className="w-full rounded-full bg-gradient-brand py-3.5 text-sm font-semibold text-primary-foreground shadow-brand transition-transform active:scale-[.98] disabled:opacity-60"
          >
            {enviando ? "Aguarde…" : modo === "entrar" ? "Entrar" : "Criar conta"}
          </button>

          <button
            type="button"
            onClick={entrarComGoogle}
            className="w-full rounded-full bg-background py-3 text-sm font-semibold text-foreground ring-1 ring-border transition-transform active:scale-[.98]"
          >
            Continuar com o Google
          </button>
        </form>

        <button
          onClick={() => setModo(modo === "entrar" ? "criar" : "entrar")}
          className="mt-4 text-center text-xs font-semibold text-brand"
        >
          {modo === "entrar" ? "Ainda não tenho conta — criar agora" : "Já tenho conta — entrar"}
        </button>
      </div>
    </div>
  );
}
