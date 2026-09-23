import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Licenca = {
  status: string;
  validade: string | null;
  plano: string;
  ativa: boolean;
};

export function licencaQueryOptions(userId: string | null | undefined) {
  return {
    queryKey: ["licenca", userId ?? "anon"],
    enabled: Boolean(userId),
    queryFn: async (): Promise<Licenca | null> => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("status_licenca, validade_licenca, plano")
        .eq("id", userId)
        .maybeSingle();
      if (error) throw error;

      const status = data?.status_licenca ?? "inativo";
      const validade = data?.validade_licenca ?? null;
      const dentroDoPrazo = validade ? new Date(validade).getTime() > Date.now() : false;

      return {
        status,
        validade,
        plano: data?.plano ?? "nenhum",
        ativa: status === "ativo" && dentroDoPrazo,
      };
    },
  };
}

// LIBERAÇÃO TEMPORÁRIA DO PAYWALL: enquanto vigente, qualquer usuário
// autenticado é tratado como licença ativa, sem consultar o banco.
// Para reativar a cobrança, restaure a versão que usa licencaQueryOptions.
const LICENCA_TEMPORARIAMENTE_ATIVA: Licenca = {
  status: "ativo",
  validade: null,
  plano: "ouro",
  ativa: true,
};

export function useLicenca(_userId: string | null | undefined) {
  return {
    licenca: LICENCA_TEMPORARIAMENTE_ATIVA,
    carregando: false,
    recarregar: async () => {},
    isAtivo: true,
    statusLicenca: "ativo",
    plano: "ouro",
  };
}
