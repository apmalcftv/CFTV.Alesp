"use client";

import { useMemo } from "react";
import type { LinhaGrid } from "./tipos";

const fmtHora = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" });

/** Barra de status inferior (estilo Excel) — atualizada em tempo real
    conforme o operador digita. */
export function BarraEstatisticas({
  linhas,
  sujo,
  salvando,
  ultimaEdicaoEm,
  ultimoAutosaveEm,
}: {
  linhas: LinhaGrid[];
  sujo: boolean;
  salvando: boolean;
  ultimaEdicaoEm: Date | null;
  ultimoAutosaveEm: Date | null;
}) {
  const stats = useMemo(() => {
    const preenchidas = linhas.filter((l) => l.horarioInicial || l.descricao.trim());
    const cameras = new Set(preenchidas.map((l) => l.cameraId).filter(Boolean));
    const locais = new Set(preenchidas.map((l) => l.localId).filter(Boolean));
    const horarios = preenchidas.map((l) => l.horarioInicial).filter(Boolean).sort();
    return {
      total: preenchidas.length,
      cameras: cameras.size,
      locais: locais.size,
      periodo:
        horarios.length > 0
          ? `${horarios[0]}–${horarios[horarios.length - 1]}`
          : "—",
    };
  }, [linhas]);

  const statusAutosave = salvando
    ? "Salvando análise…"
    : !sujo
      ? "Tudo salvo"
      : ultimoAutosaveEm
        ? `Rascunho salvo às ${fmtHora.format(ultimoAutosaveEm)}`
        : "Alterações não salvas";

  return (
    <div className="flex flex-wrap gap-x-6 gap-y-1 border-t bg-muted/40 px-3 py-1.5 text-xs text-muted-foreground">
      <span>
        <strong className="text-foreground">{stats.total}</strong> eventos
      </span>
      <span>
        Período: <strong className="text-foreground">{stats.periodo}</strong>
      </span>
      <span>
        <strong className="text-foreground">{stats.cameras}</strong> câmeras
      </span>
      <span>
        <strong className="text-foreground">{stats.locais}</strong> locais
      </span>
      <span>
        Última alteração:{" "}
        <strong className="text-foreground">
          {ultimaEdicaoEm ? fmtHora.format(ultimaEdicaoEm) : "—"}
        </strong>
      </span>
      <span className="ml-auto">{statusAutosave}</span>
    </div>
  );
}
