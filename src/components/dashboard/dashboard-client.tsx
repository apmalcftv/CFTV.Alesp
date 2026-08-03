"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import {
  Activity,
  AlertTriangle,
  Cctv,
  CheckCheck,
  CircleAlert,
  ClipboardList,
  Clock,
  Database,
  Gauge,
  RefreshCw,
  ShieldQuestion,
  Timer,
  TimerOff,
  TrendingUp,
  Wrench,
} from "lucide-react";
import {
  useCamerasDashboard,
  useCatalogos,
  useOcorrenciasDashboard,
} from "@/hooks/use-dashboard";
import {
  FILTROS_INICIAIS,
  aplicarFiltros,
  calcularAlertas,
  calcularKpis,
  camerasPorGrupo,
  disponibilidadeMensal,
  evolucaoMensal,
  ocorrenciasPorPredio,
  rankingCameras,
  rankingDefeitos,
  rankingEmpresas,
  rankingFabricantes,
  statusCamerasPizza,
  topLocais,
  type FiltrosDashboard as Filtros,
} from "@/services/indicadores";
import { fmtNumero, fmtPct } from "@/components/charts/chart-config";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { FiltrosDashboard } from "./filtros-dashboard";
import { HeatmapLocais } from "./heatmap-locais";
import { KpiCard, KpiCardSkeleton } from "./kpi-card";
import { RankingsDashboard } from "./rankings-dashboard";
import { TabelaUltimasOcorrencias } from "./tabela-ultimas-ocorrencias";

function SkeletonGraficos() {
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <div className="grid gap-4 sm:grid-cols-2 xl:col-span-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <Skeleton className="mb-3 h-4 w-40" />
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardContent className="space-y-3 p-4">
          <Skeleton className="h-4 w-24" />
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-3 w-full" />
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

// Recharts entra num chunk separado, carregado sob demanda
const SecaoGraficos = dynamic(
  () => import("./secao-graficos").then((m) => m.SecaoGraficos),
  { ssr: false, loading: () => <SkeletonGraficos /> }
);

function fmtDias(v: number | null) {
  return v === null
    ? "—"
    : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} d`;
}

function fmtHoras(v: number | null) {
  return v === null
    ? "—"
    : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} h`;
}

