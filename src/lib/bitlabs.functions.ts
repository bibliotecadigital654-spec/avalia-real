import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BITLABS_WALL_URL = "https://web.bitlabs.ai/";

export const obterMuralBitLabs = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const token = (process.env["BITLABS_APP_TOKEN"] ?? "").trim();
    if (!token) return { configured: false as const, url: null };

    const url = new URL(BITLABS_WALL_URL);
    url.searchParams.set("uid", context.userId);
    url.searchParams.set("token", token);

    return { configured: true as const, url: url.toString() };
  });