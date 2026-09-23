import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const obterMuralAdGem = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // URL base em total conformidade técnica com o identificador do aplicativo
    const base = "https://adgem.com";

    let url: URL;
    try {
      url = new URL(base);
    } catch {
      return { configured: false as const, url: null };
    }

    url.searchParams.set("playerid", context.userId || "");

    return {
      configured: true as const,
      url: url.toString(),
    };
  });
