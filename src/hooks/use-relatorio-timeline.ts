"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as servico from "@/services/relatorio-timeline";

export function useTimelineRelatorio(relatorioId: string) {
  return useQuery({
    queryKey: ["relatorios_ocorrencia", relatorioId, "timeline"],
    queryFn: () => servico.listarTimeline(relatorioId),
    enabled: !!relatorioId,
    staleTime: 30 * 1000,
  });
}

/** Salvamento em lote usado pelo Grid Investigativo — substitui todos os
    eventos do relatório pelo array atual do grid numa única ação. */
export function useSalvarTimelineCompleta(relatorioId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (linhas: Parameters<typeof servico.salvarTimelineCompleta>[1]) =>
      servico.salvarTimelineCompleta(relatorioId, linhas),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["relatorios_ocorrencia", relatorioId, "timeline"],
      });
      toast.success("Análise salva");
    },
    onError: (e: Error) =>
      toast.error("Não foi possível salvar a análise", { description: e.message }),
  });
}
