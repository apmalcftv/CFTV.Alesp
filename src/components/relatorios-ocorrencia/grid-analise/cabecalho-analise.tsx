"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import type { RelatorioOcorrenciaDetalhe } from "@/services/relatorios-ocorrencia";
import { RELATORIO_STATUS_LABEL } from "@/types/relatorios-ocorrencia";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CabecalhoAnalise({
  relatorio,
  recolhido,
  onRecolherChange,
  dataAnalise,
  onDataAnaliseChange,
}: {
  relatorio: RelatorioOcorrenciaDetalhe;
  recolhido: boolean;
  onRecolherChange: (v: boolean) => void;
  dataAnalise: string;
  onDataAnaliseChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-2 border-b bg-card px-3 py-2">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">
          Relatório #{relatorio.numero} — {RELATORIO_STATUS_LABEL[relatorio.status]}
        </p>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={() => onRecolherChange(!recolhido)}
          aria-label={recolhido ? "Expandir cabeçalho" : "Recolher cabeçalho"}
        >
          {recolhido ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
        </Button>
      </div>
      {!recolhido && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3 lg:grid-cols-6">
          <div>
            <p className="text-xs text-muted-foreground">Memorando</p>
            <p>{relatorio.numero_memorando ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Solicitante</p>
            <p>{relatorio.solicitante?.nome ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Local</p>
            <p>{relatorio.local?.nome ?? "—"}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Operador</p>
            <p>{relatorio.operador?.nome ?? "—"}</p>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <p className="mb-1 text-xs text-muted-foreground">Data da análise</p>
            <Input
              type="date"
              value={dataAnalise}
              onChange={(e) => onDataAnaliseChange(e.target.value)}
              className="h-8"
            />
          </div>
        </div>
      )}
    </div>
  );
}
