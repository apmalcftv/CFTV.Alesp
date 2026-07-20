"use client";

import { useState } from "react";
import { BarChart3, Table2 } from "lucide-react";
import { cn } from "@/lib/utils";
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
import { ScrollArea } from "@/components/ui/scroll-area";

export interface TabelaDoGrafico {
  colunas: string[];
  linhas: (string | number)[][];
}

/** Card padrão de gráfico: título, alternância gráfico/tabela (acessibilidade)
    e estado vazio. Mantém a render anterior com opacidade reduzida em refetch. */
export function ChartCard({
  titulo,
  subtitulo,
  tabela,
  vazio,
  atualizando,
  className,
  children,
}: {
  titulo: string;
  subtitulo?: string;
  tabela: TabelaDoGrafico;
  vazio?: boolean;
  atualizando?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const [modoTabela, setModoTabela] = useState(false);

  return (
    <Card className={cn("transition-shadow hover:shadow-md", className)}>
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 pb-2">
        <div>
          <CardTitle className="text-sm font-medium">{titulo}</CardTitle>
          {subtitulo && (
            <p className="text-xs text-muted-foreground">{subtitulo}</p>
          )}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-7 shrink-0 text-muted-foreground"
          onClick={() => setModoTabela((v) => !v)}
          aria-label={modoTabela ? "Ver gráfico" : "Ver como tabela"}
          title={modoTabela ? "Ver gráfico" : "Ver como tabela"}
        >
          {modoTabela ? (
            <BarChart3 className="size-4" />
          ) : (
            <Table2 className="size-4" />
          )}
        </Button>
      </CardHeader>
      <CardContent
        className={cn(
          "transition-opacity duration-300",
          atualizando && "opacity-50"
        )}
      >
        {vazio ? (
          <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
            Sem dados no período selecionado
          </div>
        ) : modoTabela ? (
          <ScrollArea className="h-64">
            <Table>
              <TableHeader>
                <TableRow>
                  {tabela.colunas.map((c) => (
                    <TableHead key={c} className="text-xs">
                      {c}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {tabela.linhas.map((linha, i) => (
                  <TableRow key={i}>
                    {linha.map((cel, j) => (
                      <TableCell
                        key={j}
                        className={cn(
                          "text-xs",
                          j > 0 && "tabular-nums"
                        )}
                      >
                        {cel}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
