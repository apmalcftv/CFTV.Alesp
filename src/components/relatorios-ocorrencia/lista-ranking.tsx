"use client";

import type { PontoNomeValor } from "@/services/indicadores";

/** Ranking simples "1º · nome · valor" usado pelas telas novas do módulo
    CMAL (Dashboard e Executivo). Mesmo desenho da `ListaSimples` local de
    `relatorios-ocorrencias-client.tsx`, extraído aqui como componente
    reutilizável — a versão local daquela página segue intocada. */
export function ListaRanking({
  itens,
  limite = 8,
  vazio = "Sem dados",
}: {
  itens: PontoNomeValor[];
  limite?: number;
  vazio?: string;
}) {
  if (itens.length === 0) {
    return <p className="text-sm text-muted-foreground">{vazio}</p>;
  }
  return (
    <ol className="flex flex-col gap-2">
      {itens.slice(0, limite).map((item, i) => (
        <li key={item.nome} className="flex items-baseline gap-2 text-sm">
          <span className="w-5 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
            {i + 1}º
          </span>
          <span className="min-w-0 flex-1 truncate font-medium" title={item.nome}>
            {item.nome}
          </span>
          <span className="tabular-nums text-muted-foreground">{item.valor}</span>
        </li>
      ))}
    </ol>
  );
}
