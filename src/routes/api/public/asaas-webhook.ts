import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const schema = z.object({
  event: z.string().trim().min(1).max(80),
  payment: z
    .object({
      id: z.string().trim().min(1).max(120),
      customer: z.string().trim().max(120).optional(),
      value: z.coerce.number().nonnegative().max(1000000).optional(),
    })
    .optional(),
});

const EVENTOS_PAGOS = new Set(["PAYMENT_RECEIVED", "PAYMENT_CONFIRMED"]);

export const Route = createFileRoute("/api/public/asaas-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = process.env["ASAAS_WEBHOOK_TOKEN"] ?? "";
        const enviado =
          request.headers.get("asaas-access-token") ??
          request.headers.get("x-asaas-access-token") ??
          "";
        if (!token || enviado !== token) {
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

        const { event, payment } = parsed.data;
        if (!EVENTOS_PAGOS.has(event)) {
          return Response.json({ ok: true, ignorado: event });
        }
        if (!payment?.id) {
          return Response.json({ ok: false, erro: "paymentId ausente" }, { status: 400 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: userId, error } = await supabaseAdmin.rpc("confirmar_pagamento_licenca", {
          _payment_id: payment.id,
        });
        if (error) {
          return Response.json({ ok: false, erro: error.message }, { status: 500 });
        }
        if (!userId) {
          return Response.json(
            { ok: false, erro: "cobranca nao vinculada a um usuario" },
            { status: 404 },
          );
        }

        return Response.json({ ok: true, user_id: userId, licenca: "ativo" });
      },
    },
  },
});
