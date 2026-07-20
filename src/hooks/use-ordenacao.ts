"use client";

import { useState } from "react";

export interface Ordenacao {
  chave: string;
  direcao: "asc" | "desc";
}

/** Ordenação de tabelas por coluna clicável (asc → desc → nenhuma). */
export function useOrdenacao() {
  const [ordenacao, setOrdenacao] = useState<Ordenacao | null>(null);

  function alternar(chave: string) {
    setOrdenacao((atual) => {
      if (!atual || atual.chave !== chave) return { chave, direcao: "asc" };
      if (atual.direcao === "asc") return { chave, direcao: "desc" };
      return null;
    });
  }

  function ordenar<T>(
    itens: T[],
    acessores: Record<string, (item: T) => string | number>
  ): T[] {
    if (!ordenacao) return itens;
    const acessar = acessores[ordenacao.chave];
    if (!acessar) return itens;
    return [...itens].sort((a, b) => {
      const va = acessar(a);
      const vb = acessar(b);
      const cmp =
        typeof va === "number" && typeof vb === "number"
          ? va - vb
          : String(va).localeCompare(String(vb), "pt-BR");
      return ordenacao.direcao === "asc" ? cmp : -cmp;
    });
  }

  return { ordenacao, alternar, ordenar };
}
