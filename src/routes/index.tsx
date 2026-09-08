import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AvaliaReal — ganhe avaliando empresas" },
      {
        name: "description",
        content:
          "Faça microtarefas de avaliação em lojas, apps e restaurantes, envie sua foto e receba em reais na carteira.",
      },
      { property: "og:title", content: "AvaliaReal — ganhe avaliando empresas" },
      {
        property: "og:description",
        content: "Microtarefas pagas de avaliação de empresas, com saldo e resgate em reais.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const { session, carregando } = useAuth();

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 z-0">
        <div className="absolute -top-24 -left-16 h-72 w-72 rounded-full bg-brand-light/40 blur-3xl" />
        <div className="absolute top-52 -right-12 h-72 w-72 rounded-full bg-accent/25 blur-3xl" />
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-5 py-12">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-[10px] bg-gradient-brand text-primary-foreground shadow-brand">
            <span className="font-display text-sm font-semibold tracking-tight">AR</span>
          </div>
          <p className="font-display text-base font-semibold tracking-tight">AvaliaReal</p>
        </div>

        <h1 className="mt-8 font-display text-4xl font-semibold leading-tight tracking-tight text-pretty">
          Avalie empresas. Receba em reais.
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Escolha uma microtarefa perto de você, responda algumas perguntas, anexe uma foto e veja o
          valor cair no seu cofre.
        </p>

        <div className="mt-7 rounded-[22px] bg-gradient-safe p-5 text-primary-foreground shadow-safe">
          <p className="text-xs font-medium tracking-[0.18em] text-primary-foreground/60 uppercase">
            Saldo acumulado
          </p>
          <p className="balance-pop mt-2 font-display text-5xl leading-none font-semibold tracking-tight">
            R$ 1.248,00
          </p>
          <p className="mt-1 text-xs text-primary-foreground/60">
            Exemplo do que dá para juntar avaliando no dia a dia
          </p>
        </div>

        <div className="mt-7 space-y-3">
          {!carregando && session ? (
            <Link
              to="/tarefas"
              className="block rounded-full bg-gradient-brand py-3.5 text-center text-sm font-semibold text-primary-foreground shadow-brand transition-transform active:scale-[.98]"
            >
              Ver minhas tarefas
            </Link>
          ) : (
            <>
              <Link
                to="/auth"
                className="block rounded-full bg-gradient-brand py-3.5 text-center text-sm font-semibold text-primary-foreground shadow-brand transition-transform active:scale-[.98]"
              >
                Criar conta grátis
              </Link>
              <Link
                to="/auth"
                className="block rounded-full bg-card py-3 text-center text-sm font-semibold text-foreground ring-1 ring-border transition-transform active:scale-[.98]"
              >
                Já tenho conta
              </Link>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
