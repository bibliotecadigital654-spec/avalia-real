import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { useConta } from "@/hooks/useConta";
import { obterMuralBitLabs } from "@/lib/bitlabs.functions";

export const Route = createFileRoute("/_authenticated/ofertas")({
  head: () => ({
    meta: [
      { title: "Pesquisas BitLabs | AvaliaReal" },
      {
        name: "description",
        content: "Acesse pesquisas digitais da BitLabs e acumule recompensas na sua carteira.",
      },
      { property: "og:title", content: "Pesquisas BitLabs | AvaliaReal" },
      {
        property: "og:description",
        content: "Acesse pesquisas digitais da BitLabs e acumule recompensas na sua carteira.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: OfertasPage,
});

function OfertasPage() {
  const { data: conta } = useConta();
  const buscarMural = useServerFn(obterMuralBitLabs);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["mural-bitlabs", conta?.userId],
    queryFn: () => buscarMural(),
    enabled: Boolean(conta?.userId),
  });

  return (
    <AppShell nome={conta?.nome} isAdmin={conta?.isAdmin}>
      <section className="mt-5">
        <h1 className="font-display text-lg font-semibold tracking-tight">Ofertas de parceiros</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Pesquisas digitais disponíveis para o seu perfil.
        </p>

        <div className="mx-auto mt-4 w-full">
          {isLoading ? (
            <div className="grid min-h-80 place-items-center rounded-lg bg-card ring-1 ring-border">
              <p className="text-sm text-muted-foreground">Carregando pesquisas…</p>
            </div>
          ) : null}
          {isError ? (
            <div className="rounded-lg bg-card p-5 text-sm text-muted-foreground ring-1 ring-border">
              Não conseguimos carregar as pesquisas agora. Tente novamente em instantes.
            </div>
          ) : null}
          {!isLoading && !isError && data?.configured && data.url ? (
            <iframe
              src={data.url}
              title="Mural de pesquisas BitLabs"
              className="mx-auto block h-[68vh] min-h-[560px] w-full rounded-lg bg-card ring-1 ring-border"
              allow="clipboard-write"
            />
          ) : null}
          {!isLoading && !isError && data && !data.configured ? (
            <div className="rounded-lg bg-card p-5 ring-1 ring-border">
              <p className="text-sm font-semibold">Mural BitLabs em configuração</p>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                As pesquisas serão exibidas aqui assim que a análise da conta parceira for concluída.
              </p>
            </div>
          ) : null}
        </div>
      </section>
    </AppShell>
  );
}
