import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const schema = z.object({
  user_id: z.string().uuid(),
  reward_amount: z.coerce.number().positive().max(10000),
  task_id: z.string().trim().min(1).max(120),
});

export const Route = createFileRoute("/api/public/postback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env["POSTBACK_SECRET"] ?? "";
        const provided =
          request.headers.get("x-postback-secret") ??
          (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
        if (!secret || provided !== secret) {
          return Response.json({ ok: false, erro: "nao autorizado" }, { status: 401 });
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ ok: false, erro: "corpo invalido" }, { status: 400 });
        }

        const parsed = schema.safeParse(body);
        if (!parsed.success) {
          return Response.json(
            { ok: false, erro: parsed.error.issues[0]?.message ?? "dados invalidos" },
            { status: 400 },
          );
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: perfil } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("id", parsed.data.user_id)
          .maybeSingle();
        if (!perfil) {
          return Response.json({ ok: false, erro: "usuario nao encontrado" }, { status: 404 });
        }

        const { data: saldo, error } = await supabaseAdmin.rpc("creditar_recompensa", {
          _user_id: parsed.data.user_id,
          _valor: parsed.data.reward_amount,
          _tarefa_id: parsed.data.task_id,
        });
        if (error) {
          return Response.json({ ok: false, erro: error.message }, { status: 500 });
        }

        return Response.json({ ok: true, saldo_atual: saldo });
      },
    },
  },
});
