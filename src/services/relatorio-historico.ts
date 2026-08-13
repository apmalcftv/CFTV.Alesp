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

/** Evento de auditoria da aba Análise. `campo` só existe na edição de
    célula; adicionar e excluir linha falam por si. */
export interface EventoAnaliseHistorico {
  tipo: "edicao_analise" | "adicao_linha_analise" | "exclusao_linha_analise";
  campo?: string;
}

/** Registra na trilha o que mudou na aba Análise.
    Diferente do resto do relatório, isto não vem de trigger: o
    salvamento da análise apaga e reinsere todas as linhas, então o banco
    só enxergaria N exclusões e N inserções a cada "Salvar Análise". Quem
    sabe o que o operador de fato mudou é o grid, que tem em memória as
    linhas carregadas e as editadas. Grava na MESMA tabela do restante do
    histórico — nunca com valor anterior ou novo. */
export async function registrarEventosAnalise(
  relatorioId: string,
  eventos: EventoAnaliseHistorico[]
): Promise<void> {
  if (eventos.length === 0) return;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("relatorio_historico").insert(
    eventos.map((e) => ({
      relatorio_id: relatorioId,
      tipo: e.tipo,
      campo: e.campo ?? null,
      autor_id: user?.id,
    })) as never
  );
  if (error) throw error;
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
