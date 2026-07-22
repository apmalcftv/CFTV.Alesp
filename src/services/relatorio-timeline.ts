import { createClient } from "@/lib/supabase/client";
import type { RelatorioTimelineEvento } from "@/types/relatorios-ocorrencia";

export interface NovoEventoTimeline {
  relatorio_id: string;
  data: string;
  horario_inicial: string;
  horario_final: string | null;
  camera_id: string | null;
  local_id: string | null;
  descricao: string;
  operador_id: string | null;
  marcador_id: string | null;
  comentario_interno: string | null;
}

export interface EventoTimelineComJoins extends RelatorioTimelineEvento {
  camera: { id: string; numero: number } | null;
  local: { id: string; nome: string } | null;
  operador: { id: string; nome: string } | null;
  marcador: { id: string; nome: string } | null;
}

const SELECT_COM_JOINS = `
  *,
  camera:cameras(id, numero),
  local:locais(id, nome),
  operador:perfis(id, nome),
  marcador:marcadores(id, nome)
`;

/** Sempre em ordem cronológica (data, horário inicial) — a UI agrupa
    visualmente por `data` (cada grupo = uma "análise"). */
export async function listarTimeline(
  relatorioId: string
): Promise<EventoTimelineComJoins[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("relatorio_timeline_eventos")
    .select(SELECT_COM_JOINS)
    .eq("relatorio_id", relatorioId)
    .order("data")
    .order("horario_inicial");
  if (error) throw error;
  return (data ?? []) as unknown as EventoTimelineComJoins[];
}

/** Salvamento em lote do Grid Investigativo (aba Análise): apaga todos os
    eventos do relatório e insere o array atual completo em duas chamadas
    sequenciais. Mais simples e mais fácil de auditar que um diff célula a
    célula — aceitável aqui porque é uma ação explícita e pouco frequente
    ("Salvar Análise", não autosave) sobre um volume de dezenas/centenas de
    linhas. */
export async function salvarTimelineCompleta(
  relatorioId: string,
  linhas: NovoEventoTimeline[]
): Promise<void> {
  const supabase = createClient();
  const { error: erroExclusao } = await supabase
    .from("relatorio_timeline_eventos")
    .delete()
    .eq("relatorio_id", relatorioId);
  if (erroExclusao) throw erroExclusao;

  if (linhas.length === 0) return;

  const { error: erroInsercao } = await supabase
    .from("relatorio_timeline_eventos")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- sem Database gerado; ver dashboard.ts
    .insert(linhas as any);
  if (erroInsercao) throw erroInsercao;
}
