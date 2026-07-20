"use client";

import { cn } from "@/lib/utils";
import type { PontoNomeValor } from "@/services/indicadores";
import { fmtNumero } from "@/components/charts/chart-config";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function ListaRanking({ itens }: { itens: PontoNomeValor[] }) {
  if (itens.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-muted-foreground">
        Sem dados no período selecionado
      </div>
    );
  }
  const maximo = Math.max(...itens.map((i) => i.valor));

  return (
    <ol className="space-y-2">
      {itens.map((item, i) => (
        <li key={item.nome} className="flex items-center gap-3">
          <span className="w-5 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
            {i + 1}º
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-xs font-medium" title={item.nome}>
                {item.nome}
              </span>
              <span className="text-xs font-semibold tabular-nums">
                {fmtNumero.format(item.valor)}
              </span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-[var(--chart-1)] transition-all duration-500"
                style={{ width: `${(item.valor / maximo) * 100}%` }}
              />
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export interface DadosRankings {
  locais: PontoNomeValor[];
  cameras: PontoNomeValor[];
  fabricantes: PontoNomeValor[];
  defeitos: PontoNomeValor[];
  empresas: PontoNomeValor[];
}

export function RankingsDashboard({
  rankings,
  atualizando,
}: {
  rankings: DadosRankings;
  atualizando?: boolean;
}) {
  return (
    <Card
      className={cn(
        "transition-opacity duration-300",
        atualizando && "opacity-50"
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">Rankings</CardTitle>
        <p className="text-xs text-muted-foreground">
          Concentrações de falhas no período filtrado
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="locais">
          <TabsList className="mb-3 h-auto w-full flex-wrap justify-start">
            <TabsTrigger value="locais" className="text-xs" title="Locais com mais ocorrências">
              Locais
            </TabsTrigger>
            <TabsTrigger value="cameras" className="text-xs" title="Câmeras com mais ocorrências">
              Câmeras
            </TabsTrigger>
            <TabsTrigger
              value="fabricantes"
              className="text-xs"
              title="Fabricantes com mais ocorrências nas câmeras"
            >
              Fabricantes
            </TabsTrigger>
            <TabsTrigger value="defeitos" className="text-xs" title="Tipos de defeito mais frequentes">
              Defeitos
            </TabsTrigger>
            <TabsTrigger
              value="empresas"
              className="text-xs"
              title="Empresas com mais ocorrências atendidas"
            >
              Empresas
            </TabsTrigger>
          </TabsList>
          <TabsContent value="locais">
            <ListaRanking itens={rankings.locais} />
          </TabsContent>
          <TabsContent value="cameras">
            <ListaRanking itens={rankings.cameras} />
          </TabsContent>
          <TabsContent value="fabricantes">
            <ListaRanking itens={rankings.fabricantes} />
          </TabsContent>
          <TabsContent value="defeitos">
            <ListaRanking itens={rankings.defeitos} />
          </TabsContent>
          <TabsContent value="empresas">
            <ListaRanking itens={rankings.empresas} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
