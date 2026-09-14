import { createHmac, timingSafeEqual } from "node:crypto";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const callbackSchema = z.object({
  uid: z.string().uuid(),
  val: z.coerce.number().positive().max(10000),
  tx: z.string().trim().min(1).max(255),
  hash: z.string().regex(/^[a-f0-9]{40}$/i),
});

function urlSemHash(rawUrl: string) {
  return rawUrl.replace(/([?&])hash=[^&#]*(&?)/i, (_match, prefix: string, suffix: string) =>
    suffix ? prefix : "",
  );
}

function assinaturaValida(url: string, recebida: string, secret: string) {
  const esperada = createHmac("sha1", secret).update(urlSemHash(url)).digest("hex");
  const a = Buffer.from(recebida.toLowerCase(), "utf8");
  const b = Buffer.from(esperada, "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}

async function lerParametros(request: Request) {
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
      return null;
    }
  }

  return {
    uid: valores.uid,
    val: valores.val,
    tx: valores.tx ?? valores.transaction_id ?? valores.transactionId ?? valores.hash,
    hash: valores.hash,
  };
}

async function processarCallback(request: Request) {
  const secret = (process.env["BITLABS_APP_SECRET"] ?? "").trim();
  if (!secret) {
    return Response.json({ ok: false, erro: "integracao nao configurada" }, { status: 503 });
  }

  const parametros = await lerParametros(request);
  const parsed = callbackSchema.safeParse(parametros);
  if (!parsed.success) {
    return Response.json({ ok: false, erro: "parametros invalidos" }, { status: 400 });
  }

  if (!assinaturaValida(request.url, parsed.data.hash, secret)) {
    return Response.json({ ok: false, erro: "assinatura invalida" }, { status: 401 });
  }

  const taxa = Number.parseFloat((process.env["BITLABS_BRL_PER_USD"] ?? "3").trim());
  if (!Number.isFinite(taxa) || taxa <= 0 || taxa > 100) {
    return Response.json({ ok: false, erro: "cotacao invalida" }, { status: 503 });
  }

  const valorCreditado = Math.round(parsed.data.val * taxa * 100) / 100;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin.rpc("creditar_recompensa_externa", {
    _provider: "bitlabs",
    _transaction_id: parsed.data.tx,
    _user_id: parsed.data.uid,
    _valor_origem: parsed.data.val,
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

export const Route = createFileRoute("/api/public/bitlabs-webhook")({
  server: {
    handlers: {
      GET: ({ request }) => processarCallback(request),
      POST: ({ request }) => processarCallback(request),
    },
  },
});