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

export function useLicenca(userId: string | null | undefined) {
  const query = useQuery(licencaQueryOptions(userId));

  return {
    licenca: query.data ?? null,
    carregando: query.isLoading,
    recarregar: async () => {
      await query.refetch();
    },
    isAtivo: query.data?.ativa ?? false,
    statusLicenca: query.data?.status ?? "inativo",
    plano: query.data?.plano ?? "nenhum",
  };
}
