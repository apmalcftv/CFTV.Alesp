import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import type { Ordenacao } from "@/hooks/use-ordenacao";

export function CabecalhoOrdenavel({
  chave,
  rotulo,
  ordenacao,
  onClick,
}: {
  chave: string;
  rotulo: string;
  ordenacao: Ordenacao | null;
  onClick: (chave: string) => void;
}) {
  const ativo = ordenacao?.chave === chave;
  return (
    <button
      type="button"
      onClick={() => onClick(chave)}
      className="inline-flex items-center gap-1 hover:text-foreground"
    >
      {rotulo}
      {ativo ? (
        ordenacao!.direcao === "asc" ? (
          <ArrowUp className="size-3.5" />
        ) : (
          <ArrowDown className="size-3.5" />
        )
      ) : (
        <ArrowUpDown className="size-3.5 opacity-40" />
      )}
    </button>
  );
}
