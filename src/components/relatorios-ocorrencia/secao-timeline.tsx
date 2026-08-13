"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2, Maximize2, Minimize2, Save } from "lucide-react";
import { useCamerasDashboard } from "@/hooks/use-dashboard";
import { hooksMarcadores } from "@/hooks/use-cadastros-relatorios-ocorrencia";
import { crudMarcadores } from "@/services/cadastros-relatorios-ocorrencia";
import { useOperadoresAnalise, usePerfis } from "@/hooks/use-usuarios";
import { useAtualizarRelatorioOcorrencia } from "@/hooks/use-relatorios-ocorrencia";
import { useFullscreen } from "@/hooks/use-fullscreen";
import { usePerfil } from "@/components/perfil-provider";
import type { RelatorioOcorrenciaDetalhe } from "@/services/relatorios-ocorrencia";
import { CabecalhoAnalise } from "./grid-analise/cabecalho-analise";
import { BarraEstatisticas } from "./grid-analise/barra-estatisticas";
import { GridAnalise } from "./grid-analise/grid-analise";
import { useTimelineGrid } from "./grid-analise/usar-timeline-grid";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SecaoTimeline({
  relatorio,
  editavel,
}: {
  relatorio: RelatorioOcorrenciaDetalhe;
  editavel: boolean;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  // O mesmo elemento também em estado: o portal do diálogo precisa dele
  // durante o render, e ler `ref.current` aí seria impuro. A ref callback
  // precisa de identidade estável (`useCallback`), senão React a
  // desanexaria e reanexaria a cada render, num laço de setState.
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);
  const definirContainer = useCallback((el: HTMLDivElement | null) => {
    containerRef.current = el;
    setContainerEl(el);
  }, []);
  const { ativo: modoInvestigacao, alternar: alternarModoInvestigacao } = useFullscreen(containerRef);
  const [cabecalhoRecolhido, setCabecalhoRecolhido] = useState(false);
  const [dataAnalise, setDataAnalise] = useState(
    relatorio.data_fato ?? relatorio.data_solicitacao
  );
  const [confirmarAberto, setConfirmarAberto] = useState(false);
  const [operadorEscolhido, setOperadorEscolhido] = useState("");

  const perfilLogado = usePerfil();
  const atualizarRelatorio = useAtualizarRelatorioOcorrencia(relatorio.id);
  const { data: cameras } = useCamerasDashboard();
  // Fonte única das duas listas de escolha: coluna Operador do grid e
  // modal "Salvar análise".
  const { data: operadores } = useOperadoresAnalise();
  // Lista completa só para resolver o NOME de quem já está gravado como
  // operador do relatório. Se essa pessoa perder o papel de Administrador
  // ou Operador CFTC, ela some das opções de escolha (é o que se pediu),
  // mas o nome dela continua aparecendo no que já foi registrado.
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

  async function aoCriarMarcador(nome: string) {
    const novo = await crudMarcadores.criar({ nome });
    return { id: novo.id, texto: novo.nome };
  }

  const opcoesOperador = (operadores ?? []).map((p) => ({ valor: p.id, rotulo: p.nome }));

  /** O responsável é perguntado aqui, e não na aba de solicitação: só ao
      fechar a análise se sabe quem de fato a conduziu. Sugere quem está
      logado quando o relatório ainda não tem responsável. */
  function abrirConfirmacao() {
    setOperadorEscolhido(relatorio.operador_id ?? perfilLogado.id);
    setConfirmarAberto(true);
  }

  async function confirmarSalvar() {
    try {
      if (operadorEscolhido !== (relatorio.operador_id ?? "")) {
        await atualizarRelatorio.mutateAsync({ operador_id: operadorEscolhido || null });
      }
      await salvarAnalise();
      setConfirmarAberto(false);
    } catch {
      // os toasts de erro já vêm dos hooks de mutação
    }
  }

  if (carregando) {
    return <div className="flex h-96 items-center justify-center text-sm text-muted-foreground">Carregando análise…</div>;
  }

  return (
    <div
      ref={definirContainer}
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
            <Button size="sm" onClick={abrirConfirmacao} disabled={salvando || !sujo}>
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
          operadores={operadores ?? []}
          marcadores={marcadores ?? []}
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

      <Dialog open={confirmarAberto} onOpenChange={setConfirmarAberto}>
        {/* No Modo Investigação o container está em fullscreen: sem apontar
            o portal para ele, o diálogo seria montado no body e ficaria
            invisível. */}
        <DialogContent container={modoInvestigacao ? containerEl : undefined}>
          <DialogHeader>
            <DialogTitle>Salvar análise</DialogTitle>
            <DialogDescription>
              Confirme quem conduziu esta análise. O responsável fica registrado no
              relatório e aparece nos indicadores do módulo.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-2">
            <Label htmlFor="operador-analise">Operador responsável</Label>
            <Select value={operadorEscolhido || undefined} onValueChange={setOperadorEscolhido}>
              <SelectTrigger id="operador-analise" className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent container={modoInvestigacao ? containerEl : undefined}>
                {opcoesOperador.map((o) => (
                  <SelectItem key={o.valor} value={o.valor}>
                    {o.rotulo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmarAberto(false)}
              disabled={salvando || atualizarRelatorio.isPending}
            >
              Cancelar
            </Button>
            <Button onClick={confirmarSalvar} disabled={salvando || atualizarRelatorio.isPending}>
              {(salvando || atualizarRelatorio.isPending) && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Salvar análise
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
