import { createClient } from "@/lib/supabase/client";
import type { RelatorioExportacao } from "@/types/relatorios-ocorrencia";

export interface NovaExportacao {
  relatorio_id: string;
  data_exportacao: string;
  hora_exportacao: string | null;
  operador_id: string | null;
  cameras_exportadas: string | null;
  periodo_inicio: string | null;
  periodo_fim: string | null;
  formato: string | null;
  tamanho: string | null;
  destino: string | null;
  hash: string | null;
  observacoes: string | null;
}

export async function listarExportacoes(
  relatorioId: string
): Promise<RelatorioExportacao[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("relatorio_exportacoes")
    .select("*")
    .eq("relatorio_id", relatorioId)
    .order("data_exportacao", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as RelatorioExportacao[];
}

export async function criarExportacao(
  valores: NovaExportacao
): Promise<RelatorioExportacao> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("relatorio_exportacoes")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- sem Database gerado; ver dashboard.ts
    .insert({ ...valores, criado_por: user?.id } as any)
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as RelatorioExportacao;
}

export async function excluirExportacao(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.from("relatorio_exportacoes").delete().eq("id", id);
  if (error) throw error;
}
