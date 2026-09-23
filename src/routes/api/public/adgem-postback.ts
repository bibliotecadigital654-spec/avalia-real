import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const schema = z.object({
  playerid: z.string().uuid(),
  amount: z.coerce.number().positive().max(100000),
  transaction_id: z.string().trim().min(1).max(255),
  secret: z.string().trim().min(1).max(255),
});

async function processar(request: Request) {
  const segredo = (process.env["ADGEM_POSTBACK_SECRET"] ?? "").trim();
  if (!segredo) {
    return Response.json({ ok: false, erro: "integracao nao configurada" }, { status: 503 });
  }

  const url = new URL(request.url);
  const valores: Record<string, unknown> = Object.fromEntries(url.searchParams.entries());

  if (request.method === "POST") {
    const contentType = request.headers.get("content-type") ?? "";
    try {
      if (contentType.includes("application/json")) {
        const body = await request.json();
        if (body && typeof body === "object" && !Array.isArray(body)) Object.assign(valores, body);
      } else {
        Object.assign(valores, Object.fromEntries((await request.formData()).entries()));
      }
    } catch {
      return Response.json({ ok: false, erro: "corpo invalido" }, { status: 400 });
    }
  }

  const parsed = schema.safeParse({
    playerid: valores["playerid"] ?? valores["player_id"] ?? valores["uid"],
    amount: valores["amount"] ?? valores["payout"] ?? valores["usd"],
    transaction_id: valores["transaction_id"] ?? valores["tx"] ?? valores["offer_id"],
    secret:
      valores["secret"] ??
      valores["key"] ??
      request.headers.get("x-adgem-secret") ??
      "",
  });
  if (!parsed.success) {
    return Response.json({ ok: false, erro: "parametros invalidos" }, { status: 400 });
  }

  if (parsed.data.secret !== segredo) {
    return Response.json({ ok: false, erro: "nao autorizado" }, { status: 401 });
  }

  const taxa = Number.parseFloat((process.env["ADGEM_BRL_PER_USD"] ?? "3").trim());
  if (!Number.isFinite(taxa) || taxa <= 0 || taxa > 100) {
    return Response.json({ ok: false, erro: "cotacao invalida" }, { status: 503 });
  }

  const valorCreditado = Math.round(parsed.data.amount * taxa * 100) / 100;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("creditar_recompensa_externa", {
    _provider: "adgem",
    _transaction_id: parsed.data.transaction_id,
    _user_id: parsed.data.playerid,
    _valor_origem: parsed.data.amount,
    _taxa_conversao: taxa,
    _valor_creditado: valorCreditado,
  });

  if (error) {
    const status = error.message.includes("Usuario nao encontrado") ? 404 : 500;
    return Response.json({ ok: false, erro: error.message }, { status });
  }

  const resultado = data?.[0];
  return Response.json({
    ok: true,
    creditado: resultado?.creditado ?? false,
    valor_creditado: valorCreditado,
    saldo_atual: resultado?.saldo_atual ?? null,
  });
}

export const Route = createFileRoute("/api/public/adgem-postback")({
  server: {
    handlers: {
      GET: ({ request }) => processar(request),
      POST: ({ request }) => processar(request),
    },
  },
});
