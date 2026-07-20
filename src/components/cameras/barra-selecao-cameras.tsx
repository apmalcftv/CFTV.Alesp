"use client";

import { useState, type ComponentType } from "react";
import { Building2, Factory, MapPin, Tag, Trash2, X } from "lucide-react";
import { hooksCameras } from "@/hooks/use-cameras";
import type { Camera } from "@/types/domain";
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
}: {
  selecionadas: Camera[];
  limpar: () => void;
  opcoesStatus: Opcao[];
  opcoesEmpresa: Opcao[];
  opcoesModelo: Opcao[];
  opcoesLocal: Opcao[];
}) {
  const atualizarVarios = hooksCameras.useAtualizarVarios();
  const excluirVarios = hooksCameras.useExcluirVarios();
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);
  const ids = selecionadas.map((c) => c.id);

  function aplicar(campo: keyof Camera, valor: string) {
    atualizarVarios.mutate(
      { ids, valores: { [campo]: valor } as Partial<Camera> },
      { onSuccess: limpar }
    );
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
