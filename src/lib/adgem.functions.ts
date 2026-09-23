import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const obterMuralAdGem = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // Forçando a URL real do mural do aplicativo diretamente na engenharia do backend
    const base = "https://adgem.com";

    let url: URL;
    try {
      url = new URL(base);
    } catch {
      return { configured: false as const, url: null };
    }
    if (url.protocol !== "https:") return { configured: false as const, url: null };

    // Identificador do usuário logado injetado no parâmetro oficial da AdGem.
    url.searchParams.set("playerid", context.userId);

    return { configured: true as const, url: url.toString() };
  });
