"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { FileSpreadsheet, Printer } from "lucide-react";
import {
  useCamerasDashboard,
  useCatalogos,
  useOcorrenciasDashboard,
} from "@/hooks/use-dashboard";
import {
  FILTROS_INICIAIS,
  aplicarFiltros,
  type FiltrosDashboard as Filtros,
} from "@/services/indicadores";
import { exportarOcorrenciasExcel } from "@/services/relatorios";
import { useOrdenacao } from "@/hooks/use-ordenacao";
import { FiltrosDashboard } from "@/components/dashboard/filtros-dashboard";
import {
  BadgePrioridade,
  BadgeStatusCamera,
  BadgeStatusOcorrencia,
} from "@/components/dashboard/badges";
import { OCORRENCIA_STATUS_LABEL } from "@/types/domain";
import { Ajuda } from "@/components/ui/ajuda";
import { CabecalhoOrdenavel } from "@/components/ui/cabecalho-ordenavel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const fmtData = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
});

const TODOS_STATUS = "todos";

export function RelatoriosClient() {
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_INICIAIS);
  const [statusOcorrencia, setStatusOcorrencia] = useState<string>(TODOS_STATUS);
  const catalogos = useCatalogos();
  const cameras = useCamerasDashboard();
  const ocorrencias = useOcorrenciasDashboard();

  const carregando = cameras.isPending || ocorrencias.isPending;
  const dados = useMemo(
    () => aplicarFiltros(cameras.data ?? [], ocorrencias.data ?? [], filtros),
    [cameras.data, ocorrencias.data, filtros]
  );
  const ocorrenciasFiltradas = useMemo(
    () =>
      statusOcorrencia === TODOS_STATUS
        ? dados.ocorrencias
        : dados.ocorrencias.filter((o) => o.status === statusOcorrencia),
    [dados.ocorrencias, statusOcorrencia]
  );
  const { ordenacao, alternar: alternarOrdenacao, ordenar } = useOrdenacao();
  const ocorrenciasOrdenadas = useMemo(
    () =>
      ordenar(ocorrenciasFiltradas, {
        numero: (o) => o.numero,
        aberta_em: (o) => o.aberta_em,
        camera: (o) => o.camera?.numero ?? 0,
        defeito: (o) => o.tipo_defeito?.nome ?? "",
        status_camera: (o) => o.camera?.status ?? "",
        empresa: (o) => o.empresa?.nome ?? "",
        status: (o) => o.status,
        prioridade: (o) => o.prioridade,
      }),
    [ocorrenciasFiltradas, ordenar]
  );

  async function exportarExcel() {
    try {
      await exportarOcorrenciasExcel(ocorrenciasFiltradas);
    } catch {
      toast.error("Não foi possível gerar o Excel");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Relatórios
          </h1>
          <p className="text-sm text-muted-foreground">
            Exportação de ocorrências por período, prédio, empresa e defeito
          </p>
        </div>
        <div className="flex gap-2">
          <Ajuda texto="Abre a impressão do navegador — escolha 'Salvar como PDF'">
            <Button variant="outline" onClick={() => window.print()}>
              <Printer className="size-4" />
              PDF
            </Button>
          </Ajuda>
          <Ajuda texto="Baixa a lista filtrada em uma planilha Excel">
            <Button onClick={exportarExcel} disabled={ocorrenciasFiltradas.length === 0}>
              <FileSpreadsheet className="size-4" />
              Excel
            </Button>
          </Ajuda>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FiltrosDashboard
          filtros={filtros}
          catalogos={catalogos.data}
          onChange={setFiltros}
          incluirDesligadaPermanentemente
        />
        <Select value={statusOcorrencia} onValueChange={setStatusOcorrencia}>
          <SelectTrigger size="sm" className="w-full min-w-0 sm:w-auto sm:min-w-40" aria-label="Status da ocorrência">
            <SelectValue placeholder="Status da ocorrência" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS_STATUS}>Todos os status</SelectItem>
            {Object.entries(OCORRENCIA_STATUS_LABEL).map(([v, r]) => (
              <SelectItem key={v} value={v}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div id="area-impressao" className="flex flex-col gap-2">
        <Card>
          <CardContent className="p-0">
            {carregando ? (
              <div className="space-y-2 p-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
            ) : ocorrenciasFiltradas.length === 0 ? (
              <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
                Nenhuma ocorrência no filtro selecionado
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>
                        <CabecalhoOrdenavel chave="numero" rotulo="Nº" ordenacao={ordenacao} onClick={alternarOrdenacao} />
                      </TableHead>
                      <TableHead>
                        <CabecalhoOrdenavel chave="aberta_em" rotulo="Aberta em" ordenacao={ordenacao} onClick={alternarOrdenacao} />
                      </TableHead>
                      <TableHead>
                        <CabecalhoOrdenavel chave="camera" rotulo="Câmera / Local" ordenacao={ordenacao} onClick={alternarOrdenacao} />
                      </TableHead>
                      <TableHead>
                        <CabecalhoOrdenavel chave="defeito" rotulo="Defeito" ordenacao={ordenacao} onClick={alternarOrdenacao} />
                      </TableHead>
                      <TableHead>
                        <CabecalhoOrdenavel chave="status_camera" rotulo="Status da câmera" ordenacao={ordenacao} onClick={alternarOrdenacao} />
                      </TableHead>
                      <TableHead>
                        <CabecalhoOrdenavel chave="empresa" rotulo="Empresa" ordenacao={ordenacao} onClick={alternarOrdenacao} />
                      </TableHead>
                      <TableHead>
                        <CabecalhoOrdenavel chave="status" rotulo="Status da OS" ordenacao={ordenacao} onClick={alternarOrdenacao} />
                      </TableHead>
                      <TableHead>
                        <CabecalhoOrdenavel chave="prioridade" rotulo="Prioridade" ordenacao={ordenacao} onClick={alternarOrdenacao} />
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ocorrenciasOrdenadas.map((o) => (
                      <TableRow key={o.id}>
                        <TableCell className="font-medium">#{o.numero}</TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums">
                          {fmtData.format(new Date(o.aberta_em))}
                        </TableCell>
                        <TableCell>
                          {o.camera
                            ? `Câmera ${o.camera.numero} — ${o.camera.local?.nome ?? "—"}`
                            : "Sistema"}
                        </TableCell>
                        <TableCell>{o.tipo_defeito?.nome ?? "—"}</TableCell>
                        <TableCell>
                          {o.camera ? (
                            <BadgeStatusCamera status={o.camera.status} />
                          ) : (
                            "—"
                          )}
                        </TableCell>
                        <TableCell>{o.empresa?.nome ?? "—"}</TableCell>
                        <TableCell>
                          <BadgeStatusOcorrencia status={o.status} />
                        </TableCell>
                        <TableCell>
                          <BadgePrioridade prioridade={o.prioridade} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
        <p className="text-xs text-muted-foreground">
          {ocorrenciasFiltradas.length} ocorrência(s) no filtro selecionado
        </p>
      </div>
    </div>
  );
}
