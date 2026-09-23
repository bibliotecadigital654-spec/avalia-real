import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { cpfValido } from "@/lib/cpf";

const entrada = z.object({
  userId: z.string().uuid(),
  cpf: z
    .string()
    .trim()
    .transform((v) => v.replace(/\D/g, ""))
    .refine((v) => cpfValido(v), "CPF inválido"),
  selfie: z
    .string()
    .min(1000)
    .max(6_000_000)
    .refine((v) => v.startsWith("data:image/jpeg;base64,"), "Selfie inválida"),
  termos: z.literal(true),
});

function base64ParaBytes(base64: string): Uint8Array {
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let i = 0; i < binario.length; i += 1) bytes[i] = binario.charCodeAt(i);
  return bytes;
}

export const registrarVerificacao = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => entrada.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: perfil, error: erroPerfil } = await supabaseAdmin
      .from("profiles")
      .select("id, cpf")
      .eq("id", data.userId)
      .maybeSingle();
    if (erroPerfil) throw new Error(erroPerfil.message);
    if (!perfil) throw new Error("Cadastro não encontrado.");
    if (perfil.cpf) return { ok: true as const, jaVerificado: true as const };

    const caminho = `${data.userId}/selfie-documento.jpg`;
    const bytes = base64ParaBytes(data.selfie.split(",")[1] ?? "");
    const { error: erroUpload } = await supabaseAdmin.storage
      .from("kyc")
      .upload(caminho, bytes, { contentType: "image/jpeg", upsert: true });
    if (erroUpload) throw new Error(erroUpload.message);

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ cpf: data.cpf, selfie_url: caminho, termos_aceitos: true })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);

    return { ok: true as const, jaVerificado: false as const };
  });
