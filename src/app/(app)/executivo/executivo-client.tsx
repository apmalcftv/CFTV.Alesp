"use client";

import { useMemo, useState } from "react";
import { Gauge, Printer, TimerOff, TrendingUp } from "lucide-react";
import {
  useCamerasDashboard,
  useCatalogos,
  useOcorrenciasDashboard,
} from "@/hooks/use-dashboard";
import {
  FILTROS_INICIAIS,
  aplicarFiltros,
  calcularKpis,
  ocorrenciasPorPredio,
  rankingDefeitos,
  rankingEmpresasSla,
  type FiltrosDashboard as Filtros,
  type PontoNomeValor,
} from "@/services/indicadores";
import { fmtPct } from "@/components/charts/chart-config";
import { FiltrosDashboard } from "@/components/dashboard/filtros-dashboard";
import { KpiCard, KpiCardSkeleton } from "@/components/dashboard/kpi-card";
import { Ajuda } from "@/components/ui/ajuda";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function fmtDias(v: number | null) {
  return v === null ? "—" : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} d`;
}

function ListaSimples({ itens }: { itens: PontoNomeValor[] }) {
  if (itens.length === 0) {
    return <p className="text-sm text-muted-foreground">Sem dados no período</p>;
  }
  return (
    <ol className="flex flex-col gap-2">
      {itens.slice(0, 8).map((item, i) => (
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

export function ExecutivoClient() {
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIAIS);
  const catalogos = useCatalogos();
  const cameras = useCamerasDashboard();
  const ocorrencias = useOcorrenciasDashboard();

  const carregando = cameras.isPending || ocorrencias.isPending;
  const dados = useMemo(
    () => aplicarFiltros(cameras.data ?? [], ocorrencias.data ?? [], filtros),
    [cameras.data, ocorrencias.data, filtros]
  );
  const kpis = useMemo(() => calcularKpis(dados), [dados]);
  const rankings = useMemo(
    () => ({
      predios: ocorrenciasPorPredio(dados.ocorrencias),
      defeitos: rankingDefeitos(dados.ocorrencias),
      empresas: rankingEmpresasSla(dados.ocorrencias),
    }),
    [dados]
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Executivo Câmeras
          </h1>
          <p className="text-sm text-muted-foreground">
            Indicadores estratégicos para a diretoria
          </p>
        </div>
        <Ajuda texto="Abre a impressão do navegador — escolha 'Salvar como PDF'">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" />
            PDF
          </Button>
        </Ajuda>
      </div>

      <FiltrosDashboard filtros={filtros} catalogos={catalogos.data} onChange={setFiltros} />

      <div id="area-impressao" className="flex flex-col gap-6">
        {carregando ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <KpiCardSkeleton />
            <KpiCardSkeleton />
            <KpiCardSkeleton />
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <KpiCard
              titulo="Disponibilidade"
              valor={kpis.disponibilidadePct !== null ? fmtPct(kpis.disponibilidadePct) : "—"}
              icone={Gauge}
              tom="info"
            />
            <KpiCard
              titulo="Falhas no período"
              valor={String(kpis.novasFalhas)}
              icone={TrendingUp}
              tom="perigo"
              delta={{
                atual: kpis.novasFalhas,
                anterior: kpis.novasFalhasAnterior,
                subirEBom: false,
              }}
            />
            <KpiCard
              titulo="Tempo médio de reparo"
              valor={fmtDias(kpis.mttrDias)}
              icone={TimerOff}
              tom="neutro"
              delta={
                kpis.mttrDias !== null
                  ? { atual: kpis.mttrDias, anterior: kpis.mttrDiasAnterior, subirEBom: false }
                  : undefined
              }
            />
          </div>
        )}

        <div className="grid gap-4 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Ranking de prédios</CardTitle>
            </CardHeader>
            <CardContent>
              {carregando ? <Skeleton className="h-40 w-full" /> : <ListaSimples itens={rankings.predios} />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Ranking de defeitos</CardTitle>
            </CardHeader>
            <CardContent>
              {carregando ? <Skeleton className="h-40 w-full" /> : <ListaSimples itens={rankings.defeitos} />}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Empresas — % dentro do SLA</CardTitle>
            </CardHeader>
            <CardContent>
              {carregando ? (
                <Skeleton className="h-40 w-full" />
              ) : rankings.empresas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem dados no período</p>
              ) : (
                <ol className="flex flex-col gap-2">
                  {rankings.empresas.map((e) => (
                    <li key={e.nome} className="flex items-baseline gap-2 text-sm">
                      <span className="min-w-0 flex-1 truncate font-medium" title={e.nome}>
                        {e.nome}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {e.pctDentroSla !== null ? fmtPct(e.pctDentroSla) : "—"}
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
