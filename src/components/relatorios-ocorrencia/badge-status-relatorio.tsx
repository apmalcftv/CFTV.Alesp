import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { RELATORIO_STATUS_LABEL, type RelatorioStatus } from "@/types/relatorios-ocorrencia";

const CLASSE: Record<RelatorioStatus, string> = {
  recebida: "bg-[var(--chart-1)]/10 text-[var(--chart-1)] border-[var(--chart-1)]/20",
  em_analise: "bg-warning/10 text-warning border-warning/20",
  aguardando_informacoes: "bg-destructive/10 text-destructive border-destructive/20",
  concluida: "bg-success/10 text-success border-success/20",
  arquivada: "bg-muted text-muted-foreground border-transparent",
};

export function BadgeStatusRelatorio({
  status,
  className,
}: {
  status: RelatorioStatus;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn(CLASSE[status], className)}>
      <span aria-hidden className="inline-block size-1.5 shrink-0 rounded-full bg-current" />
      {RELATORIO_STATUS_LABEL[status]}
    </Badge>
  );
}
