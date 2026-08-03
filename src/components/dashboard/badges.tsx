import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Ajuda } from "@/components/ui/ajuda";
import {
  CAMERA_STATUS_LABEL,
  OCORRENCIA_STATUS_LABEL,
  PRIORIDADE_LABEL,
  STATUS_USUARIO_LABEL,
  type CameraStatus,
  type OcorrenciaStatus,
  type Prioridade,
  type StatusUsuario,
} from "@/types/domain";

/** Pontinho colorido antes do texto — leitura rápida à distância, mesmo
    motivo visual do indicador "REC" da marca. Herda a cor via currentColor. */
function PontoBadge() {
  return (
    <span
      aria-hidden
      className="inline-block size-1.5 shrink-0 rounded-full bg-current"
    />
  );
}

const CAMERA_STATUS_CLASSE: Record<CameraStatus, string> = {
  operante: "bg-success/10 text-success border-success/20",
  degradada: "bg-warning/10 text-warning border-warning/20",
  inoperante: "bg-destructive/10 text-destructive border-destructive/20",
  desligada: "bg-muted text-muted-foreground border-transparent",
  em_manutencao: "bg-[var(--chart-1)]/10 text-[var(--chart-1)] border-[var(--chart-1)]/20",
  desligada_permanentemente: "bg-muted text-muted-foreground border-transparent",
};

const CAMERA_STATUS_AJUDA: Record<CameraStatus, string> = {
  operante: "Câmera funcionando normalmente",
  degradada:
    "Câmera ainda em operação, mas com defeito que compromete a imagem ou o sinal",
  inoperante: "Câmera parada, sem atendimento em andamento",
  desligada: "Câmera desligada (retirada, substituída ou fora de uso)",
  em_manutencao: "Técnico já está atendendo esta câmera",
  desligada_permanentemente:
    "Câmera retirada em definitivo do parque de CFTV — não entra em nenhum indicador do Dashboard",
};

export function BadgeStatusCamera({
  status,
  className,
}: {
  status: CameraStatus;
  className?: string;
}) {
  return (
    <Ajuda texto={CAMERA_STATUS_AJUDA[status]}>
      <Badge
        variant="outline"
        className={cn(CAMERA_STATUS_CLASSE[status], className)}
      >
        <PontoBadge />
        {CAMERA_STATUS_LABEL[status]}
      </Badge>
    </Ajuda>
  );
}

const STATUS_CLASSE: Record<OcorrenciaStatus, string> = {
  aberta: "bg-destructive/10 text-destructive border-destructive/20",
  em_andamento: "bg-[var(--chart-1)]/10 text-[var(--chart-1)] border-[var(--chart-1)]/20",
  aguardando_aceite: "bg-warning/10 text-warning border-warning/20",
  concluida: "bg-success/10 text-success border-success/20",
  cancelada: "bg-muted text-muted-foreground border-transparent",
};

const OCORRENCIA_STATUS_AJUDA: Record<OcorrenciaStatus, string> = {
  aberta: "OS registrada, ainda sem atendimento iniciado",
  em_andamento: "Empresa contratada já está atendendo esta OS",
  aguardando_aceite: "Empresa concluiu o reparo — aguardando o Operador CFTC confirmar",
  concluida: "Câmera confirmada operante pelo Operador CFTC",
  cancelada: "OS cancelada — motivo registrado no histórico",
};

export function BadgeStatusOcorrencia({
  status,
  className,
}: {
  status: OcorrenciaStatus;
  className?: string;
}) {
  return (
    <Ajuda texto={OCORRENCIA_STATUS_AJUDA[status]}>
      <Badge
        variant="outline"
        className={cn(STATUS_CLASSE[status], className)}
      >
        <PontoBadge />
        {OCORRENCIA_STATUS_LABEL[status]}
      </Badge>
    </Ajuda>
  );
}

const PRIORIDADE_CLASSE: Record<Prioridade, string> = {
  critica: "bg-destructive/10 text-destructive border-destructive/20",
  alta: "bg-warning/10 text-warning border-warning/20",
  media: "bg-[var(--chart-1)]/10 text-[var(--chart-1)] border-[var(--chart-1)]/20",
  baixa: "bg-muted text-muted-foreground border-transparent",
};

const PRIORIDADE_AJUDA: Record<Prioridade, string> = {
  critica: "Máxima urgência — prazo mais curto de SLA",
  alta: "Prazo de SLA curto",
  media: "Prazo de SLA padrão",
  baixa: "Prazo de SLA mais flexível",
};

const STATUS_USUARIO_CLASSE: Record<StatusUsuario, string> = {
  pendente: "bg-warning/10 text-warning border-warning/20",
  aprovado: "bg-success/10 text-success border-success/20",
  rejeitado: "bg-destructive/10 text-destructive border-destructive/20",
  bloqueado: "bg-destructive/10 text-destructive border-destructive/20",
  excluido: "bg-muted text-muted-foreground border-transparent",
};

export function BadgeStatusUsuario({
  status,
  className,
}: {
  status: StatusUsuario;
  className?: string;
}) {
  return (
    <Badge
      variant="outline"
      className={cn(STATUS_USUARIO_CLASSE[status], className)}
    >
      <PontoBadge />
      {STATUS_USUARIO_LABEL[status]}
    </Badge>
  );
}

export function BadgePrioridade({
  prioridade,
  className,
}: {
  prioridade: Prioridade;
  className?: string;
}) {
  return (
    <Ajuda texto={PRIORIDADE_AJUDA[prioridade]}>
      <Badge
        variant="outline"
        className={cn(PRIORIDADE_CLASSE[prioridade], className)}
      >
        <PontoBadge />
        {PRIORIDADE_LABEL[prioridade]}
      </Badge>
    </Ajuda>
  );
}
