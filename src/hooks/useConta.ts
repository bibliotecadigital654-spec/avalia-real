import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type Conta = {
  userId: string;
  nome: string;
  saldo: number;
  isAdmin: boolean;
};

export function contaQueryOptions() {
  return {
    queryKey: ["conta"],
    queryFn: async (): Promise<Conta | null> => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) return null;

      const [{ data: perfil }, { data: papeis }] = await Promise.all([
        supabase.from("profiles").select("nome, saldo").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);

      return {
        userId: user.id,
        nome: perfil?.nome || (user.email ?? "").split("@")[0] || "você",
        saldo: Number(perfil?.saldo ?? 0),
        isAdmin: (papeis ?? []).some((p) => p.role === "admin"),
      };
    },
  };
}

export function useConta() {
  return useQuery(contaQueryOptions());
}
