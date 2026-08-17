export type PapelUsuario =
  | "administrador"
  | "operador_cftc"
  | "empresa_contratada"
  | "fiscal_alesp"
  | "gestor";

export type StatusUsuario = "pendente" | "aprovado" | "rejeitado" | "bloqueado" | "excluido";

export const STATUS_USUARIO_LABEL: Record<StatusUsuario, string> = {
  pendente: "Pendente de aprovação",
  aprovado: "Aprovado",
  rejeitado: "Rejeitado",
  bloqueado: "Bloqueado",
  excluido: "Excluído",
};

export type CameraStatus =
  | "operante"
  | "degradada"
  | "inoperante"
  | "desligada"
  | "em_manutencao"
  | "desligada_permanentemente";

export type OcorrenciaStatus =
  | "aberta"
  | "em_andamento"
  | "aguardando_aceite"
  | "concluida"
  | "cancelada";

export type Prioridade = "baixa" | "media" | "alta" | "critica";

export const CAMERA_STATUS_LABEL: Record<CameraStatus, string> = {
  operante: "Operante",
  degradada: "Degradada",
  inoperante: "Inoperante",
  desligada: "Desligada",
  em_manutencao: "Em manutenção",
  desligada_permanentemente: "Desligada permanentemente",
};

export const OCORRENCIA_STATUS_LABEL: Record<OcorrenciaStatus, string> = {
  aberta: "Aberta",
  em_andamento: "Em andamento",
  aguardando_aceite: "Aguardando aceite",
  concluida: "Concluída",
  cancelada: "Cancelada",
};

export const PRIORIDADE_LABEL: Record<Prioridade, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
  critica: "Crítica",
};

// ---------- Ocorrências (Fase 2) ----------

export interface Ocorrencia {
  id: string;
  numero: number;
  camera_id: string | null;
  tipo_defeito_id: string | null;
  descricao: string;
  prioridade: Prioridade;
  status: OcorrenciaStatus;
  empresa_id: string | null;
  tecnico_id: string | null;
  os_externa: string | null;
  impedimento: string | null;
  aberta_em: string;
  primeira_resposta_em: string | null;
  encerrada_em: string | null;
  sla_horas: number | null;
  sla_vence_em: string | null;
  /** Status da câmera imediatamente antes desta OS abrir — restaurado
      automaticamente ao concluir/cancelar. Escrito só pela trigger. */
  status_camera_anterior: CameraStatus | null;
  /** Status que esta OS aplicou na câmera; null quando não está em aberto. */
  status_camera_aplicado: CameraStatus | null;
  criada_em: string;
  atualizada_em: string;
}

/** Opções fixas de prazo (SLA) oferecidas na abertura/edição da OS.
    "Sem SLA" (null) nunca entra em "OS vencidas" nem no alerta de SLA vencido. */
export const SLA_OPCOES: { rotulo: string; horas: number | null }[] = [
  { rotulo: "Sem SLA", horas: null },
  { rotulo: "24 horas", horas: 24 },
  { rotulo: "48 horas", horas: 48 },
  { rotulo: "72 horas", horas: 72 },
  { rotulo: "5 dias", horas: 120 },
  { rotulo: "7 dias", horas: 168 },
  { rotulo: "15 dias", horas: 360 },
  { rotulo: "30 dias", horas: 720 },
];

export type TipoEvento =
  | "comentario"
  | "mudanca_status"
  | "atribuicao"
  | "edicao"
  | "abertura";

export interface OcorrenciaEvento {
  id: string;
  ocorrencia_id: string;
  autor_id: string | null;
  tipo: TipoEvento;
  status_anterior: OcorrenciaStatus | null;
  status_novo: OcorrenciaStatus | null;
  campo: string | null;
  valor_anterior: string | null;
  valor_novo: string | null;
  mensagem: string | null;
  criado_em: string;
}

export type TipoAnexo = "foto" | "video" | "arquivo";

export interface Anexo {
  id: string;
  ocorrencia_id: string;
  tipo: TipoAnexo;
  storage_path: string;
  criado_por: string | null;
  criado_em: string;
}

// ---------- Gestão de usuários ----------

export interface PerfilUsuario {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  empresa_informada: string | null;
  papel: PapelUsuario | null;
  empresa_id: string | null;
  status: StatusUsuario;
  criado_em: string;
  aprovado_em: string | null;
  ultimo_acesso: string | null;
}

// ---------- Cadastros de apoio (Fase 1) ----------

export interface Predio {
  id: string;
  nome: string;
  sigla: string | null;
}

export const TIPO_AREA_OPCOES = [
  "Corredor",
  "Elevador",
  "Estacionamento",
  "Portaria",
  "Área externa",
  "Sala",
  "Escada",
] as const;

export interface Local {
  id: string;
  predio_id: string;
  andar: string | null;
  nome: string;
  tipo_area: string | null;
}

export interface Fabricante {
  id: string;
  nome: string;
}

export const TIPO_MODELO_OPCOES = ["Fixa", "Dome", "Bullet", "PTZ"] as const;

