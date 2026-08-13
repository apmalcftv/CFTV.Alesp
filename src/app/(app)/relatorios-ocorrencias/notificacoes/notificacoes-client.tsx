"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Clock } from "lucide-react";
import { useRelatoriosOcorrencia } from "@/hooks/use-relatorios-ocorrencia";
import { calcularAlertasRelatorio } from "@/services/indicadores-relatorios-ocorrencia";
import type { RelatorioOcorrenciaDetalhe } from "@/services/relatorios-ocorrencia";
import { BadgeStatusRelatorio } from "@/components/relatorios-ocorrencia/badge-status-relatorio";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const fmtData = (v: string | null) =>
  v ? new Date(`${v}T00:00:00`).toLocaleDateString("pt-BR") : "—";

/** Um painel de prazo. Mesmo formato das tabelas clicáveis de
    `/notificacoes` (módulo de Câmeras), para os dois módulos se lerem
    igual. */
function PainelPrazo({
  titulo,
  icone: Icone,
  tomIcone,
  tomData,
  itens,
  vazio,
}: {
  titulo: string;
  icone: typeof AlertTriangle;
  tomIcone: string;
  tomData: string;
  itens: RelatorioOcorrenciaDetalhe[];
  vazio: string;
}) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Icone className={`size-4 ${tomIcone}`} />
          {titulo} ({itens.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        {itens.length === 0 ? (
          <p className="px-6 pb-4 text-sm text-muted-foreground">{vazio}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº</TableHead>
                  <TableHead>Solicitante / Local</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Prazo</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itens.map((r) => (
                  <TableRow
                    key={r.id}
                    className="cursor-pointer"
                    onClick={() => router.push(`/relatorios-ocorrencias/${r.id}`)}
                  >
                    <TableCell className="font-medium">#{r.numero}</TableCell>
                    <TableCell>
                      {r.solicitante?.nome ?? "—"}
                      {r.local ? ` — ${r.local.nome}` : ""}
                    </TableCell>
                    <TableCell>
                      <BadgeStatusRelatorio status={r.status} />
                    </TableCell>
                    <TableCell className={`text-right tabular-nums ${tomData}`}>
                      {fmtData(r.data_limite)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/** Central de prazos do CMAL. Reaproveita `calcularAlertasRelatorio()`,
    que já alimentava o card "Prazos" da listagem — nenhuma regra nova. */
export function NotificacoesCmalClient() {
  const { data: lista, isPending } = useRelatoriosOcorrencia();
  const alertas = useMemo(() => calcularAlertasRelatorio(lista ?? []), [lista]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Notificações CMAL
        </h1>
        <p className="text-sm text-muted-foreground">
          Relatórios de ocorrências com prazo vencido ou próximo do vencimento
        </p>
      </div>

      {isPending ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <PainelPrazo
            titulo="Prazo vencido"
            icone={AlertTriangle}
            tomIcone="text-destructive"
            tomData="text-destructive"
            itens={alertas.prazoVencido}
            vazio="Nenhum relatório com prazo vencido"
          />
          <PainelPrazo
            titulo="Prazo vence em até 3 dias"
            icone={Clock}
            tomIcone="text-warning"
            tomData="text-warning"
            itens={alertas.prazoProximo}
            vazio="Nada próximo do vencimento"
          />
        </div>
      )}
    </div>
  );
}
