import { createFileRoute } from "@tanstack/react-router";
import { AppShell, WHATSAPP_SUPORTE } from "@/components/AppShell";
import { useConta } from "@/hooks/useConta";

export const Route = createFileRoute("/_authenticated/suporte")({
  head: () => ({
    meta: [
      { title: "Suporte e Ajuda | AvaliaReal" },
      {
        name: "description",
        content: "Fale com o suporte técnico do AvaliaReal pelo WhatsApp e tire suas dúvidas.",
      },
      { property: "og:title", content: "Suporte e Ajuda | AvaliaReal" },
      {
        property: "og:description",
        content: "Fale com o suporte técnico do AvaliaReal pelo WhatsApp e tire suas dúvidas.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SuportePage,
});

const DUVIDAS = [
  {
    titulo: "Quando o meu saldo aparece?",
    texto:
      "Assim que a rede parceira confirma a tarefa concluída, o valor entra na sua carteira e aparece no extrato.",
  },
  {
    titulo: "Como funciona o saque?",
    texto:
      "Saldo mínimo de R$ 20,00, uma solicitação a cada 7 dias e verificação facial antes do envio do Pix.",
  },
  {
    titulo: "Não consigo concluir o cadastro",
    texto:
      "Confira se o CPF está correto, se a foto foi capturada e se você marcou o aceite dos termos.",
  },
];

function SuportePage() {
  const { data: conta } = useConta();

  return (
    <AppShell nome={conta?.nome} isAdmin={conta?.isAdmin}>
      <section className="mt-5 rounded-[22px] bg-card p-6 text-center ring-1 ring-border">
        <span className="inline-flex items-center gap-2 rounded-full bg-safe/10 px-3 py-1 text-[11px] font-semibold text-safe">
          Atendimento humano
        </span>
        <h1 className="mt-3 font-display text-xl font-semibold tracking-tight">Suporte e Ajuda</h1>
        <p className="mx-auto mt-2 max-w-xs text-xs text-muted-foreground">
          Nossa equipe responde dúvidas sobre tarefas, planos, cadastro e saques.
        </p>

        <a
          href={WHATSAPP_SUPORTE}
          target="_blank"
          rel="noopener noreferrer"
          className="mx-auto mt-5 flex w-full max-w-xs items-center justify-center gap-2 rounded-lg bg-safe py-3.5 text-sm font-bold text-ink shadow-safe ring-1 ring-safe/40 transition-transform active:scale-[.98]"
        >
          <svg viewBox="0 0 24 24" aria-hidden className="size-5 fill-current">
            <path d="M12.04 2c-5.46 0-9.9 4.44-9.9 9.9 0 1.75.46 3.45 1.32 4.95L2 22l5.3-1.38a9.87 9.87 0 0 0 4.74 1.2h.01c5.46 0 9.9-4.44 9.9-9.9 0-2.64-1.03-5.13-2.9-7A9.82 9.82 0 0 0 12.04 2m0 1.8c2.16 0 4.19.84 5.72 2.37a8.06 8.06 0 0 1 2.37 5.73c0 4.47-3.63 8.1-8.1 8.1a8.1 8.1 0 0 1-4.13-1.13l-.3-.18-3.14.82.84-3.06-.2-.31a8.03 8.03 0 0 1-1.24-4.31c0-4.47 3.64-8.1 8.18-8.03m-3.7 4.3c-.17 0-.45.06-.69.31-.24.25-.9.88-.9 2.15s.92 2.49 1.05 2.66c.13.17 1.8 2.86 4.44 3.9 2.2.86 2.65.69 3.13.65.48-.05 1.55-.63 1.77-1.25.22-.62.22-1.14.15-1.25-.06-.11-.24-.18-.5-.31-.26-.13-1.55-.77-1.79-.85-.24-.09-.41-.13-.59.13-.17.25-.67.85-.82 1.02-.15.18-.3.2-.56.07-.26-.13-1.1-.41-2.1-1.3-.78-.69-1.3-1.55-1.45-1.81-.15-.26-.02-.4.11-.53.12-.12.26-.3.39-.46.13-.15.17-.26.26-.44.09-.17.04-.33-.02-.46-.07-.13-.58-1.4-.8-1.92-.2-.5-.4-.43-.55-.44z" />
          </svg>
          Falar com o Suporte Técnico
        </a>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Atendimento oficial somente pelo WhatsApp.
        </p>
      </section>

      <section className="mt-7">
        <h2 className="font-display text-lg font-semibold tracking-tight">Dúvidas frequentes</h2>
        <div className="mt-3 space-y-2">
          {DUVIDAS.map((d) => (
            <div key={d.titulo} className="rounded-[16px] bg-card p-4 ring-1 ring-border">
              <p className="text-sm font-medium">{d.titulo}</p>
              <p className="mt-1 text-xs text-muted-foreground">{d.texto}</p>
            </div>
          ))}
        </div>
      </section>
    </AppShell>
  );
}
