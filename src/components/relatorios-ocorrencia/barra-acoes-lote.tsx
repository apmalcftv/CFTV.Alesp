"use client";

import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Barra de ações em lote — some automaticamente quando não há seleção.
    `acoes` recebe os botões específicos (hoje: Exportar PDF/Excel,
    Compartilhar); preparada para receber mais ações em lote no futuro
    (Alterar status, Arquivar, Excluir etc.) sem mudar de estrutura. */
export function BarraAcoesLote({
  quantidade,
  onLimpar,
  acoes,
}: {
  quantidade: number;
  onLimpar: () => void;
  acoes: ReactNode;
}) {
  if (quantidade === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border bg-accent/50 px-3 py-2">
      <span className="text-sm font-medium">
        {quantidade} relatório{quantidade > 1 ? "s" : ""} selecionado{quantidade > 1 ? "s" : ""}
      </span>
      <div className="flex flex-wrap items-center gap-2">{acoes}</div>
      <Button variant="ghost" size="sm" className="ml-auto" onClick={onLimpar}>
        <X className="size-4" />
        Limpar seleção
      </Button>
    </div>
  );
}
