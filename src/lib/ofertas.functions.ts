import { createServerFn } from "@tanstack/react-start";

export type OfertaExterna = {
  id: string;
  titulo: string;
  descricao: string;
  empresa: string;
  recompensa_total: number;
  link_externo: string;
};

const CATALOGO: OfertaExterna[] = [
  {
    id: "tlk-1042",
    titulo: "Classificar fotos de fachadas de lojas",
    descricao: "Marque se a fachada aparece inteira e legível em 20 imagens.",
    empresa: "Toloka",
    recompensa_total: 4.0,
    link_externo: "https://exemplo-offerwall.com/tarefa/tlk-1042",
  },
  {
    id: "tlk-2210",
    titulo: "Responder pesquisa sobre delivery",
    descricao: "12 perguntas rápidas sobre seus últimos pedidos de comida.",
    empresa: "PesquisaJá",
    recompensa_total: 6.5,
    link_externo: "https://exemplo-offerwall.com/tarefa/tlk-2210",
  },
  {
    id: "ofw-3391",
    titulo: "Testar app de banco por 5 minutos",
    descricao: "Instale, crie uma conta de teste e conte como foi o cadastro.",
    empresa: "AppTest Brasil",
    recompensa_total: 9.0,
    link_externo: "https://exemplo-offerwall.com/tarefa/ofw-3391",
  },
  {
    id: "ofw-4477",
    titulo: "Transcrever recibos de supermercado",
    descricao: "Digite os itens e valores de 10 cupons fiscais.",
    empresa: "DataMercado",
    recompensa_total: 12.0,
    link_externo: "https://exemplo-offerwall.com/tarefa/ofw-4477",
  },
  {
    id: "tlk-5120",
    titulo: "Avaliar qualidade de resultados de busca",
    descricao: "Diga se o resultado responde bem à pergunta feita.",
    empresa: "Toloka",
    recompensa_total: 3.2,
    link_externo: "https://exemplo-offerwall.com/tarefa/tlk-5120",
  },
  {
    id: "ofw-6033",
    titulo: "Gravar 20 frases em português",
    descricao: "Leia frases curtas em voz alta em um ambiente silencioso.",
    empresa: "VozBR",
    recompensa_total: 15.0,
    link_externo: "https://exemplo-offerwall.com/tarefa/ofw-6033",
  },
];

export const MARGEM_PLATAFORMA = 0.25;

export const listarOfertasExternas = createServerFn({ method: "GET" }).handler(async () => {
  // Simula a resposta JSON de um agregador de microtarefas externo.
  return { ofertas: CATALOGO, atualizado_em: new Date().toISOString() };
});
