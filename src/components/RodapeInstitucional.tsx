import { useState, type ReactNode } from "react";

type ModalId = "quem-somos" | "desenvolvedor" | "termos";

const CONTEUDO: Record<ModalId, { titulo: string; corpo: ReactNode }> = {
  "quem-somos": {
    titulo: "Quem Somos",
    corpo: (
      <>
        <p>
          O AvaliaReal é uma plataforma brasileira de microtarefas digitais. Conectamos pessoas a
          pesquisas e avaliações de marcas parceiras e de redes internacionais licenciadas, pagando
          em reais direto na carteira do usuário.
        </p>
        <p>
          Nosso compromisso é com clareza: você sempre vê quanto vale cada tarefa, quanto recebeu e
          quando pode sacar. Sem promessas de dinheiro fácil e sem letras miúdas.
        </p>
      </>
    ),
  },
  desenvolvedor: {
    titulo: "Sobre o Desenvolvedor",
    corpo: (
      <>
        <p>
          O AvaliaReal foi criado por um desenvolvedor independente com um objetivo simples:
          oferecer uma alternativa honesta em um mercado cheio de aplicativos que prometem ganhos
          impossíveis e nunca pagam.
        </p>
        <p>
          Por isso adotamos verificação de identidade no cadastro, verificação facial no saque e
          limite de uma solicitação por semana. São regras que reduzem fraudes e protegem quem
          realmente trabalha na plataforma.
        </p>
        <p>
          Nunca pedimos senha de banco, código de SMS ou pagamento para “liberar saldo”. Se alguém
          fizer isso em nome do AvaliaReal, é golpe — fale conosco pelo WhatsApp oficial.
        </p>
      </>
    ),
  },
  termos: {
    titulo: "Termos de Serviço e Política de Privacidade",
    corpo: (
      <>
        <p>
          Ao criar uma conta você declara ter 18 anos ou mais e que os dados informados (nome, CPF e
          selfie com documento) são verdadeiros e seus. Uma conta por pessoa.
        </p>
        <p>
          Usamos os seus dados apenas para verificação de identidade, prevenção a fraudes e
          pagamento dos saques. A selfie fica armazenada em área privada e não é compartilhada com
          terceiros para fins comerciais.
        </p>
        <p>
          Os ganhos dependem das tarefas disponíveis nas redes parceiras e não são garantidos. Os
          saques exigem saldo mínimo de R$ 20,00, verificação facial e são limitados a uma
          solicitação a cada 7 dias. Contas com indícios de fraude podem ser suspensas e os valores
          revisados.
        </p>
        <p>
          O plano anual dá acesso à plataforma e ao Robô IA conforme o nível contratado, não sendo
          uma promessa de rendimento.
        </p>
      </>
    ),
  },
};

export function RodapeInstitucional() {
  const [aberto, setAberto] = useState<ModalId | null>(null);
  const modal = aberto ? CONTEUDO[aberto] : null;

  return (
    <footer className="relative z-10 mt-12 bg-ink/95 px-5 py-10 text-primary-foreground">
      <div className="mx-auto w-full max-w-4xl">
        <p className="font-display text-sm font-semibold tracking-tight">AvaliaReal</p>
        <p className="mt-1 text-xs text-primary-foreground/60">
          Microtarefas digitais pagas em reais, com verificação de identidade e regras claras.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {(Object.keys(CONTEUDO) as ModalId[]).map((id) => (
            <button
              key={id}
              onClick={() => setAberto(id)}
              className="rounded-[16px] bg-primary-foreground/10 px-4 py-4 text-left ring-1 ring-primary-foreground/15 transition-transform active:scale-[.99]"
            >
              <p className="text-sm font-semibold">{CONTEUDO[id].titulo}</p>
              <p className="mt-1 text-[11px] text-primary-foreground/60">Abrir informações</p>
            </button>
          ))}
        </div>

        <a
          href="https://wa.me/573151495373?text=Ol%C3%A1!%20Preciso%20de%20ajuda%20com%20o%20AvaliaReal."
          target="_blank"
          rel="noreferrer"
          className="mt-4 block rounded-full bg-primary-foreground/10 px-4 py-3 text-center text-[12px] font-semibold text-primary-foreground ring-1 ring-primary-foreground/15"
        >
          Falar com o Suporte Técnico no WhatsApp
        </a>

        <p className="mt-6 text-center text-[11px] text-primary-foreground/50">
          © 2026 AvaliaReal. Todos os direitos reservados.
        </p>
      </div>


      {modal ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/50 p-4 backdrop-blur-sm sm:items-center">
          <div className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-[24px] bg-card p-5 text-foreground ring-1 ring-border">
            <div className="flex items-start justify-between gap-3">
              <h2 className="font-display text-lg font-semibold tracking-tight">{modal.titulo}</h2>
              <button
                onClick={() => setAberto(null)}
                aria-label="Fechar"
                className="rounded-full px-2 py-1 text-sm text-muted-foreground"
              >
                ✕
              </button>
            </div>
            <div className="mt-3 space-y-3 text-xs leading-5 text-muted-foreground">
              {modal.corpo}
            </div>
            <button
              onClick={() => setAberto(null)}
              className="mt-5 w-full rounded-full bg-gradient-brand py-3 text-sm font-semibold text-primary-foreground shadow-brand"
            >
              Fechar
            </button>
          </div>
        </div>
      ) : null}
    </footer>
  );
}
