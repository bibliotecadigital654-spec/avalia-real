import { createFileRoute } from "@tanstack/react-router";

// Copia perfis com cadastro completo (CPF + selfie + termos) e suas movimentações
// para o projeto externo. Não aceita dados de entrada: apenas processa a fila interna,
// então chamadas externas não conseguem ler nem alterar nada.
const LOTE = 100;

async function enviar(base: string, key: string, tabela: string, linhas: unknown[]) {
  if (!linhas.length) return;
  const headers: Record<string, string> = {
    apikey: key,
    "Content-Type": "application/json",
    Prefer: "resolution=merge-duplicates,return=minimal",
  };
  if (!key.startsWith("sb_")) headers["Authorization"] = `Bearer ${key}`;
  const res = await fetch(`${base}/rest/v1/${tabela}?on_conflict=id`, {
    method: "POST",
    headers,
    body: JSON.stringify(linhas),
  });
  if (!res.ok) throw new Error(`${tabela}: ${res.status} ${(await res.text()).slice(0, 300)}`);
}

async function processar() {
  const base = process.env["EXTERNAL_SUPABASE_URL"]?.trim().replace(/\/+$/, "");
  const key = process.env["EXTERNAL_SUPABASE_SERVICE_ROLE_KEY"]?.trim();
  if (!base || !key) return { ok: false, motivo: "nao configurado" };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as any;

  const { data: fila, error } = await db
    .from("sync_externo_fila")
    .select("id, tabela, registro_id, tentativas")
    .is("processado_em", null)
    .lt("tentativas", 10)
    .order("id")
    .limit(LOTE);
  if (error) throw error;
  if (!fila?.length) return { ok: true, processados: 0 };

  const idsPerfis = [...new Set(fila.filter((f: any) => f.tabela === "profiles").map((f: any) => f.registro_id))];
  const idsTx = [...new Set(fila.filter((f: any) => f.tabela === "transactions").map((f: any) => f.registro_id))];

  const { data: txs } = idsTx.length
    ? await db.from("transactions").select("*").in("id", idsTx)
    : { data: [] };
  const donos = [...new Set([...idsPerfis, ...(txs ?? []).map((t: any) => t.user_id)])];
  const { data: perfis } = donos.length
    ? await db.from("profiles").select("*").in("id", donos)
    : { data: [] };

  const completos = new Set(
    (perfis ?? [])
      .filter((p: any) => p.cpf && p.selfie_url && p.termos_aceitos)
      .map((p: any) => p.id),
  );

  const filaIds = fila.map((f: any) => f.id);
  try {
    await enviar(base, key, "profiles", (perfis ?? []).filter((p: any) => completos.has(p.id)));
    await enviar(base, key, "transactions", (txs ?? []).filter((t: any) => completos.has(t.user_id)));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("sync-externo falhou", msg);
    for (const f of fila) {
      await db.from("sync_externo_fila").update({ erro: msg, tentativas: (f.tentativas ?? 0) + 1 }).eq("id", f.id);
    }
    return { ok: false };
  }

  // Movimentações de quem ainda não concluiu o cadastro voltam a ser copiadas
  // quando o perfil ficar completo (o update do perfil re-enfileira tudo dele).
  await db.from("sync_externo_fila").update({ processado_em: new Date().toISOString(), erro: null }).in("id", filaIds);

  const recemCompletos = idsPerfis.filter((id: any) => completos.has(id));
  if (recemCompletos.length) {
    const { data: pendentes } = await db
      .from("transactions").select("id").in("user_id", recemCompletos);
    // Reenvia o histórico completo do usuário (upsert é idempotente).
    const todas = (pendentes ?? []).map((t: any) => t.id);
    for (let i = 0; i < todas.length; i += 500) {
      const { data: lote } = await db.from("transactions").select("*").in("id", todas.slice(i, i + 500));
      await enviar(base, key, "transactions", lote ?? []);
    }
  }
  return { ok: true, processados: fila.length };
}

export const Route = createFileRoute("/api/public/sync-externo")({
  server: {
    handlers: {
      POST: async () => {
        try {
          const r = await processar();
          return Response.json({ ok: r.ok });
        } catch (e) {
          console.error("sync-externo erro", e);
          return Response.json({ ok: false }, { status: 500 });
        }
      },
    },
  },
});
