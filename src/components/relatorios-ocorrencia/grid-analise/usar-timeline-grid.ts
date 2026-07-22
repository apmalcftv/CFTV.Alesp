"use client";

import { useEffect, useState } from "react";
import { useSalvarTimelineCompleta, useTimelineRelatorio } from "@/hooks/use-relatorio-timeline";
import type { NovoEventoTimeline } from "@/services/relatorio-timeline";
import {
  eventoParaLinha,
  linhaParaEvento,
  linhaVazia,
  ordenarPorHorario,
  type LinhaGrid,
} from "./tipos";

const LIMITE_HISTORICO = 100;

interface Rascunho {
  linhas: LinhaGrid[];
  quando: string;
}

/** Estado do Grid Investigativo: carrega os eventos já salvos uma vez,
    depois trabalha 100% em memória (undo/redo + autosave em localStorage)
    até o usuário clicar "Salvar Análise". */
export function useTimelineGrid(
  relatorioId: string,
  dataPadrao: string,
  operadorId: string | null,
  operadorTexto: string
) {
  const { data: eventosSalvos, isPending } = useTimelineRelatorio(relatorioId);
  const salvar = useSalvarTimelineCompleta(relatorioId);
  const chaveRascunho = `analise-rascunho:${relatorioId}`;

  const [linhas, setLinhasState] = useState<LinhaGrid[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [sujo, setSujo] = useState(false);
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [historico, setHistorico] = useState<LinhaGrid[][]>([]);
  const [futuro, setFuturo] = useState<LinhaGrid[][]>([]);
  const [ultimaEdicaoEm, setUltimaEdicaoEm] = useState<Date | null>(null);
  const [ultimoAutosaveEm, setUltimoAutosaveEm] = useState<Date | null>(null);

  // Semeia o grid com os dados já salvos assim que chegam — ajuste de
  // estado durante a renderização (padrão oficial do React para "guardar
  // informação vinda de fora" sem precisar de useEffect + setState).
  if (!carregado && !isPending && eventosSalvos) {
    const carregadas = eventosSalvos.map(eventoParaLinha);
    setLinhasState(
      carregadas.length ? carregadas : [linhaVazia(dataPadrao, operadorId, operadorTexto)]
    );
    setCarregado(true);
    try {
      const bruto = localStorage.getItem(chaveRascunho);
      if (bruto) setRascunho(JSON.parse(bruto) as Rascunho);
    } catch {
      // rascunho corrompido — ignora
    }
  }

  function aplicar(novasLinhas: LinhaGrid[], registrarHistorico = true) {
    if (registrarHistorico) {
      setHistorico((h) => {
        const novo = [...h, linhas];
        return novo.length > LIMITE_HISTORICO ? novo.slice(1) : novo;
      });
      setFuturo([]);
    }
    setLinhasState(novasLinhas);
    setSujo(true);
    setUltimaEdicaoEm(new Date());
  }

  function desfazer() {
    if (historico.length === 0) return;
    const anterior = historico[historico.length - 1];
    setHistorico((h) => h.slice(0, -1));
    setFuturo((f) => [...f, linhas]);
    setLinhasState(anterior);
    setSujo(true);
    setUltimaEdicaoEm(new Date());
  }

  function refazer() {
    if (futuro.length === 0) return;
    const proximo = futuro[futuro.length - 1];
    setFuturo((f) => f.slice(0, -1));
    setHistorico((h) => [...h, linhas]);
    setLinhasState(proximo);
    setSujo(true);
    setUltimaEdicaoEm(new Date());
  }

  // Autosave local (nunca no banco) — debounced.
  useEffect(() => {
    if (!sujo) return;
    const temporizador = setTimeout(() => {
      try {
        localStorage.setItem(
          chaveRascunho,
          JSON.stringify({ linhas, quando: new Date().toISOString() } satisfies Rascunho)
        );
        setUltimoAutosaveEm(new Date());
      } catch {
        // localStorage indisponível/cheio — autosave é só uma rede de segurança
      }
    }, 2000);
    return () => clearTimeout(temporizador);
  }, [linhas, sujo, chaveRascunho]);

  useEffect(() => {
    function aoSair(e: BeforeUnloadEvent) {
      if (!sujo) return;
      e.preventDefault();
    }
    window.addEventListener("beforeunload", aoSair);
    return () => window.removeEventListener("beforeunload", aoSair);
  }, [sujo]);

  function recuperarRascunho() {
    if (!rascunho) return;
    aplicar(rascunho.linhas);
    setRascunho(null);
  }

  function descartarRascunho() {
    localStorage.removeItem(chaveRascunho);
    setRascunho(null);
  }

  async function salvarAnalise() {
    const ordenadas = ordenarPorHorario(linhas);
    const payload = ordenadas
      .map((l) => linhaParaEvento(relatorioId, l))
      .filter((e): e is NovoEventoTimeline => e !== null);
    await salvar.mutateAsync(payload);
    localStorage.removeItem(chaveRascunho);
    setLinhasState(ordenadas);
    setSujo(false);
    setHistorico([]);
    setFuturo([]);
    setUltimoAutosaveEm(null);
  }

  return {
    linhas,
    aplicarLinhas: aplicar,
    desfazer,
    refazer,
    podeDesfazer: historico.length > 0,
    podeRefazer: futuro.length > 0,
    sujo,
    salvando: salvar.isPending,
    salvarAnalise,
    rascunho,
    recuperarRascunho,
    descartarRascunho,
    carregando: !carregado,
    ultimaEdicaoEm,
    ultimoAutosaveEm,
  };
}
