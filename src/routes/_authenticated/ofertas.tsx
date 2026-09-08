import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { useConta } from "@/hooks/useConta";
import { brl } from "@/lib/format";
import { listarOfertasExternas, MARGEM_PLATAFORMA } from "@/lib/ofertas.functions";

export const Route = createFileRoute("/_authenticated/ofertas")({
  component: OfertasPage,
});

function arredondar(v: number) {
  return Math.round(v * 100) / 100;
}

function OfertasPage() {
  const { data: conta } = useConta();
  const buscar = useServerFn(listarOfertasExternas);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["ofertas-externas"],
    queryFn: () => buscar(),
  });

  return (
    <AppShell nome={conta?.nome} isAdmin={conta?.isAdmin}>
      <section className="mt-5">
        <h1 className="font-display text-lg font-semibold tracking-tight">Ofertas de parceiros</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tarefas de agregadores externos. O valor mostrado já é o que fica com você.
        </p>

        <div className="mt-4 space-y-3">
          {isLoading ? <p className="text-sm text-muted-foreground">Buscando ofertas…</p> : null}
          {isError ? (
            <p className="text-sm text-muted-foreground">
              Não conseguimos carregar as ofertas agora. Tente de novo em instantes.
            </p>
          ) : null}

          {(data?.ofertas ?? []).map((o) => {
            const seu = arredondar(o.recompensa_total * (1 - MARGEM_PLATAFORMA));
            return (
              <article key={o.id} className="rounded-[16px] bg-card p-4 ring-1 ring-border">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-pretty">{o.titulo}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{o.empresa}</p>
                  </div>
                  <div className="shrink-0 rounded-[10px] bg-coin/20 px-2.5 py-1.5 text-right ring-1 ring-coin/40">
                    <p className="font-display text-base leading-none font-semibold">{brl(seu)}</p>
                    <p className="mt-0.5 text-[10px] font-medium text-muted-foreground">para você</p>
                  </div>
                </div>

                <p className="mt-2 text-xs text-muted-foreground">{o.descricao}</p>

                <a
                  href={o.link_externo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 block rounded-full bg-gradient-brand py-2.5 text-center text-sm font-semibold text-primary-foreground shadow-brand transition-transform active:scale-[.98]"
                >
                  Fazer no site do parceiro
                </a>
              </article>
            );
          })}
        </div>
      </section>
    </AppShell>
  );
}
