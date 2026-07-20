// Tipagens do pipeline de importação da planilha CFTV → Supabase

export type StatusOcorrenciaImport =
  | "aberta"
  | "aguardando_terceiros"
  | "concluida";

export type StatusCameraImport =
  | "operante"
  | "inoperante"
  | "removida"
  | "desativada";

/** Linha crua da planilha (a partir da linha 4 do xlsx) */
export interface LinhaPlanilha {
  linha: number; // nº da linha no Excel (para rastreabilidade)
  resolvida: boolean;
  dataAbertura: Date | null;
  dataSolucaoBruta: string | Date | null;
  camera: number | null;
  tarefa: string;
}

export interface LocalExtraido {
  nome: string;
  tipoArea: string;
  andar: string | null;
}

/** Ocorrência normalizada, pronta para virar SQL */
export interface OcorrenciaImport {
  importChave: string;
  linha: number;
  camera: number | null;
  defeito: string; // nome no catálogo tipos_defeito
  descricao: string; // texto ORIGINAL da planilha, preservado
  status: StatusOcorrenciaImport;
  abertaEm: string; // ISO — sempre presente (regra aprovada p/ ausentes)
  encerradaEm: string | null;
  impedimento: string | null;
  tecnico: string | null; // "Eduardo" quando citado
}

/** Câmera consolidada (1 registro por número) */
export interface CameraImport {
  numero: number;
  local: LocalExtraido | null;
  status: StatusCameraImport;
  substituidaPor: number | null;
  observacoes: string | null;
  totalOcorrencias: number;
}

export type TipoLog =
  | "corrigido"
  | "ignorado"
  | "ambiguo"
  | "invalido"
  | "consolidado"
  | "extraido";

export interface EntradaLog {
  tipo: TipoLog;
  linha: number | null;
  campo: string;
  mensagem: string;
}

export interface ResultadoParse {
  ocorrencias: OcorrenciaImport[];
  cameras: CameraImport[];
  locais: LocalExtraido[];
  log: EntradaLog[];
  estatisticas: {
    linhasLidas: number;
    ocorrencias: number;
    concluidas: number;
    abertas: number;
    ocorrenciasSistema: number;
    cameras: number;
    camerasConsolidadas: number;
    locais: number;
    datasCorrigidas: number;
    horasExtraidas: number;
    semDataSolucao: number;
    semDataAbertura: number;
    registrosDescartados: number;
  };
}
