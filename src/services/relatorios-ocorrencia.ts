import { createClient } from "@/lib/supabase/client";
import type { RelatorioOcorrencia } from "@/types/relatorios-ocorrencia";

/** Campos aceitos na criação. `prioridade`, `operador_id` e `classificacao`
    saíram do formulário de abertura (viram edição na tela de detalhe) e por
    isso não entram aqui — as colunas continuam existindo e o banco aplica
    o próprio padrão (`prioridade` = 'media', as outras duas nulas).
    `observacoes_fato` saiu das telas por inteiro; a coluna segue no banco
    (nullable) guardando o que já foi gravado. */
export interface NovoRelatorioOcorrencia {
  numero_memorando: string | null;
  tipo_solicitacao_id: string | null;
  solicitante_id: string | null;
  departamento_id: string | null;
  data_solicitacao: string;
  data_limite: string | null;
  data_fato: string | null;
  hora_aproximada: string | null;
  local_id: string | null;
  descricao_fato: string;
  tipo_ocorrencia_id: string | null;
  pessoas_envolvidas: string | null;
}

export interface RelatorioOcorrenciaDetalhe extends RelatorioOcorrencia {
  tipo_solicitacao: { id: string; nome: string } | null;
  solicitante: { id: string; nome: string } | null;
  departamento: { id: string; nome: string } | null;
  operador: { id: string; nome: string } | null;
  local: {
    id: string;
    nome: string;
    predio: { id: string; nome: string } | null;
  } | null;
  tipo_ocorrencia: { id: string; nome: string } | null;
  concluido_por_perfil: { id: string; nome: string } | null;
}

const SELECT_DETALHE = `
  *,
  tipo_solicitacao:tipos_solicitacao(id, nome),
  solicitante:solicitantes(id, nome),
  departamento:departamentos(id, nome),
  operador:perfis!relatorios_ocorrencia_operador_id_fkey(id, nome),
  local:locais(id, nome, predio:predios(id, nome)),
  tipo_ocorrencia:tipos_ocorrencia(id, nome),
  concluido_por_perfil:perfis!relatorios_ocorrencia_concluido_por_fkey(id, nome)
`;

export async function listarRelatorios(): Promise<RelatorioOcorrenciaDetalhe[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("relatorios_ocorrencia")
    .select(SELECT_DETALHE)
    .order("numero", { ascending: false })
    .limit(5000);
  if (error) throw error;
  return (data ?? []) as unknown as RelatorioOcorrenciaDetalhe[];
}

export async function buscarRelatorio(id: string): Promise<RelatorioOcorrenciaDetalhe> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("relatorios_ocorrencia")
    .select(SELECT_DETALHE)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as unknown as RelatorioOcorrenciaDetalhe;
}

/** Exclusão definitiva, exclusiva do Administrador (policy
    `t_exclusao_admin`). Timeline, anexos, histórico e exportações somem
    junto por ON DELETE CASCADE das FKs — um único DELETE, transacional,
    sem sequência de deletes no cliente.

    O Storage é o único ponto que a cascata não alcança: bucket não tem
    FK. Por isso os arquivos do relatório são removidos antes, na mesma
    ordem que `removerAnexoRelatorio` já usa (arquivo primeiro, registro
    depois) — se o Storage falhar, nada é apagado e o erro sobe.

    Catálogos compartilhados (locais, câmeras, perfis, departamentos,
    solicitantes, marcadores, tipos) não são tocados: o relatório aponta
    para eles, não o contrário. */
export async function excluirRelatorio(id: string): Promise<void> {
  const supabase = createClient();

  const { data: anexos, error: erroAnexos } = await supabase
    .from("relatorio_anexos")
    .select("storage_path")
    .eq("relatorio_id", id);
  if (erroAnexos) throw erroAnexos;

  const caminhos = (anexos ?? [])
    .map((a) => (a as { storage_path: string }).storage_path)
    .filter(Boolean);
  if (caminhos.length > 0) {
    const { error: erroStorage } = await supabase.storage
      .from("anexos-relatorios")
      .remove(caminhos);
    if (erroStorage) throw erroStorage;
  }

  const { error } = await supabase.from("relatorios_ocorrencia").delete().eq("id", id);
  if (error) throw error;
}

export async function criarRelatorio(
  valores: NovoRelatorioOcorrencia
): Promise<RelatorioOcorrencia> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("relatorios_ocorrencia")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- sem Database gerado; ver dashboard.ts
    .insert({ ...valores, criado_por: user?.id } as any)
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as RelatorioOcorrencia;
}

export async function atualizarRelatorio(
  id: string,
  valores: Partial<RelatorioOcorrencia>
): Promise<RelatorioOcorrencia> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("relatorios_ocorrencia")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- sem Database gerado; ver dashboard.ts
    .update(valores as any)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as RelatorioOcorrencia;
}