export interface ModeloCamera {
  id: string;
  fabricante_id: string;
  nome: string;
  tipo: string | null;
}

export interface Empresa {
  id: string;
  nome: string;
  cnpj: string | null;
  contato: string | null;
  ativa: boolean;
}

export interface Tecnico {
  id: string;
  empresa_id: string;
  nome: string;
  ativo: boolean;
}

export interface Nvr {
  id: string;
  nome: string;
  ip: string | null;
  local_id: string | null;
  canais: number | null;
}

export const CATEGORIA_DEFEITO_OPCOES = [
  "Imagem",
  "Conectividade",
  "Física",
  "Sistema",
  "Ambiente",
] as const;

/** Status operacional que a câmera assume enquanto houver OS aberta com
    este defeito. Aplicado pela trigger `sincronizar_status_camera_por_ocorrencia`
    (nunca pela aplicação) — a UI só lê para explicar a regra ao usuário. */
export interface TipoDefeito {
  id: string;
  nome: string;
  categoria: string | null;
  status_camera: CameraStatus;
}

/** Status aplicado quando a OS é aberta sem tipo de defeito — mesmo
    espelho do `coalesce(..., 'inoperante')` da trigger. */
export const STATUS_CAMERA_SEM_DEFEITO: CameraStatus = "inoperante";

export interface Camera {
  id: string;
  numero: number;
  patrimonio: string | null;
  ip: string | null;
  canal: number | null;
  modelo_id: string | null;
  local_id: string | null;
  nvr_id: string | null;
  empresa_id: string | null;
  status: CameraStatus;
  instalada_em: string | null;
  substituida_por: string | null;
  observacoes: string | null;
}

/** Histórico próprio da câmera — totalmente separado do histórico da OS
    (ocorrencia_eventos). Só é populado pela trigger `on_camera_status_change`,
    nunca escrito diretamente pela aplicação. */
export interface CameraEvento {
  id: string;
  camera_id: string;
  autor_id: string | null;
  tipo: string;
  status_anterior: CameraStatus | null;
  status_novo: CameraStatus | null;
  mensagem: string | null;
  criado_em: string;
}

// ---------- Branding por tenant (S2) ----------

export interface BrandingCores {
  primary?: string;
  secondary?: string;
  accent?: string;
}

export interface Branding {
  nome_sistema?: string;
  subtitulo?: string;
  descricao?: string;
  rodape?: string;
  dominio_email?: string;
  logo_url?: string;
  cores?: BrandingCores;
}

export interface TenantAtual {
  id: string;
  slug: string;
  nome: string;
  branding: Branding;
}

/** Marca neutra do produto — usada quando não há tenant resolvido
    (ex.: login sem ?t=slug, que é como o PWA abre — start_url não carrega
    slug nenhum). Configurável via NEXT_PUBLIC_PRODUCT_NAME.
    `logo_url` aponta para o mesmo arquivo usado nos ícones do PWA
    (public/icons/icon-512.png) — caminho relativo, resolvido pelo
    navegador contra a própria origem do app, sem precisar do domínio
    fixo no código. */
export const BRANDING_PRODUTO: Required<
  Pick<Branding, "nome_sistema" | "subtitulo" | "descricao" | "logo_url">
> = {
  nome_sistema: process.env.NEXT_PUBLIC_PRODUCT_NAME ?? "Gestão de CFTV",
  subtitulo: "Central de monitoramento",
  descricao: "Gerenciamento do circuito de câmeras",
  logo_url: "/icons/icon-512.png",
};

export interface Perfil {
  id: string;
  nome: string;
  papel: PapelUsuario;
  empresa_id?: string | null;
}

export const PAPEL_LABEL: Record<PapelUsuario, string> = {
  administrador: "Administrador",
  operador_cftc: "Operador CFTC",
  empresa_contratada: "Empresa Contratada",
  fiscal_alesp: "Fiscal ALESP",
  gestor: "Gestor",
};

/** Pode criar/editar câmeras, ocorrências e cadastros operacionais */
export function podeEditar(papel: PapelUsuario) {
  return papel === "administrador" || papel === "operador_cftc";
}

/** Pode aprovar/editar/bloquear/excluir usuários e alterar papéis */
export function podeGerenciarUsuarios(papel: PapelUsuario) {
  return papel === "administrador";
}

/** Vê e edita os cadastros operacionais (prédios, câmeras, catálogos etc.) */
export function podeVerCadastrosOperacionais(papel: PapelUsuario) {
  return podeEditar(papel);
}

/** Além de administrador/operador_cftc, uma conta 'empresa_contratada' só
    atualiza (status, comentário, anexo) as ocorrências da própria empresa —
    regra espelhada da RLS. */
export function podeAtualizarOcorrencia(
  perfil: Pick<Perfil, "papel" | "empresa_id">,
  empresaIdDaOcorrencia: string | null
) {
  if (podeEditar(perfil.papel)) return true;
  return (
    perfil.papel === "empresa_contratada" && perfil.empresa_id === empresaIdDaOcorrencia
  );
}
