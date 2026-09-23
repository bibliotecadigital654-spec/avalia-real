import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const URL_PADRAO = "https://adunits.adgem.com/wall?appid=33643&playerid=";

export const obterMuralAdGem = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const base = (process.env["MURAL_ADGEM_URL"] ?? URL_PADRAO).trim() || URL_PADRAO;
    const appId = (process.env["ADGEM_APP_ID"] ?? "").trim();

    let url: URL;
    try {
      url = new URL(base);
    } catch {
      return { configured: false as const, url: null };
    }
    if (url.protocol !== "https:") return { configured: false as const, url: null };

    // Identificador do usuário logado injetado no parâmetro oficial da AdGem.
    url.searchParams.set("playerid", context.userId);
    if (appId && !url.searchParams.has("appid")) url.searchParams.set("appid", appId);

    return { configured: true as const, url: url.toString() };
  });
