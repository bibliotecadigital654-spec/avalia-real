import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";
import { z } from "zod";
import { cpfValido } from "@/lib/cpf";

// Recebe pré-cadastros do Jotform (ou webhook HTTP genérico).
// Não cria conta nem senha: a pessoa conclui o cadastro no app (senha, selfie, termos).

function iguais(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

function texto(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string" || typeof v === "number") return String(v).trim();
  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if ("first" in o || "last" in o) return `${texto(o["first"])} ${texto(o["last"])}`.trim();
    if ("day" in o && "month" in o && "year" in o)
      return `${texto(o["year"])}-${texto(o["month"]).padStart(2, "0")}-${texto(o["day"]).padStart(2, "0")}`;
  }
  return "";
}

function normalizar(chave: string) {
  return chave.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/^q\d+_/, "").replace(/[^a-z]/g, "");
}

function campo(valores: Record<string, unknown>, nomes: string[]) {
  for (const [k, v] of Object.entries(valores)) {
    const n = normalizar(k);
    if (nomes.some((p) => n.includes(p))) {
      const t = texto(v);
      if (t) return t;
    }
  }
  return "";
}

function dataIso(v: string): string {
  const br = v.match(/^(\d{2})[/-](\d{2})[/-](\d{4})$/);
  if (br) return `${br[3]}-${br[2]}-${br[1]}`;
  return v.slice(0, 10);
}

const schema = z.object({
  nome_completo: z.string().trim().min(3).max(120),
  email: z.string().trim().toLowerCase().email().max(255),
  cpf: z.string().refine(cpfValido, "CPF inválido"),
  data_nascimento: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((d) => {
      const t = Date.parse(d);
      return !Number.isNaN(t) && t < Date.now() && t > Date.parse("1900-01-01");
    }, "Data de nascimento inválida"),
});

export const Route = createFileRoute("/api/public/jotform-precadastro")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const segredo = (process.env["JOTFORM_WEBHOOK_SECRET"] ?? "").trim();
        const enviado = (new URL(request.url).searchParams.get("secret") ?? "").trim();
        const ok = !!segredo && !!enviado && iguais(enviado, segredo);
        const msg = !segredo
          ? "Integração ainda não configurada no servidor."
          : ok
            ? "Chave correta! Este endereço está pronto. Cole-o no Jotform em Configurações > Integrações > Webhooks. Ele só recebe envios do formulário, não é uma página para abrir."
            : "Chave incorreta. Confira se a chave no link é exatamente a que você salvou.";
        return new Response(
          `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Webhook AvaliaReal</title></head><body style="font-family:system-ui;background:#000;color:#fff;display:grid;place-items:center;min-height:100vh;margin:0;padding:24px"><div style="max-width:480px;text-align:center"><h1 style="color:${ok ? "#34d399" : "#f87171"}">${ok ? "✔ Webhook ativo" : "✖ Não autorizado"}</h1><p>${msg}</p></div></body></html>`,
          { status: ok ? 200 : 401, headers: { "content-type": "text/html; charset=utf-8" } },
        );
      },
      POST: async ({ request }) => {
        const segredo = (process.env["JOTFORM_WEBHOOK_SECRET"] ?? "").trim();
        if (!segredo) return Response.json({ ok: false, erro: "integracao nao configurada" }, { status: 503 });

        const url = new URL(request.url);
        const enviado = (url.searchParams.get("secret") ?? request.headers.get("x-webhook-secret") ?? "").trim();
        if (!enviado || !iguais(enviado, segredo)) {
          return Response.json({ ok: false, erro: "nao autorizado" }, { status: 401 });
        }

        const valores: Record<string, unknown> = {};
        try {
          const tipo = request.headers.get("content-type") ?? "";
          if (tipo.includes("application/json")) {
            Object.assign(valores, await request.json());
          } else {
            const form = await request.formData();
            for (const [k, v] of form.entries()) if (typeof v === "string") valores[k] = v;
            const raw = valores["rawRequest"];
            if (typeof raw === "string") Object.assign(valores, JSON.parse(raw));
          }
        } catch (e) {
          console.error("[jotform-precadastro] corpo invalido", String(e));
          return Response.json({ ok: false, erro: "corpo invalido" }, { status: 400 });
        }

        const parsed = schema.safeParse({
          nome_completo: campo(valores, ["nomecompleto", "nome", "name"]),
          email: campo(valores, ["email"]),
          cpf: campo(valores, ["cpf"]).replace(/\D/g, ""),
          data_nascimento: dataIso(campo(valores, ["datadenascimento", "nascimento", "birth", "datanasc", "data", "date"])),
        });
        if (!parsed.success) {
          console.error("[jotform-precadastro] rejeitado:", parsed.error.issues[0]?.path, parsed.error.issues[0]?.message, "campos:", Object.keys(valores).join(","));
          return Response.json({ ok: false, erro: parsed.error.issues[0]?.message ?? "dados invalidos" }, { status: 422 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const d = parsed.data;

        const { data: cpfUsado } = await supabaseAdmin.from("profiles").select("id").eq("cpf", d.cpf).limit(1);
        if (cpfUsado && cpfUsado.length > 0) {
          return Response.json({ ok: false, erro: "cpf ja cadastrado" }, { status: 409 });
        }

        const { error } = await supabaseAdmin.from("pre_cadastros").insert(d);
        if (error) {
          if (error.code === "23505") return Response.json({ ok: false, erro: "e-mail ou cpf ja pre-cadastrado" }, { status: 409 });
          console.error("[jotform-precadastro]", error.message);
          return Response.json({ ok: false, erro: "falha ao salvar" }, { status: 500 });
        }
        return Response.json({ ok: true });
      },
    },
  },
});
