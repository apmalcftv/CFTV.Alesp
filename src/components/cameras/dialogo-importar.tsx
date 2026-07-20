"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Loader2, Upload } from "lucide-react";
import {
  aplicarImportacao,
  avaliarLinhas,
  baixarModeloInventario,
  lerArquivoInventario,
  type LinhaAvaliada,
  type OpcaoDuplicata,
  type RelatorioImportacao,
} from "@/services/importador-cameras";
import { hooksCameras } from "@/hooks/use-cameras";
import {
  hooksFabricantes,
  hooksLocais,
  hooksModelos,
  hooksNvrs,
  hooksPredios,
} from "@/hooks/use-cadastros";
import { CAMERA_STATUS_LABEL } from "@/types/domain";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Estado =
  | { tipo: "escolher" }
  | { tipo: "preview"; linhas: LinhaAvaliada[] }
  | { tipo: "aplicando" }
  | { tipo: "relatorio"; relatorio: RelatorioImportacao };

function CardResumo({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <p className="text-2xl font-semibold">{valor}</p>
      <p className="text-xs text-muted-foreground">{rotulo}</p>
    </div>
  );
}

export function DialogoImportar({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<Estado>({ tipo: "escolher" });
  const [opcaoDuplicata, setOpcaoDuplicata] = useState<OpcaoDuplicata>("atualizar");

  const { data: cameras } = hooksCameras.useListar();
  const { data: locais } = hooksLocais.useListar();
  const { data: fabricantes } = hooksFabricantes.useListar();
  const { data: modelos } = hooksModelos.useListar();
  const { data: nvrs } = hooksNvrs.useListar();
  const { data: predios } = hooksPredios.useListar();

  function fechar(open: boolean) {
    if (!open) setEstado({ tipo: "escolher" });
    onOpenChange(open);
  }

  async function selecionarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    try {
      const linhas = await lerArquivoInventario(arquivo);
      const avaliadas = avaliarLinhas(linhas, cameras ?? [], locais ?? []);
      setEstado({ tipo: "preview", linhas: avaliadas });
    } catch (err) {
      toast.error("Não foi possível ler o arquivo", {
        description: (err as Error).message,
      });
    }
  }

  async function confirmar() {
    if (estado.tipo !== "preview") return;
    setEstado({ tipo: "aplicando" });
    const relatorio = await aplicarImportacao(estado.linhas, opcaoDuplicata, {
      fabricantes: [...(fabricantes ?? [])],
      modelos: [...(modelos ?? [])],
      nvrs: [...(nvrs ?? [])],
      locais: [...(locais ?? [])],
      predioPadraoId: predios?.[0]?.id ?? null,
    });
    queryClient.invalidateQueries({ queryKey: ["cameras"] });
    queryClient.invalidateQueries({ queryKey: ["locais"] });
    queryClient.invalidateQueries({ queryKey: ["fabricantes"] });
    queryClient.invalidateQueries({ queryKey: ["modelos_camera"] });
    queryClient.invalidateQueries({ queryKey: ["nvrs"] });
    setEstado({ tipo: "relatorio", relatorio });
  }

  const linhasPreview = estado.tipo === "preview" ? estado.linhas : [];
  const temDuplicadas = linhasPreview.some((l) => l.acao === "duplicada");
  const totalErros = linhasPreview.filter((l) => l.acao === "erro").length;
  const totalAvisos = linhasPreview.reduce((soma, l) => soma + l.avisos.length, 0);
  const totalValidas = linhasPreview.length - totalErros;

  return (
    <Dialog open={open} onOpenChange={fechar}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar inventário de câmeras</DialogTitle>
        </DialogHeader>

        {estado.tipo === "escolher" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Envie uma planilha Excel ou CSV com as colunas IP, Local,
              Patrimônio, Fabricante, Modelo, NVR, Observações e Status. A
              câmera é calculada automaticamente a partir do último octeto do
              IP. Cadastros auxiliares que ainda não existirem (local,
              fabricante, modelo, NVR) são criados automaticamente e status
              não reconhecido vira &quot;Operante&quot; — só IP inválido ou
              duplicado precisa de decisão.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => baixarModeloInventario()}>
                <Download className="size-4" />
                Baixar modelo
              </Button>
              <Button onClick={() => inputRef.current?.click()}>
                <Upload className="size-4" />
                Selecionar arquivo
              </Button>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={selecionarArquivo}
              />
            </div>
          </div>
        )}

        {estado.tipo === "preview" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Badge variant="outline">{totalValidas} válida(s)</Badge>
              {temDuplicadas && (
                <Badge variant="outline" className="border-warning/20 bg-warning/10 text-warning">
                  {linhasPreview.filter((l) => l.acao === "duplicada").length} duplicada(s)
                </Badge>
              )}
              {totalAvisos > 0 && (
                <Badge variant="outline" className="border-[var(--chart-1)]/20 bg-[var(--chart-1)]/10 text-[var(--chart-1)]">
                  {totalAvisos} aviso(s)
                </Badge>
              )}
              {totalErros > 0 && (
                <Badge variant="outline" className="border-destructive/20 bg-destructive/10 text-destructive">
                  {totalErros} erro(s)
                </Badge>
              )}
            </div>

            <div className="max-h-80 overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Linha</TableHead>
                    <TableHead>Câmera</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Avisos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linhasPreview.map((l) => (
                    <TableRow key={l.linha}>
                      <TableCell className="tabular-nums">{l.linha}</TableCell>
                      <TableCell>{l.numero !== null ? `Câmera ${l.numero}` : l.ip || "—"}</TableCell>
                      <TableCell>{l.local || "—"}</TableCell>
                      <TableCell>{CAMERA_STATUS_LABEL[l.statusResolvido]}</TableCell>
                      <TableCell>
                        {l.acao === "nova" && <Badge variant="outline">Nova</Badge>}
                        {l.acao === "duplicada" && (
                          <Badge variant="outline" className="border-warning/20 bg-warning/10 text-warning">
                            Duplicada
                          </Badge>
                        )}
                        {l.acao === "erro" && (
                          <span
                            className="text-xs text-destructive"
                            title={l.erro ?? undefined}
                          >
                            Erro: {l.erro}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="max-w-56 text-xs text-muted-foreground">
                        {l.avisos.join("; ") || "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {temDuplicadas && (
              <div className="flex items-center gap-3">
                <span className="text-sm">IPs já cadastrados:</span>
                <Select
                  value={opcaoDuplicata}
                  onValueChange={(v) => setOpcaoDuplicata(v as OpcaoDuplicata)}
                >
                  <SelectTrigger size="sm" className="w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="atualizar">Atualizar cadastro existente</SelectItem>
                    <SelectItem value="duplicar">Criar duplicado mesmo assim</SelectItem>
                    <SelectItem value="ignorar">Ignorar duplicadas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setEstado({ tipo: "escolher" })}>
                Cancelar
              </Button>
              <Button onClick={confirmar} disabled={totalValidas === 0}>
                Confirmar importação
              </Button>
            </DialogFooter>
          </div>
        )}

        {estado.tipo === "aplicando" && (
          <div className="flex h-32 items-center justify-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Importando…
          </div>
        )}

        {estado.tipo === "relatorio" && (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
              <CardResumo valor={estado.relatorio.importadas} rotulo="Câmeras importadas" />
              <CardResumo valor={estado.relatorio.atualizadas} rotulo="Câmeras atualizadas" />
              <CardResumo valor={estado.relatorio.ignoradas} rotulo="Ignoradas" />
              <CardResumo valor={estado.relatorio.locaisCriados} rotulo="Novos locais" />
              <CardResumo valor={estado.relatorio.fabricantesCriados} rotulo="Novos fabricantes" />
              <CardResumo valor={estado.relatorio.modelosCriados} rotulo="Novos modelos" />
              <CardResumo valor={estado.relatorio.nvrsCriados} rotulo="Novos NVRs" />
              <CardResumo valor={estado.relatorio.avisos.length} rotulo="Avisos" />
              <CardResumo valor={estado.relatorio.erros.length} rotulo="Erros" />
            </div>
            {estado.relatorio.avisos.length > 0 && (
              <div className="rounded-lg border border-[var(--chart-1)]/20 bg-[var(--chart-1)]/5 p-3 text-sm">
                <p className="mb-2 font-medium text-[var(--chart-1)]">
                  {estado.relatorio.avisos.length} aviso(s)
                </p>
                <ul className="max-h-32 space-y-1 overflow-auto text-xs text-muted-foreground">
                  {estado.relatorio.avisos.map((a, i) => (
                    <li key={i}>
                      Linha {a.linha}: {a.mensagem}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {estado.relatorio.erros.length > 0 && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm">
                <p className="mb-2 font-medium text-destructive">
                  {estado.relatorio.erros.length} erro(s)
                </p>
                <ul className="max-h-32 space-y-1 overflow-auto text-xs text-muted-foreground">
                  {estado.relatorio.erros.map((e, i) => (
                    <li key={i}>
                      Linha {e.linha}: {e.motivo}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => fechar(false)}>Concluir</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
