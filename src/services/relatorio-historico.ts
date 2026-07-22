import { createClient } from "@/lib/supabase/client";
import type { RelatorioHistoricoEvento } from "@/types/relatorios-ocorrencia";

export interface HistoricoComAutor extends RelatorioHistoricoEvento {
  autor: { nome: string } | null;
}

/** Somente leitura (mais recente primeiro) — o histórico é populado pela
    trigger `registrar_historico_relatorio()` e por `adicionarComentarioHistorico`;
    nunca há update/delete (RLS não permite). */
export async function listarHistorico(relatorioId: string): Promise<HistoricoComAutor[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("relatorio_historico")
    .select("*, autor:perfis(nome)")
    .eq("relatorio_id", relatorioId)
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as HistoricoComAutor[];
}

export async function adicionarComentarioHistorico(
  relatorioId: string,
  mensagem: string
): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("relatorio_historico").insert({
    relatorio_id: relatorioId,
    tipo: "comentario",
    mensagem,
    autor_id: user?.id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- sem Database gerado; ver dashboard.ts
  } as any);
  if (error) throw error;
}
