"use client";

import { useMemo } from "react";
import dynamic from "next/dynamic";
import { AlertTriangle, CheckCircle2, Clock, Printer } from "lucide-react";
import { useRelatoriosOcorrencia } from "@/hooks/use-relatorios-ocorrencia";
import { useTotalExportacoesRelatorio } from "@/hooks/use-dashboard-relatorios-ocorrencia";
import {
  calcularAlertasRelatorio,
  calcularKpisRelatorio,
  porDepartamento,
  porMes,
  porOperador,
} from "@/services/indicadores-relatorios-ocorrencia";
import { KpiCard, KpiCardSkeleton } from "@/components/dashboard/kpi-card";
import { ListaRanking } from "@/components/relatorios-ocorrencia/lista-ranking";
import { Ajuda } from "@/components/ui/ajuda";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// Mesmo tratamento do dashboard de Câmeras: Recharts fora do bundle
// inicial, sem SSR.
const GraficoBarras = dynamic(
  () => import("@/components/charts/grafico-barras").then((m) => m.GraficoBarras),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> }
);

function fmtDias(v: number | null) {
  return v === null ? "—" : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} d`;
}

/** Visão gerencial do módulo CMAL. Montada exclusivamente sobre as funções
    puras que já existiam em `indicadores-relatorios-ocorrencia.ts` —
    nenhum indicador novo foi criado, nenhum service ou hook alterado.
    `porMes()` já era calculado no módulo e nunca chegava à tela; aqui ele
    finalmente aparece. */
export function ExecutivoCmalClient() {
  const { data: lista, isPending } = useRelatoriosOcorrencia();
  const { data: totalExportacoes } = useTotalExportacoesRelatorio();

  const kpis = useMemo(
    () => calcularKpisRelatorio(lista ?? [], totalExportacoes ?? 0),
    [lista, totalExportacoes]
  );
  const alertas = useMemo(() => calcularAlertasRelatorio(lista ?? []), [lista]);
  const evolucao = useMemo(() => porMes(lista ?? []), [lista]);
  const rankings = useMemo(
    () => ({
      departamento: porDepartamento(lista ?? []),
      operador: porOperador(lista ?? []),
    }),
    [lista]
  );

  const emAberto = kpis.recebidos + kpis.emAnalise + kpis.aguardandoInformacoes;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Executivo CMAL
          </h1>
          <p className="text-sm text-muted-foreground">
            Indicadores estratégicos dos relatórios de ocorrências
          </p>
        </div>
        <Ajuda texto="Abre a impressão do navegador — escolha 'Salvar como PDF'">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="size-4" />
            PDF
          </Button>
        </Ajuda>
      </div>

      <div id="area-impressao" className="flex flex-col gap-6">
        {isPending ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <KpiCardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              titulo="Em aberto"
              valor={String(emAberto)}
              icone={Clock}
              tom="alerta"
              rodape="Recebidos, em análise e aguardando informações"
            />
            <KpiCard
              titulo="Concluídos"
              valor={String(kpis.concluidos)}
              icone={CheckCircle2}
              tom="sucesso"
            />
            <KpiCard
              titulo="Tempo médio de conclusão"
              valor={fmtDias(kpis.tempoMedioConclusaoDias)}
              icone={Clock}
              tom="neutro"
            />
            <KpiCard
              titulo="Prazo vencido"
              valor={String(alertas.prazoVencido.length)}
              icone={AlertTriangle}
              tom="perigo"
              rodape={`${alertas.prazoProximo.length} vencem em até 3 dias`}
            />
          </div>
        )}

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Solicitações por mês (12 meses)</CardTitle>
          </CardHeader>
          <CardContent>
            {isPending ? (
              <Skeleton className="h-64 w-full" />
            ) : (
              <GraficoBarras dados={evolucao} nomeSerie="Solicitações" />
            )}
          </CardContent>
        </Card>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Departamentos solicitantes</CardTitle>
            </CardHeader>
            <CardContent>
              {isPending ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <ListaRanking itens={rankings.departamento} />
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Carga por operador</CardTitle>
            </CardHeader>
            <CardContent>
              {isPending ? (
                <Skeleton className="h-40 w-full" />
              ) : (
                <ListaRanking itens={rankings.operador} />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
