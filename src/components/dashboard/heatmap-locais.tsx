"use client";

import { AlertTriangle, CheckCircle2, CircleAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BlocoLocal } from "@/services/indicadores";
import { fmtPct } from "@/components/charts/chart-config";

/** Criticidade por disponibilidade: ≥95% ok · ≥85% atenção · <85% crítico.
    A cor nunca vem sozinha — ícone + rótulo acompanham. */
function criticidade(disponibilidade: number) {
  if (disponibilidade >= 95)
    return {
      icone: CheckCircle2,
      classe: "border-l-success",
      badge: "text-success",
      rotulo: "Normal",
    };
  if (disponibilidade >= 85)
    return {
      icone: CircleAlert,
      classe: "border-l-warning",
      badge: "text-warning",
      rotulo: "Atenção",
    };
  return {
    icone: AlertTriangle,
    classe: "border-l-destructive",
    badge: "text-destructive",
    rotulo: "Crítico",
  };
}

export function HeatmapLocais({
  blocos,
  atualizando,
}: {
  blocos: BlocoLocal[];
  atualizando?: boolean;
}) {
  if (blocos.length === 0) {
    return (
      <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        Nenhuma câmera cadastrada nos filtros selecionados
      </div>
    );
  }

  return (
    <div
      className={cn(
        "grid grid-cols-1 gap-3 transition-opacity duration-300 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        atualizando && "opacity-50"
      )}
    >
      {blocos.map((bloco) => {
        const crit = criticidade(bloco.disponibilidade);
        return (
          <div
            key={bloco.nome}
            className={cn(
              "rounded-xl border border-l-4 bg-card p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md",
              crit.classe
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="truncate text-sm font-medium" title={bloco.nome}>
                {bloco.nome}
              </p>
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1 text-xs font-medium",
                  crit.badge
                )}
              >
                <crit.icone className="size-3.5" aria-hidden />
                {crit.rotulo}
              </span>
            </div>
            <p className="mt-1 text-2xl font-semibold tracking-tight">
              {fmtPct(bloco.disponibilidade, 0)}
            </p>
            <p className="text-xs text-muted-foreground">disponibilidade</p>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
              <span className="text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {bloco.total}
                </span>{" "}
                câmeras
              </span>
              <span className="text-muted-foreground">
                <span className="font-semibold text-success">
                  {bloco.operantes}
                </span>{" "}
                operantes
              </span>
              <span className="text-muted-foreground">
                <span className="font-semibold text-warning">
                  {bloco.degradadas}
                </span>{" "}
                degradadas
              </span>
              <span className="text-muted-foreground">
                <span className="font-semibold text-destructive">
                  {bloco.inoperantes}
                </span>{" "}
                inoperantes
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
