"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { Loader2, Maximize2, Minimize2, Save } from "lucide-react";
import { useCamerasDashboard } from "@/hooks/use-dashboard";
import { hooksLocais, hooksPredios } from "@/hooks/use-cadastros";
import { hooksMarcadores } from "@/hooks/use-cadastros-relatorios-ocorrencia";
import { crudLocais } from "@/services/cadastros";
import { crudMarcadores } from "@/services/cadastros-relatorios-ocorrencia";
import { usePerfis } from "@/hooks/use-usuarios";
import { useFullscreen } from "@/hooks/use-fullscreen";
import type { RelatorioOcorrenciaDetalhe } from "@/services/relatorios-ocorrencia";
import { CabecalhoAnalise } from "./grid-analise/cabecalho-analise";
import { BarraEstatisticas } from "./grid-analise/barra-estatisticas";
import { GridAnalise } from "./grid-analise/grid-analise";
import { useTimelineGrid } from "./grid-analise/usar-timeline-grid";
import { Button } from "@/components/ui/button";

export function SecaoTimeline({
  relatorio,
  editavel,
}: {
  relatorio: RelatorioOcorrenciaDetalhe;
  editavel: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { ativo: modoInvestigacao, alternar: alternarModoInvestigacao } = useFullscreen(containerRef);
  const [cabecalhoRecolhido, setCabecalhoRecolhido] = useState(false);
  const [dataAnalise, setDataAnalise] = useState(
    relatorio.data_fato ?? relatorio.data_solicitacao
  );

  const { data: cameras } = useCamerasDashboard();
  const { data: locais } = hooksLocais.useListar();
  const { data: predios } = hooksPredios.useListar();
  const { data: perfis } = usePerfis();
  const { data: marcadores } = hooksMarcadores.useListar();

  const operadorAtual = (perfis ?? []).find((p) => p.id === relatorio.operador_id);

  const {
    linhas,
    aplicarLinhas,
    desfazer,
    refazer,
    podeDesfazer,
    podeRefazer,
    sujo,
    salvando,
    salvarAnalise,
    rascunho,
    recuperarRascunho,
    descartarRascunho,
    carregando,
    ultimaEdicaoEm,
    ultimoAutosaveEm,
  } = useTimelineGrid(
    relatorio.id,
    dataAnalise,
    relatorio.operador_id,
    operadorAtual?.nome ?? ""
  );

  async function aoCriarLocal(nome: string) {
    const predioId = predios?.[0]?.id;
    if (!predioId) {
      toast.error("Cadastre um prédio antes de criar um local");
      return undefined;
    }
    const novo = await crudLocais.criar({ nome, predio_id: predioId });
    return { id: novo.id, texto: novo.nome };
  }

  async function aoCriarMarcador(nome: string) {
    const novo = await crudMarcadores.criar({ nome });
    return { id: novo.id, texto: novo.nome };
  }

  async function aoSalvar() {
    try {
      await salvarAnalise();
    } catch {
      // toast de erro já é disparado pelo hook useSalvarTimelineCompleta
    }
  }

  if (carregando) {
    return <div className="flex h-96 items-center justify-center text-sm text-muted-foreground">Carregando análise…</div>;
  }

  return (
    <div
      ref={containerRef}
      className={
        modoInvestigacao
          ? "flex h-screen flex-col bg-background"
          : "flex h-[calc(100vh-260px)] min-h-[500px] flex-col overflow-hidden rounded-lg border"
      }
    >
      {rascunho && (
        <div className="flex items-center justify-between gap-2 border-b bg-warning/10 px-3 py-2 text-sm">
          <span>
            Existe um rascunho não salvo de {new Date(rascunho.quando).toLocaleString("pt-BR")}.
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={descartarRascunho}>
              Descartar
            </Button>
            <Button size="sm" onClick={recuperarRascunho}>
              Recuperar
            </Button>
          </div>
        </div>
      )}

      <CabecalhoAnalise
        relatorio={relatorio}
        recolhido={cabecalhoRecolhido || modoInvestigacao}
        onRecolherChange={setCabecalhoRecolhido}
        dataAnalise={dataAnalise}
        onDataAnaliseChange={setDataAnalise}
      />

      <div className="flex items-center justify-end gap-2 border-b bg-card px-2 py-1.5">
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={alternarModoInvestigacao}>
            {modoInvestigacao ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            {modoInvestigacao ? "Sair do modo investigação" : "Modo Investigação"}
          </Button>
          {editavel && (
            <Button size="sm" onClick={aoSalvar} disabled={salvando || !sujo}>
              {salvando ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Salvar Análise
            </Button>
          )}
        </div>
      </div>

      <div className="min-h-0 flex-1">
        <GridAnalise
          linhas={linhas}
          aplicarLinhas={aplicarLinhas}
          desfazer={desfazer}
          refazer={refazer}
          podeDesfazer={podeDesfazer}
          podeRefazer={podeRefazer}
          dataAnalise={dataAnalise}
          operadorId={relatorio.operador_id}
          operadorTexto={operadorAtual?.nome ?? ""}
          cameras={cameras ?? []}
          locais={locais ?? []}
          perfis={perfis ?? []}
          marcadores={marcadores ?? []}
          aoCriarLocal={aoCriarLocal}
          aoCriarMarcador={aoCriarMarcador}
          editavel={editavel}
        />
      </div>

      <BarraEstatisticas
        linhas={linhas}
        sujo={sujo}
        salvando={salvando}
        ultimaEdicaoEm={ultimaEdicaoEm}
        ultimoAutosaveEm={ultimoAutosaveEm}
      />
    </div>
  );
}
