"use client";

import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, Loader2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  aplicarImportacaoRelatorios,
  avaliarLinhasRelatorio,
  baixarModeloRelatorios,
  CAMPO_RELATORIO_LABEL,
  lerArquivoRelatorios,
  type ArquivoRelatoriosLido,
  type LinhaRelatorioAvaliada,
  type RelatorioImportacaoRelatorios,
} from "@/services/importador-relatorios-ocorrencia";
import { hooksLocais, hooksPredios } from "@/hooks/use-cadastros";
import { hooksSolicitantes } from "@/hooks/use-cadastros-relatorios-ocorrencia";
import { useTenant } from "@/components/tenant-branding";
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

type Estado =
  | { tipo: "escolher" }
  | { tipo: "preview"; arquivo: ArquivoRelatoriosLido; linhas: LinhaRelatorioAvaliada[] }
  | { tipo: "aplicando" }
  | { tipo: "relatorio"; relatorio: RelatorioImportacaoRelatorios };

function CardResumo({ valor, rotulo }: { valor: number; rotulo: string }) {
  return (
    <div className="rounded-lg border p-3 text-center">
      <p className="text-2xl font-semibold">{valor}</p>
      <p className="text-xs text-muted-foreground">{rotulo}</p>
    </div>
  );
}

async function buscarChavesExistentes(): Promise<Set<string>> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("relatorios_ocorrencia")
    .select("import_chave")
    .not("import_chave", "is", null);
  if (error) throw error;
  return new Set((data ?? []).map((r) => r.import_chave as string));
}

