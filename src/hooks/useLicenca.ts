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
  const q = useQuery(licencaQueryOptions(userId));
  const licenca = q.data ?? null;
  return {
    licenca,
    carregando: q.isLoading,
    recarregar: async () => { await q.refetch(); },
    isAtivo: Boolean(licenca?.ativa),
    statusLicenca: licenca?.status ?? "inativo",
    plano: licenca?.plano ?? "nenhum",
  };
}
