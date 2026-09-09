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
    const apiKey = process.env["ASAAS_API_KEY"];
    if (!apiKey) throw new Error("Pagamento indisponível: chave do Asaas não configurada.");
    const base = process.env["ASAAS_API_URL"] ?? "https://api.asaas.com/v3";
    const headers = { "Content-Type": "application/json", access_token: apiKey };

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
        billingType: "UNDEFINED",
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

    return {
      paymentId: cobranca.id,
      url: cobranca.invoiceUrl ?? null,
      valor: VALOR_LICENCA,
    };
  });
