import type { Prioridade } from "@/types/domain";

// ---------- Status ----------
// Permissões deste módulo agora vivem em `@/lib/autorizacao` (serviço
// central de autorização) — nunca redeclarar predicados de papel aqui.

export type RelatorioStatus =
  | "recebida"
  | "em_analise"
  | "aguardando_informacoes"
  | "concluida"
  | "arquivada";

export const RELATORIO_STATUS_LABEL: Record<RelatorioStatus, string> = {
  recebida: "Recebida",
  em_analise: "Em análise",
  aguardando_informacoes: "Aguardando informações",
  concluida: "Concluída",
  arquivada: "Arquivada",
};

// ---------- Catálogos ----------

export interface Departamento {
  id: string;
  nome: string;
}

export interface TipoSolicitacao {
  id: string;
  nome: string;
}

export interface TipoOcorrenciaRelatorio {
  id: string;
  nome: string;
}

export interface Solicitante {
  id: string;
  nome: string;
}

export interface Marcador {
  id: string;
  nome: string;
}

// ---------- Relatório de Ocorrência (Abas 1, 2 e 5) ----------

export interface RelatorioOcorrencia {
  id: string;
  numero: number;

  // Aba 1 · Dados da Solicitação
  numero_memorando: string | null;
  tipo_solicitacao_id: string | null;
  solicitante_id: string | null;
  departamento_id: string | null;
  data_solicitacao: string;
  prioridade: Prioridade;
  operador_id: string | null;
  data_limite: string | null;
  status: RelatorioStatus;
  classificacao: string | null;

  // Aba 2 · Dados do Fato
  data_fato: string | null;
  hora_aproximada: string | null;
  local_id: string | null;
  descricao_fato: string;
  tipo_ocorrencia_id: string | null;
  pessoas_envolvidas: string | null;
  observacoes_fato: string | null;

  // Aba 5 · Resultado
  conclusao: string | null;
  providencias_adotadas: string | null;
  resumo_executivo: string | null;
  encaminhamento: string | null;
  data_conclusao: string | null;
  concluido_por: string | null;

  import_chave: string | null;
  origem_importacao: string | null;

  criado_por: string | null;
  criado_em: string;
  atualizada_em: string;
}

// ---------- Timeline (Aba 3) ----------

export interface RelatorioTimelineEvento {
  id: string;
  relatorio_id: string;
  data: string;
  horario_inicial: string;
  horario_final: string | null;
  camera_id: string | null;
  /** Vínculo com o catálogo `locais`, preservado dos eventos antigos. */
  local_id: string | null;
  /** Local em texto livre — é o que o grid grava hoje. */
  local_texto: string | null;
  descricao: string;
  operador_id: string | null;
  marcador_id: string | null;
  /** Uso interno dos operadores — nunca aparece nas exportações Excel/PDF. */
  comentario_interno: string | null;
  criado_em: string;
  atualizada_em: string;
}

// ---------- Exportações (Aba 4) ----------

export interface RelatorioExportacao {
  id: string;
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
  criado_por: string | null;
  criado_em: string;
}

// ---------- Anexos (Aba 6) ----------

export type TipoAnexoRelatorio =
  | "pdf"
  | "memorando"
  | "foto"
  | "video"
  | "documento"
  | "outro";

export const TIPO_ANEXO_RELATORIO_LABEL: Record<TipoAnexoRelatorio, string> = {
  pdf: "PDF",
  memorando: "Memorando",
  foto: "Foto",
  video: "Vídeo",
  documento: "Documento",
  outro: "Outro",
};

export interface RelatorioAnexo {
  id: string;
  relatorio_id: string;
  tipo: TipoAnexoRelatorio;
  storage_path: string;
  criado_por: string | null;
  criado_em: string;
}

// ---------- Histórico (Aba 7) ----------

export type TipoHistoricoRelatorio = "criacao" | "edicao" | "mudanca_status" | "comentario";

export interface RelatorioHistoricoEvento {
  id: string;
  relatorio_id: string;
  autor_id: string | null;
  tipo: TipoHistoricoRelatorio;
  campo: string | null;
  valor_anterior: string | null;
  valor_novo: string | null;
  mensagem: string | null;
  criado_em: string;
}