export function DialogoImportarRelatorios({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const tenant = useTenant();
  const inputRef = useRef<HTMLInputElement>(null);
  const [estado, setEstado] = useState<Estado>({ tipo: "escolher" });

  const { data: locais } = hooksLocais.useListar();
  const { data: predios } = hooksPredios.useListar();
  const { data: solicitantes } = hooksSolicitantes.useListar();

  function fechar(open: boolean) {
    if (!open) setEstado({ tipo: "escolher" });
    onOpenChange(open);
  }

  async function selecionarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    e.target.value = "";
    if (!arquivo) return;
    try {
      const lido = await lerArquivoRelatorios(arquivo);
      if (!lido.linhas.length) {
        toast.error(
          "Nenhuma coluna de descrição (Novidade) foi reconhecida — verifique o cabeçalho da planilha"
        );
        return;
      }
      const chaves = await buscarChavesExistentes();
      const avaliadas = avaliarLinhasRelatorio(lido.linhas, chaves);
      setEstado({ tipo: "preview", arquivo: lido, linhas: avaliadas });
    } catch (err) {
      toast.error("Não foi possível ler o arquivo", {
        description: (err as Error).message,
      });
    }
  }

  async function confirmar() {
    if (estado.tipo !== "preview" || !tenant) return;
    setEstado({ tipo: "aplicando" });
    const relatorio = await aplicarImportacaoRelatorios(
      estado.linhas,
      tenant.id,
      inputRef.current?.files?.[0]?.name ?? "planilha.xlsx",
      {
        locais: [...(locais ?? [])],
        predioPadraoId: predios?.[0]?.id ?? null,
        solicitantes: [...(solicitantes ?? [])],
      }
    );
    queryClient.invalidateQueries({ queryKey: ["relatorios_ocorrencia"] });
    queryClient.invalidateQueries({ queryKey: ["locais"] });
    queryClient.invalidateQueries({ queryKey: ["solicitantes"] });
    setEstado({ tipo: "relatorio", relatorio });
  }

  const linhasPreview = estado.tipo === "preview" ? estado.linhas : [];
  const totalErros = linhasPreview.filter((l) => l.acao === "erro").length;
  const totalAvisos = linhasPreview.reduce((soma, l) => soma + l.avisos.length, 0);
  const totalNovas = linhasPreview.filter((l) => l.acao === "nova").length;
  const totalAtualiza = linhasPreview.filter((l) => l.acao === "atualiza").length;

  return (
    <Dialog open={open} onOpenChange={fechar}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Importar planilha de relatórios de ocorrências</DialogTitle>
        </DialogHeader>

        {estado.tipo === "escolher" && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Envie uma planilha Excel (.xlsx) com o histórico de ocorrências da CMAL.
              Reconhece automaticamente os layouts de coluna já usados nos registros
              anteriores (Ocorrência, Operador, Data do Fato, Local do Fato, Data da
              Solicitação, Solicitante, Câmera, Novidade, Resultados, Providências
              etc.). Local e Solicitante ausentes são cadastrados automaticamente;
              reimportar a mesma planilha atualiza os registros já importados em vez
              de duplicar. Apenas linhas sem a descrição do fato (Novidade) são
              rejeitadas.
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => baixarModeloRelatorios()}>
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
              <Badge variant="outline">{totalNovas} nova(s)</Badge>
              {totalAtualiza > 0 && (
                <Badge variant="outline" className="border-[var(--chart-1)]/20 bg-[var(--chart-1)]/10 text-[var(--chart-1)]">
                  {totalAtualiza} já importada(s) — será(ão) atualizada(s)
                </Badge>
              )}
              {totalAvisos > 0 && (
                <Badge variant="outline" className="border-warning/20 bg-warning/10 text-warning">
                  {totalAvisos} aviso(s)
                </Badge>
              )}
              {totalErros > 0 && (
                <Badge variant="outline" className="border-destructive/20 bg-destructive/10 text-destructive">
                  {totalErros} erro(s)
                </Badge>
              )}
            </div>

            {estado.arquivo.cabecalhoOriginal.length > 0 && (
              <div className="text-xs text-muted-foreground">
                Colunas reconhecidas:{" "}
                {estado.arquivo.cabecalhoOriginal
                  .map((c, i) => {
                    const campo = estado.arquivo.mapeamento[i];
                    return campo && campo !== "ignorar"
                      ? `"${c}" → ${CAMPO_RELATORIO_LABEL[campo]}`
                      : null;
                  })
                  .filter(Boolean)
                  .join(" · ")}
              </div>
            )}

            <div className="max-h-80 overflow-auto rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Linha</TableHead>
                    <TableHead>Data do fato</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Descrição</TableHead>
                    <TableHead>Ação</TableHead>
                    <TableHead>Avisos</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {linhasPreview.map((l) => (
                    <TableRow key={`${l.aba}-${l.linha}`}>
                      <TableCell className="tabular-nums">{l.linha}</TableCell>
                      <TableCell>{l.valores.data_fato || "—"}</TableCell>
                      <TableCell>{l.valores.local_fato || "—"}</TableCell>
                      <TableCell className="max-w-72 truncate" title={l.valores.descricao_fato}>
                        {l.valores.descricao_fato || "—"}
                      </TableCell>
                      <TableCell>
                        {l.acao === "nova" && <Badge variant="outline">Nova</Badge>}
                        {l.acao === "atualiza" && (
                          <Badge variant="outline" className="border-[var(--chart-1)]/20 bg-[var(--chart-1)]/10 text-[var(--chart-1)]">
                            Atualiza
                          </Badge>
                        )}
                        {l.acao === "erro" && (
                          <span className="text-xs text-destructive" title={l.erro ?? undefined}>
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

            <DialogFooter>
              <Button variant="outline" onClick={() => setEstado({ tipo: "escolher" })}>
                Cancelar
              </Button>
              <Button onClick={confirmar} disabled={totalNovas + totalAtualiza === 0}>
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
              <CardResumo valor={estado.relatorio.importados} rotulo="Importados" />
              <CardResumo valor={estado.relatorio.atualizados} rotulo="Atualizados" />
              <CardResumo valor={estado.relatorio.locaisCriados} rotulo="Novos locais" />
              <CardResumo valor={estado.relatorio.solicitantesCriados} rotulo="Novos solicitantes" />
              <CardResumo valor={estado.relatorio.avisos.length} rotulo="Avisos" />
              <CardResumo valor={estado.relatorio.erros.length} rotulo="Erros" />
            </div>
            {estado.relatorio.avisos.length > 0 && (
              <div className="rounded-lg border border-warning/20 bg-warning/5 p-3 text-sm">
                <p className="mb-2 font-medium text-warning">{estado.relatorio.avisos.length} aviso(s)</p>
                <ul className="max-h-32 space-y-1 overflow-auto text-xs text-muted-foreground">
                  {estado.relatorio.avisos.map((a, i) => (
                    <li key={i}>Linha {a.linha}: {a.mensagem}</li>
                  ))}
                </ul>
              </div>
            )}
            {estado.relatorio.erros.length > 0 && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm">
                <p className="mb-2 font-medium text-destructive">{estado.relatorio.erros.length} erro(s)</p>
                <ul className="max-h-32 space-y-1 overflow-auto text-xs text-muted-foreground">
                  {estado.relatorio.erros.map((e, i) => (
                    <li key={i}>Linha {e.linha}: {e.motivo}</li>
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
