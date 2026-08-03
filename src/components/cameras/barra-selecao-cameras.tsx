"use client";

import { useState, type ComponentType } from "react";
import {
  Building2,
  Factory,
  FileDown,
  MapPin,
  Printer,
  Share2,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { hooksCameras } from "@/hooks/use-cameras";
import type { Camera } from "@/types/domain";
import {
  MIME_EXCEL,
  exportarCamerasExcel,
  gerarBlobCamerasExcel,
  linhasCamerasExport,
  type CatalogosCamera,
} from "@/services/exportar-cameras";
import { compartilharArquivo } from "@/services/compartilhamento";
import { Ajuda } from "@/components/ui/ajuda";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Opcao {
  valor: string;
  rotulo: string;
}

function AcaoEmMassa({
  titulo,
  icone: Icone,
  opcoes,
  aoAplicar,
  aplicando,
}: {
  titulo: string;
  icone: ComponentType<{ className?: string }>;
  opcoes: Opcao[];
  aoAplicar: (valor: string) => void;
  aplicando: boolean;
}) {
  const [aberto, setAberto] = useState(false);
  const [valor, setValor] = useState("");

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Icone className="size-4" />
          {titulo}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
        </DialogHeader>
        <Select value={valor} onValueChange={setValor}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            {opcoes.map((o) => (
              <SelectItem key={o.valor} value={o.valor}>
                {o.rotulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter>
          <Button
            disabled={!valor || aplicando}
            onClick={() => {
              aoAplicar(valor);
              setAberto(false);
              setValor("");
            }}
          >
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Barra de ação em massa da tela de Câmeras — só aparece quando há
    seleção (renderizada pelo `PaginaCrud` via prop `selecaoMassa`). */
export function BarraSelecaoCameras({
  selecionadas,
  limpar,
  opcoesStatus,
  opcoesEmpresa,
  opcoesModelo,
  opcoesLocal,
  catalogos,
}: {
  selecionadas: Camera[];
  limpar: () => void;
  opcoesStatus: Opcao[];
  opcoesEmpresa: Opcao[];
  opcoesModelo: Opcao[];
  opcoesLocal: Opcao[];
  /** Catálogos já carregados pela tela — a exportação resolve nomes a
      partir deles, sem nenhuma consulta nova ao banco. */
  catalogos: CatalogosCamera;
}) {
  const atualizarVarios = hooksCameras.useAtualizarVarios();
  const excluirVarios = hooksCameras.useExcluirVarios();
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const [exportando, setExportando] = useState(false);
  const ids = selecionadas.map((c) => c.id);

  function aplicar(campo: keyof Camera, valor: string) {
    atualizarVarios.mutate(
      { ids, valores: { [campo]: valor } as Partial<Camera> },
      { onSuccess: limpar }
    );
  }

  /** A barra só é renderizada com seleção > 0, mas a guarda cobre o caso de
      a seleção ser esvaziada entre o render e o clique. */
  function semSelecao() {
    if (selecionadas.length > 0) return false;
    toast.error("Selecione pelo menos uma câmera para exportar.");
    return true;
  }

  /** `selecionadas` já chega filtrada e ordenada igual à tabela (ver
      `selecionadosObjs` em PaginaCrud) — nada a reordenar aqui. */
  function linhas() {
    return linhasCamerasExport(selecionadas, catalogos);
  }

  function exportarPdf() {
    if (semSelecao()) return;
    // O bloco #area-impressao já está montado com esta mesma seleção
    // (AreaImpressaoCameras, renderizada ao lado desta barra).
    window.print();
    toast.success(
      `${selecionadas.length} câmera(s) exportada(s) em PDF`
    );
  }

  async function exportarExcel() {
    if (semSelecao()) return;
    setExportando(true);
    try {
      await exportarCamerasExcel(linhas());
      toast.success(`${selecionadas.length} câmera(s) exportada(s) em Excel`);
    } catch (e) {
      toast.error("Não foi possível gerar o Excel", {
        description: (e as Error).message,
      });
    } finally {
      setExportando(false);
    }
  }

  async function compartilhar() {
    if (semSelecao()) return;
    setExportando(true);
    try {
      const blob = await gerarBlobCamerasExcel(linhas());
      await compartilharArquivo(blob, "inventario-cameras.xlsx", MIME_EXCEL);
      toast.success(`${selecionadas.length} câmera(s) compartilhada(s) em Excel`);
    } catch (e) {
      toast.error("Não foi possível compartilhar o inventário", {
        description: (e as Error).message,
      });
    } finally {
      setExportando(false);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-3">
      <span className="text-sm font-medium">
        {selecionadas.length} câmera(s) selecionada(s)
      </span>
      <Button variant="ghost" size="sm" onClick={limpar}>
        <X className="size-4" />
        Limpar seleção
      </Button>
      <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
        <AcaoEmMassa
          titulo="Alterar status"
          icone={Tag}
          opcoes={opcoesStatus}
          aplicando={atualizarVarios.isPending}
          aoAplicar={(v) => aplicar("status", v)}
        />
        <AcaoEmMassa
          titulo="Alterar empresa"
          icone={Building2}
          opcoes={opcoesEmpresa}
          aplicando={atualizarVarios.isPending}
          aoAplicar={(v) => aplicar("empresa_id", v)}
        />
        <AcaoEmMassa
          titulo="Alterar modelo"
          icone={Factory}
          opcoes={opcoesModelo}
          aplicando={atualizarVarios.isPending}
          aoAplicar={(v) => aplicar("modelo_id", v)}
        />
        <AcaoEmMassa
          titulo="Alterar local"
          icone={MapPin}
          opcoes={opcoesLocal}
          aplicando={atualizarVarios.isPending}
          aoAplicar={(v) => aplicar("local_id", v)}
        />

        <Ajuda texto="Gerar o PDF apenas das câmeras selecionadas, com resumo executivo">
          <Button variant="outline" size="sm" onClick={exportarPdf}>
            <Printer className="size-4" />
            Exportar PDF
          </Button>
        </Ajuda>
        <Ajuda texto="Baixar as câmeras selecionadas em planilha Excel">
          <Button
            variant="outline"
            size="sm"
            onClick={exportarExcel}
            disabled={exportando}
          >
            <FileDown className="size-4" />
            Exportar Excel
          </Button>
        </Ajuda>
        <Ajuda texto="Compartilhar a planilha das câmeras selecionadas">
          <Button
            variant="outline"
            size="sm"
            onClick={compartilhar}
            disabled={exportando}
          >
            <Share2 className="size-4" />
            Compartilhar
          </Button>
        </Ajuda>

        <AlertDialog open={confirmarExclusao} onOpenChange={setConfirmarExclusao}>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="size-4" />
              Excluir selecionadas
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Excluir {selecionadas.length} câmera(s)?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação não pode ser desfeita. Se alguma câmera selecionada
                tiver ocorrências vinculadas, a exclusão de todo o lote será
                bloqueada.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() =>
                  excluirVarios.mutate(ids, {
                    onSuccess: () => {
                      limpar();
                      setConfirmarExclusao(false);
                    },
                  })
                }
              >
                Excluir
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
