import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const obterMuralBitLabs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const muralUrl = (process.env["MURAL_OFERTAS_URL"] ?? "").trim();
    const token = (process.env["BITLABS_APP_TOKEN"] ?? "").trim();
    if (!muralUrl) return { configured: false as const, url: null };

    let url: URL;
    try {
      url = new URL(muralUrl);
    } catch {
      return { configured: false as const, url: null };
    }

    if (url.protocol !== "https:") return { configured: false as const, url: null };

    const parametroUsuario = url.searchParams.has("subid") ? "subid" : "uid";
    url.searchParams.set(parametroUsuario, context.userId);

    if (token && !url.searchParams.has("token")) {
      url.searchParams.set("token", token);
    }

    return { configured: true as const, url: url.toString() };
  });