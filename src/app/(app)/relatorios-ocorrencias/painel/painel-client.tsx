"use client";

import { useMemo } from "react";
import { Archive, CheckCircle2, Clock, FileSearch, Inbox } from "lucide-react";
import { useRelatoriosOcorrencia } from "@/hooks/use-relatorios-ocorrencia";
import { useTotalExportacoesRelatorio } from "@/hooks/use-dashboard-relatorios-ocorrencia";
import {
  calcularKpisRelatorio,
  porDepartamento,
  porLocal,
  porOperador,
} from "@/services/indicadores-relatorios-ocorrencia";
import { KpiCard, KpiCardSkeleton } from "@/components/dashboard/kpi-card";
import { ListaRanking } from "@/components/relatorios-ocorrencia/lista-ranking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function fmtDias(v: number | null) {
  return v === null ? "—" : `${v.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} d`;
}

/** Visão operacional do módulo CMAL: os mesmos indicadores que já existiam
    no topo de `/relatorios-ocorrencias`, agora com tela própria. Consome
    exclusivamente os hooks e as funções puras que já serviam aquela
    página — nenhum service, hook ou consulta nova. */
export function PainelCmalClient() {
  const { data: lista, isPending } = useRelatoriosOcorrencia();
  const { data: totalExportacoes } = useTotalExportacoesRelatorio();

  const kpis = useMemo(
    () => calcularKpisRelatorio(lista ?? [], totalExportacoes ?? 0),
    [lista, totalExportacoes]
  );
  const rankings = useMemo(
    () => ({
      local: porLocal(lista ?? []),
      departamento: porDepartamento(lista ?? []),
      operador: porOperador(lista ?? []),
    }),
    [lista]
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Dashboard CMAL
        </h1>
        <p className="text-sm text-muted-foreground">
          Situação dos relatórios de ocorrências da Central de Monitoramento
        </p>
      </div>

      {isPending ? (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <KpiCard titulo="Recebidos" valor={String(kpis.recebidos)} icone={Inbox} tom="info" />
          <KpiCard
            titulo="Em análise"
            valor={String(kpis.emAnalise)}
            icone={FileSearch}
            tom="alerta"
          />
          <KpiCard
            titulo="Aguardando informações"
            valor={String(kpis.aguardandoInformacoes)}
            icone={Clock}
            tom="perigo"
          />
          <KpiCard
            titulo="Concluídos"
            valor={String(kpis.concluidos)}
            icone={CheckCircle2}
            tom="sucesso"
          />
          <KpiCard
            titulo="Arquivados"
            valor={String(kpis.arquivados)}
            icone={Archive}
            tom="neutro"
          />
          <KpiCard
            titulo="Tempo médio de conclusão"
            valor={fmtDias(kpis.tempoMedioConclusaoDias)}
            icone={Clock}
            tom="neutro"
            rodape={`${kpis.exportacoesRealizadas} exportações realizadas`}
          />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Solicitações por local</CardTitle>
          </CardHeader>
          <CardContent>
            {isPending ? <Skeleton className="h-40 w-full" /> : <ListaRanking itens={rankings.local} />}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Solicitações por departamento</CardTitle>
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
            <CardTitle className="text-sm">Solicitações por operador</CardTitle>
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
  );
}
