import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { brl } from "@/lib/format";

const VAZIO = { titulo: "", empresa: "", local: "", descricao: "", valor: "", tempo_estimado: "~5 min", prazo: "hoje" };

export function GerenciarTarefas() {
  const qc = useQueryClient();
  const [form, setForm] = useState(VAZIO);
  const [salvando, setSalvando] = useState(false);

  const { data: tarefas } = useQuery({
    queryKey: ["admin-tarefas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tasks")
        .select("id, titulo, empresa, valor, ativa")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function atualizar() {
    await qc.invalidateQueries({ queryKey: ["admin-tarefas"] });
    await qc.invalidateQueries({ queryKey: ["tarefas"] });
  }

  async function criar(e: React.FormEvent) {
    e.preventDefault();
    const valor = Number(form.valor.replace(",", "."));
    if (!form.titulo.trim() || !form.empresa.trim() || !(valor > 0)) {
      toast.error("Preencha título, empresa e um valor maior que zero.");
      return;
    }
    setSalvando(true);
    const { error } = await supabase.from("tasks").insert({ ...form, valor, ativa: true });
    setSalvando(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Tarefa publicada");
    setForm(VAZIO);
    await atualizar();
  }

  async function alternar(id: string, ativa: boolean) {
    const { error } = await supabase.from("tasks").update({ ativa: !ativa }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    await atualizar();
  }

  async function excluir(id: string) {
    if (!confirm("Excluir esta tarefa?")) return;
    const { error } = await supabase.from("tasks").delete().eq("id", id);
    if (error) { toast.error("Não foi possível excluir (talvez já tenha envios). Pause-a em vez disso."); return; }
    await atualizar();
  }

  const campo = "w-full rounded-lg bg-background px-3 py-2.5 text-sm text-foreground ring-1 ring-border outline-none focus:ring-brand";

  return (
    <section className="mt-7">
      <h2 className="font-display text-base font-semibold tracking-tight">Tarefas próprias</h2>
      <p className="text-xs text-muted-foreground">
        Pesquisas e avaliações publicadas aqui aparecem na Home. O valor só entra na carteira quando você aprova o envio.
      </p>
      <form onSubmit={criar} className="mt-3 space-y-2 rounded-xl bg-card p-4 ring-1 ring-border">
        <input className={campo} placeholder="Título (ex: Avalie o atendimento)" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <input className={campo} placeholder="Empresa" value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value })} />
          <input className={campo} placeholder="Local" value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} />
        </div>
        <textarea className={campo} rows={3} placeholder="Instruções da tarefa" value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
        <div className="grid grid-cols-3 gap-2">
          <input className={campo} inputMode="decimal" placeholder="Valor R$" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} />
          <input className={campo} placeholder="Tempo" value={form.tempo_estimado} onChange={(e) => setForm({ ...form, tempo_estimado: e.target.value })} />
          <input className={campo} placeholder="Prazo" value={form.prazo} onChange={(e) => setForm({ ...form, prazo: e.target.value })} />
        </div>
        <button disabled={salvando} className="w-full rounded-full bg-gradient-brand py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">
          {salvando ? "Publicando…" : "Publicar tarefa"}
        </button>
      </form>
      <div className="mt-3 space-y-2">
        {(tarefas ?? []).map((t) => (
          <div key={t.id} className="flex items-center gap-2 rounded-lg bg-card px-3 py-2.5 ring-1 ring-border">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{t.titulo}</p>
              <p className="text-[11px] text-muted-foreground">{t.empresa} · {brl(Number(t.valor))} · {t.ativa ? "Ativa" : "Pausada"}</p>
            </div>
            <button onClick={() => alternar(t.id, t.ativa)} className="rounded-full px-3 py-1.5 text-xs font-semibold text-brand ring-1 ring-brand/40">
              {t.ativa ? "Pausar" : "Ativar"}
            </button>
            <button onClick={() => excluir(t.id)} className="rounded-full px-3 py-1.5 text-xs font-semibold text-destructive ring-1 ring-destructive/30">
              🗑 Excluir
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
