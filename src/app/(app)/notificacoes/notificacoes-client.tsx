"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Cctv, Clock, MapPin, ShieldQuestion } from "lucide-react";
import { useCamerasDashboard, useOcorrenciasDashboard } from "@/hooks/use-dashboard";
import {
  FILTROS_INICIAIS,
  aplicarFiltros,
  calcularAlertas,
} from "@/services/indicadores";
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

const fmtDataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export function NotificacoesClient() {
  const router = useRouter();
  const { data: cameras, isPending: pendingCameras } = useCamerasDashboard();
  const { data: ocorrencias, isPending: pendingOcorrencias } = useOcorrenciasDashboard();

  const isPending = pendingCameras || pendingOcorrencias;

  const alertas = useMemo(() => {
    const dados = aplicarFiltros(cameras ?? [], ocorrencias ?? [], FILTROS_INICIAIS);
    return calcularAlertas(dados);
  }, [cameras, ocorrencias]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Notificações
        </h1>
        <p className="text-sm text-muted-foreground">
          Alertas automáticos de SLA vencido, câmeras e locais reincidentes
        </p>
      </div>

      {isPending ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <AlertTriangle className="size-4 text-destructive" />
                OS com SLA vencido ({alertas.osVencidas.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {alertas.osVencidas.length === 0 ? (
                <p className="px-6 pb-4 text-sm text-muted-foreground">
                  Nenhuma OS vencida
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>OS</TableHead>
                      <TableHead>Câmera/Local</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead className="text-right">Venceu em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alertas.osVencidas.map((o) => (
                      <TableRow
                        key={o.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/ocorrencias/${o.id}`)}
                      >
                        <TableCell className="font-medium">#{o.numero}</TableCell>
                        <TableCell>
                          {o.camera ? `Câmera ${o.camera.numero} — ${o.camera.local?.nome ?? "—"}` : "Sistema"}
                        </TableCell>
                        <TableCell>{o.empresa?.nome ?? "—"}</TableCell>
                        <TableCell className="text-right text-destructive tabular-nums">
                          {fmtDataHora.format(new Date(o.sla_vence_em!))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Clock className="size-4 text-warning" />
                SLA vence nas próximas 48h ({alertas.slaProximo.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {alertas.slaProximo.length === 0 ? (
                <p className="px-6 pb-4 text-sm text-muted-foreground">
                  Nada próximo do vencimento
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>OS</TableHead>
                      <TableHead>Câmera/Local</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead className="text-right">Vence em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alertas.slaProximo.map((o) => (
                      <TableRow
                        key={o.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/ocorrencias/${o.id}`)}
                      >
                        <TableCell className="font-medium">#{o.numero}</TableCell>
                        <TableCell>
                          {o.camera ? `Câmera ${o.camera.numero} — ${o.camera.local?.nome ?? "—"}` : "Sistema"}
                        </TableCell>
                        <TableCell>{o.empresa?.nome ?? "—"}</TableCell>
                        <TableCell className="text-right text-warning tabular-nums">
                          {fmtDataHora.format(new Date(o.sla_vence_em!))}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <ShieldQuestion className="size-4 text-warning" />
                OS aguardando aceite ({alertas.aguardandoAceite.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {alertas.aguardandoAceite.length === 0 ? (
                <p className="px-6 pb-4 text-sm text-muted-foreground">
                  Nenhuma OS aguardando aceite
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>OS</TableHead>
                      <TableHead>Câmera/Local</TableHead>
                      <TableHead className="text-right">Empresa</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {alertas.aguardandoAceite.map((o) => (
                      <TableRow
                        key={o.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/ocorrencias/${o.id}`)}
                      >
                        <TableCell className="font-medium">#{o.numero}</TableCell>
                        <TableCell>
                          {o.camera ? `Câmera ${o.camera.numero} — ${o.camera.local?.nome ?? "—"}` : "Sistema"}
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {o.empresa?.nome ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <Cctv className="size-4 text-destructive" />
                Câmeras críticas — 3+ falhas em 12 meses ({alertas.camerasCriticas.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alertas.camerasCriticas.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma câmera reincidente</p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {alertas.camerasCriticas.map((c) => (
                    <li key={c.nome} className="flex items-baseline justify-between">
                      <span className="font-medium">{c.nome}</span>
                      <span className="text-muted-foreground">{c.valor} ocorrências</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm">
                <MapPin className="size-4 text-[var(--chart-1)]" />
                Locais com mais defeitos (12 meses)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {alertas.locaisCriticos.length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem dados de locais</p>
              ) : (
                <ul className="flex flex-col gap-2 text-sm">
                  {alertas.locaisCriticos.map((l) => (
                    <li key={l.nome} className="flex items-baseline justify-between">
                      <span className="truncate font-medium" title={l.nome}>
                        {l.nome}
                      </span>
                      <span className="text-muted-foreground">{l.valor}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