export function DashboardClient() {
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIAIS);

  const catalogos = useCatalogos();
  const cameras = useCamerasDashboard();
  const ocorrencias = useOcorrenciasDashboard();

  const carregando = cameras.isPending || ocorrencias.isPending;
  const atualizando =
    !carregando && (cameras.isFetching || ocorrencias.isFetching);
  const erro = cameras.error ?? ocorrencias.error ?? catalogos.error;

  const dados = useMemo(
    () => aplicarFiltros(cameras.data ?? [], ocorrencias.data ?? [], filtros),
    [cameras.data, ocorrencias.data, filtros]
  );

  const kpis = useMemo(() => calcularKpis(dados), [dados]);

  const graficos = useMemo(
    () => ({
      statusPizza: statusCamerasPizza(dados.cameras),
      porPredio: ocorrenciasPorPredio(dados.ocorrencias),
      topLocais: topLocais(dados.ocorrencias),
      evolucao: evolucaoMensal(dados),
      disponibilidade: disponibilidadeMensal(dados),
      fabricantes: rankingFabricantes(dados.ocorrencias, dados.cameras),
      empresas: rankingEmpresas(dados.ocorrencias),
      alertas: calcularAlertas(dados),
    }),
    [dados]
  );

  const rankings = useMemo(
    () => ({
      locais: topLocais(dados.ocorrencias, 10),
      cameras: rankingCameras(dados.ocorrencias, 10),
      fabricantes: rankingFabricantes(dados.ocorrencias, dados.cameras),
      defeitos: rankingDefeitos(dados.ocorrencias),
      empresas: rankingEmpresas(dados.ocorrencias),
    }),
    [dados]
  );

  const pctParque = (n: number) =>
    kpis.totalCameras > 0
      ? `${Math.round((n / kpis.totalCameras) * 100)}% do parque`
      : undefined;

  const bancoVazio =
    !carregando &&
    !erro &&
    (cameras.data?.length ?? 0) === 0 &&
    (ocorrencias.data?.length ?? 0) === 0;

  if (erro) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed py-24 text-center">
        <Database className="size-10 text-muted-foreground" />
        <div>
          <p className="font-medium">Não foi possível carregar os dados</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
            {erro.message.includes("schema cache")
              ? "O schema do banco ainda não foi aplicado no Supabase. Rode a migração (instruções no README) e recarregue."
              : erro.message}
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            cameras.refetch();
            ocorrencias.refetch();
            catalogos.refetch();
          }}
        >
          <RefreshCw className="size-4" />
          Tentar novamente
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 duration-500 animate-in fade-in">
      {/* Cabeçalho + filtros globais */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Situação do parque de câmeras em tempo real
          </p>
        </div>
        <FiltrosDashboard
          filtros={filtros}
          catalogos={catalogos.data}
          onChange={setFiltros}
        />
      </div>

      {bancoVazio && (
        <div className="flex items-start gap-3 rounded-xl border border-warning/30 bg-warning/5 p-4 text-sm">
          <Database className="mt-0.5 size-4 shrink-0 text-warning" />
          <p className="text-muted-foreground">
            O banco ainda não tem câmeras nem ocorrências cadastradas. Todos os
            indicadores abaixo estão ligados às consultas reais e vão ganhar
            vida quando o schema for aplicado e os dados da planilha forem
            migrados (Fase 1).
          </p>
        </div>
      )}

      {/* KPIs — linha hero (ação imediata) + linha secundária (visão geral) */}
      {carregando ? (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <KpiCardSkeleton key={i} destaque />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-9">
            {Array.from({ length: 9 }).map((_, i) => (
              <KpiCardSkeleton key={i} />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="textura-pontos grid grid-cols-1 gap-3 rounded-lg p-1 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              destaque
              titulo="Disponibilidade"
              valor={
                kpis.disponibilidadePct !== null
                  ? fmtPct(kpis.disponibilidadePct)
                  : "—"
              }
              icone={Gauge}
              tom="info"
              atualizando={atualizando}
              href="/executivo"
              ajuda="% de câmeras operantes sobre o total ativo — clique para o relatório detalhado"
            />
            <KpiCard
              destaque
              titulo="Inoperantes"
              valor={fmtNumero.format(kpis.inoperantes)}
              icone={AlertTriangle}
              tom="perigo"
              percentual={pctParque(kpis.inoperantes)}
              atualizando={atualizando}
              href="/cameras?status=inoperante,desligada"
              ajuda="Câmeras inoperantes ou desligadas — clique para ver a lista e priorizar o atendimento"
            />
            <KpiCard
              destaque
              titulo="OS vencidas"
              valor={fmtNumero.format(kpis.osVencidas)}
              icone={TimerOff}
              tom={kpis.osVencidas > 0 ? "perigo" : "neutro"}
              atualizando={atualizando}
              href="/ocorrencias?vencidas=1"
              ajuda="OS abertas que já passaram do prazo de SLA definido para a prioridade"
            />
            <KpiCard
              destaque
              titulo="Aguardando aceite"
              valor={fmtNumero.format(kpis.osAguardandoAceite)}
              icone={ShieldQuestion}
              tom={kpis.osAguardandoAceite > 0 ? "alerta" : "neutro"}
              atualizando={atualizando}
              href="/ocorrencias?status=aguardando_aceite"
              ajuda="Empresa contratada já concluiu o reparo — falta o Operador CFTC confirmar"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-9">
            <KpiCard
              titulo="Total de câmeras"
              valor={fmtNumero.format(kpis.totalCameras)}
              icone={Cctv}
              tom="neutro"
              atualizando={atualizando}
              href="/cameras"
              ajuda="Total de câmeras cadastradas no circuito"
            />
            <KpiCard
              titulo="Operantes"
              valor={fmtNumero.format(kpis.operantes)}
              icone={Activity}
              tom="sucesso"
              percentual={pctParque(kpis.operantes)}
              atualizando={atualizando}
              href="/cameras?status=operante"
              ajuda="Câmeras funcionando normalmente — clique para ver a lista"
            />
            <KpiCard
              titulo="Degradadas"
              valor={fmtNumero.format(kpis.degradadas)}
              icone={CircleAlert}
              tom="alerta"
              percentual={pctParque(kpis.degradadas)}
              atualizando={atualizando}
              href="/cameras?status=degradada"
              ajuda="Câmeras no ar, mas com defeito que compromete imagem ou sinal"
            />
            <KpiCard
              titulo="Em manutenção"
              valor={fmtNumero.format(kpis.emManutencao)}
              icone={Wrench}
              tom="alerta"
              percentual={pctParque(kpis.emManutencao)}
              atualizando={atualizando}
              href="/cameras?status=em_manutencao"
              ajuda="Câmeras com técnico já em atendimento"
            />
            <KpiCard
              titulo="OS abertas"
              valor={fmtNumero.format(kpis.osAbertas)}
              icone={ClipboardList}
              tom="info"
              atualizando={atualizando}
              href="/ocorrencias?aberta=1"
              ajuda="Ordens de serviço ainda não concluídas nem canceladas"
            />
            <KpiCard
              titulo="Tempo médio de reparo"
              valor={fmtDias(kpis.mttrDias)}
              icone={Timer}
              tom="neutro"
              delta={
                kpis.mttrDias !== null
                  ? {
                      atual: kpis.mttrDias,
                      anterior: kpis.mttrDiasAnterior,
                      subirEBom: false,
                    }
                  : undefined
              }
              atualizando={atualizando}
              ajuda="MTTR: tempo médio entre abertura e conclusão da OS, no período filtrado"
            />
            <KpiCard
              titulo="Tempo médio de atendimento"
              valor={fmtHoras(kpis.tmaHoras)}
              icone={Clock}
              tom="neutro"
              delta={
                kpis.tmaHoras !== null
                  ? {
                      atual: kpis.tmaHoras,
                      anterior: kpis.tmaHorasAnterior,
                      subirEBom: false,
                    }
                  : undefined
              }
              atualizando={atualizando}
              ajuda="Tempo médio entre a abertura da OS e a primeira resposta registrada"
            />
            <KpiCard
              titulo="Novas falhas"
              valor={fmtNumero.format(kpis.novasFalhas)}
              icone={TrendingUp}
              tom="perigo"
              delta={{
                atual: kpis.novasFalhas,
                anterior: kpis.novasFalhasAnterior,
                subirEBom: false,
              }}
              atualizando={atualizando}
              href="/ocorrencias"
              ajuda="Ocorrências abertas dentro do período filtrado"
            />
            <KpiCard
              titulo="Recuperadas no período"
              valor={fmtNumero.format(kpis.recuperadas)}
              icone={CheckCheck}
              tom="sucesso"
              delta={{
                atual: kpis.recuperadas,
                anterior: kpis.recuperadasAnterior,
                subirEBom: true,
              }}
              atualizando={atualizando}
              href="/ocorrencias?status=concluida"
              ajuda="Ocorrências concluídas dentro do período filtrado"
            />
          </div>
        </div>
      )}

      {/* Gráficos + alertas */}
      {carregando ? (
        <SkeletonGraficos />
      ) : (
        <SecaoGraficos dados={graficos} atualizando={atualizando} />
      )}

      {/* Mapa de calor por local */}
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-heading text-lg font-semibold tracking-tight">
            Câmeras por Local
          </h2>
          <p className="text-sm text-muted-foreground">
            Disponibilidade por prédio — normal ≥95%, atenção ≥85%, crítico
            &lt;85%
          </p>
        </div>
        {carregando ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : (
          <HeatmapLocais
            blocos={camerasPorGrupo(dados.cameras)}
            atualizando={atualizando}
          />
        )}
      </section>

      {/* Últimas ocorrências + rankings */}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          {carregando ? (
            <Skeleton className="h-96 rounded-xl" />
          ) : (
            <TabelaUltimasOcorrencias
              ocorrencias={dados.ocorrencias}
              atualizando={atualizando}
            />
          )}
        </div>
        {carregando ? (
          <Skeleton className="h-96 rounded-xl" />
        ) : (
          <RankingsDashboard rankings={rankings} atualizando={atualizando} />
        )}
      </div>
    </div>
  );
}
