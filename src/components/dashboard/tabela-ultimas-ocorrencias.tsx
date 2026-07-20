"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OcorrenciaDash } from "@/services/dashboard";
import { diasParada, estaAberta } from "@/services/indicadores";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { BadgePrioridade, BadgeStatusOcorrencia } from "./badges";

const POR_PAGINA = 10;

const fmtData = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
});

export function TabelaUltimasOcorrencias({
  ocorrencias,
  atualizando,
}: {
  ocorrencias: OcorrenciaDash[];
  atualizando?: boolean;
}) {
  const [pagina, setPagina] = useState(0);
  const totalPaginas = Math.max(1, Math.ceil(ocorrencias.length / POR_PAGINA));
  const paginaAtual = Math.min(pagina, totalPaginas - 1);
  const visiveis = ocorrencias.slice(
    paginaAtual * POR_PAGINA,
    (paginaAtual + 1) * POR_PAGINA
  );

  return (
    <Card className={cn("transition-opacity duration-300", atualizando && "opacity-50")}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-sm font-medium">
            Últimas ocorrências
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            {ocorrencias.length} registro(s) no período filtrado
          </p>
        </div>
      </CardHeader>
      <CardContent>
        {ocorrencias.length === 0 ? (
          <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
            Nenhuma ocorrência nos filtros selecionados
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Data</TableHead>
                    <TableHead className="text-xs">Câmera</TableHead>
                    <TableHead className="text-xs">Local</TableHead>
                    <TableHead className="text-xs">Defeito</TableHead>
                    <TableHead className="text-xs">Empresa</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Prioridade</TableHead>
                    <TableHead className="text-right text-xs">
                      Dias parada
                    </TableHead>
                    <TableHead className="text-xs" aria-label="Ações" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visiveis.map((o) => {
                    const dias = diasParada(o);
                    return (
                      <TableRow key={o.id}>
                        <TableCell className="whitespace-nowrap text-xs tabular-nums">
                          {fmtData.format(new Date(o.aberta_em))}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {o.camera ? `Câmera ${o.camera.numero}` : "Sistema"}
                        </TableCell>
                        <TableCell
                          className="max-w-40 truncate text-xs"
                          title={o.camera?.local?.nome ?? undefined}
                        >
                          {o.camera?.local?.nome ?? "—"}
                        </TableCell>
                        <TableCell
                          className="max-w-40 truncate text-xs"
                          title={o.tipo_defeito?.nome ?? o.descricao}
                        >
                          {o.tipo_defeito?.nome ?? o.descricao}
                        </TableCell>
                        <TableCell className="text-xs">
                          {o.empresa?.nome ?? "—"}
                        </TableCell>
                        <TableCell>
                          <BadgeStatusOcorrencia status={o.status} />
                        </TableCell>
                        <TableCell>
                          <BadgePrioridade prioridade={o.prioridade} />
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right text-xs tabular-nums",
                            estaAberta(o) && dias >= 7 && "font-semibold text-destructive"
                          )}
                        >
                          {dias}
                        </TableCell>
                        <TableCell>
                          <Button
                            asChild
                            variant="ghost"
                            size="icon"
                            className="size-7 text-muted-foreground"
                          >
                            <Link
                              href="/ocorrencias"
                              aria-label={`Visualizar OS ${o.numero}`}
                            >
                              <Eye className="size-4" />
                            </Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {totalPaginas > 1 && (
              <div className="mt-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Página {paginaAtual + 1} de {totalPaginas}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-7"
                    disabled={paginaAtual === 0}
                    onClick={() => setPagina(paginaAtual - 1)}
                    aria-label="Página anterior"
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-7"
                    disabled={paginaAtual >= totalPaginas - 1}
                    onClick={() => setPagina(paginaAtual + 1)}
                    aria-label="Próxima página"
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
