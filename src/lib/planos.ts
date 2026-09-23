export type PlanoId = "bronze" | "prata" | "ouro";

export type Plano = {
  id: PlanoId;
  nome: string;
  valor: number;
  destaque: string;
  beneficios: string[];
};

export const PLANOS: Plano[] = [
  {
    id: "bronze",
    nome: "Bronze",
    valor: 47,
    destaque: "5 execuções diárias do Robô IA",
    beneficios: ["Acesso ao mural de tarefas", "Saque via Pix", "Suporte no WhatsApp"],
  },
  {
    id: "prata",
    nome: "Prata",
    valor: 97,
    destaque: "15 execuções diárias do Robô IA",
    beneficios: ["Tudo do Bronze", "Prioridade nas tarefas", "Relatório de ganhos"],
  },
  {
    id: "ouro",
    nome: "Ouro",
    valor: 147,
    destaque: "Execuções ilimitadas do Robô IA",
    beneficios: ["Tudo do Prata", "Robô IA sem limite diário", "Atendimento prioritário"],
  },
];

export const LIMITES_PLANO: Record<string, number> = {
  bronze: 5,
  prata: 15,
  ouro: -1,
};

export function planoPorId(id: string): Plano | undefined {
  return PLANOS.find((p) => p.id === id);
}
