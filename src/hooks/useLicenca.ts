import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type Licenca = {
  status: string;
  validade: string | null;
  ativa: boolean;
};

function calcular(status: string | null, validade: string | null): Licenca {
  const s = status ?? "inativo";
  const ativa = s === "ativo" && !!validade && new Date(validade).getTime() > Date.now();
  return { status: s, validade, ativa };
}

export function useLicenca(userId: string | null | undefined) {
  const [licenca, setLicenca] = useState<Licenca | null>(null);
  const [carregando, setCarregando] = useState(true);

  const recarregar = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("profiles")
      .select("status_licenca, validade_licenca")
      .eq("id", userId)
      .maybeSingle();
    setLicenca(calcular(data?.status_licenca ?? null, data?.validade_licenca ?? null));
    setCarregando(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      setLicenca(null);
      setCarregando(false);
      return;
    }
    setCarregando(true);
    void recarregar();

    const canal = supabase
      .channel(`licenca-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles", filter: `id=eq.${userId}` },
        (payload) => {
          const novo = payload.new as
            | { status_licenca?: string; validade_licenca?: string | null }
            | null;
          if (novo) setLicenca(calcular(novo.status_licenca ?? null, novo.validade_licenca ?? null));
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(canal);
    };
  }, [userId, recarregar]);

  return { licenca, carregando, recarregar };
}
