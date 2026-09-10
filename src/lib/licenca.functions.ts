import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const entrada = z.object({
  nome: z.string().trim().min(2).max(120),
  cpfCnpj: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => v.length === 11 || v.length === 14, "Informe um CPF ou CNPJ válido"),
});

const VALOR_LICENCA = 49.9;

export const criarCobrancaLicenca = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => entrada.parse(data))
  .handler(async ({ data, context }) => {
    const apiKey = (process.env["ASAAS_API_KEY"] ?? "").trim();
    if (!apiKey) throw new Error("Pagamento indisponível: chave do Asaas não configurada.");
    // Produção real (sem sandbox). Host oficial de API do Asaas em produção.
    const base = "https://api.asaas.com/v3";
    const headers = {
      "Content-Type": "application/json",
      "User-Agent": "AvaliaReal_App",
      access_token: apiKey,
    };

    const email = (context.claims as { email?: string } | null)?.email ?? undefined;

    const respCliente = await fetch(`${base}/customers`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: data.nome, email, cpfCnpj: data.cpfCnpj }),
    });
    const cliente = (await respCliente.json()) as {
      id?: string;
      errors?: { description?: string }[];
    };
    if (!respCliente.ok || !cliente.id) {
      throw new Error(cliente.errors?.[0]?.description ?? "Não foi possível criar o cadastro de cobrança.");
    }

    const vencimento = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const respCobranca = await fetch(`${base}/payments`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        customer: cliente.id,
        billingType: "PIX",
        value: VALOR_LICENCA,
        dueDate: vencimento,
        description: "AvaliaReal — Licença anual (365 dias)",
        externalReference: context.userId,
      }),
    });
    const cobranca = (await respCobranca.json()) as {
      id?: string;
      invoiceUrl?: string;
      errors?: { description?: string }[];
    };
    if (!respCobranca.ok || !cobranca.id) {
      throw new Error(cobranca.errors?.[0]?.description ?? "Não foi possível gerar a cobrança.");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("licenca_pedidos").insert({
      user_id: context.userId,
      payment_id: cobranca.id,
      valor: VALOR_LICENCA,
      status: "pendente",
    });
    if (error) throw new Error(error.message);

    // QR Code Pix em produção: /payments/{id}/pixQrCode
    let pixQrCode: string | null = null;
    let pixCopiaECola: string | null = null;
    try {
      const respPix = await fetch(`${base}/payments/${cobranca.id}/pixQrCode`, { headers });
      const pix = (await respPix.json()) as { encodedImage?: string; payload?: string };
      if (respPix.ok) {
        pixQrCode = pix.encodedImage ? `data:image/png;base64,${pix.encodedImage}` : null;
        pixCopiaECola = pix.payload ?? null;
      }
    } catch {
      pixQrCode = null;
    }

    return {
      paymentId: cobranca.id,
      url: cobranca.invoiceUrl ?? null,
      valor: VALOR_LICENCA,
      pixQrCode,
      pixCopiaECola,
    };
  });
