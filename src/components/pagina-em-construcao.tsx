import { Construction } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function PaginaEmConstrucao({
  titulo,
  fase,
  descricao,
}: {
  titulo: string;
  fase: string;
  descricao: string;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {titulo}
        </h1>
        <p className="text-sm text-muted-foreground">{descricao}</p>
      </div>
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-24 text-center">
        <Construction className="size-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Este módulo será entregue na
        </p>
        <Badge variant="secondary" className="text-sm">
          {fase}
        </Badge>
      </div>
    </div>
  );
}
