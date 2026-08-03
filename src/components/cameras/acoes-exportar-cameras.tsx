"use client";

import { useState, type ReactNode } from "react";
import { FileDown, Printer, Share2 } from "lucide-react";
import { toast } from "sonner";
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

const AVISO_SEM_SELECAO = "Selecione pelo menos uma câmera para exportar.";

/** `disabled:pointer-events-none` do Button impede o Radix Tooltip de
    disparar no hover — o span intermediário recebe o evento no lugar e
    mantém a mensagem visível justamente quando ela importa. */
function BotaoComAjuda({
  texto,
  desabilitado,
  children,
}: {
  texto: string;
  desabilitado: boolean;
  children: ReactNode;
}) {
  return (
    <Ajuda texto={texto}>
      <span className={desabilitado ? "inline-flex cursor-not-allowed" : "inline-flex"}>
        {children}
      </span>
    </Ajuda>
  );
}

/** Botões de exportação do inventário. Renderizado em dois lugares — no
    cabeçalho da tela (sempre visível, desabilitado sem seleção) e dentro
    da barra de ação em massa — sempre com esta mesma implementação, para
    não existirem dois caminhos de exportação divergindo com o tempo. */
export function AcoesExportarCameras({
  selecionadas,
  catalogos,
  compacto = false,
  incluirCompartilhar = false,
}: {
  /** Já chega filtrada e ordenada igual à tabela; vazia = nada selecionado */
  selecionadas: Camera[];
  catalogos: CatalogosCamera;
  /** Rótulos curtos ("PDF"/"Excel") para o cabeçalho, que já tem outros botões */
  compacto?: boolean;
  incluirCompartilhar?: boolean;
}) {
  const [exportando, setExportando] = useState(false);
  const vazio = selecionadas.length === 0;

  function linhas() {
    return linhasCamerasExport(selecionadas, catalogos);
  }

  function exportarPdf() {
    if (vazio) return;
    // Imprime o bloco #area-impressao, montado com esta mesma seleção.
    window.print();
    toast.success(`${selecionadas.length} câmera(s) exportada(s) em PDF`);
  }

  async function exportarExcel() {
    if (vazio) return;
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
    if (vazio) return;
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

  const tamanho = compacto ? ("default" as const) : ("sm" as const);

  return (
    <>
      <BotaoComAjuda
        desabilitado={vazio}
        texto={
          vazio
            ? AVISO_SEM_SELECAO
            : `Gerar o PDF das ${selecionadas.length} câmera(s) selecionada(s), com resumo executivo`
        }
      >
        <Button variant="outline" size={tamanho} onClick={exportarPdf} disabled={vazio}>
          <Printer className="size-4" />
          {compacto ? "PDF" : "Exportar PDF"}
        </Button>
      </BotaoComAjuda>

      <BotaoComAjuda
        desabilitado={vazio}
        texto={
          vazio
            ? AVISO_SEM_SELECAO
            : `Baixar as ${selecionadas.length} câmera(s) selecionada(s) em planilha Excel`
        }
      >
        <Button
          variant="outline"
          size={tamanho}
          onClick={exportarExcel}
          disabled={vazio || exportando}
        >
          <FileDown className="size-4" />
          {compacto ? "Excel" : "Exportar Excel"}
        </Button>
      </BotaoComAjuda>

      {incluirCompartilhar && (
        <BotaoComAjuda
          desabilitado={vazio}
          texto={vazio ? AVISO_SEM_SELECAO : "Compartilhar a planilha das câmeras selecionadas"}
        >
          <Button
            variant="outline"
            size={tamanho}
            onClick={compartilhar}
            disabled={vazio || exportando}
          >
            <Share2 className="size-4" />
            Compartilhar
          </Button>
        </BotaoComAjuda>
      )}
    </>
  );
}
