"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as servico from "@/services/relatorios-ocorrencia";
import type { RelatorioOcorrencia } from "@/types/relatorios-ocorrencia";

const UM_MINUTO = 60 * 1000;

export function useRelatoriosOcorrencia() {
  return useQuery({
    queryKey: ["relatorios_ocorrencia"],
    queryFn: servico.listarRelatorios,
    staleTime: UM_MINUTO,
    placeholderData: keepPreviousData,
  });
}

export function useRelatorioOcorrencia(id: string) {
  return useQuery({
    queryKey: ["relatorios_ocorrencia", id],
    queryFn: () => servico.buscarRelatorio(id),
    enabled: !!id,
    staleTime: UM_MINUTO,
  });
}

export function useCriarRelatorioOcorrencia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: servico.criarRelatorio,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["relatorios_ocorrencia"] });
      toast.success("Relatório criado");
    },
    onError: (e: Error) =>
      toast.error("Não foi possível criar o relatório", { description: e.message }),
  });
}

export function useAtualizarRelatorioOcorrencia(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (valores: Partial<RelatorioOcorrencia>) =>
      servico.atualizarRelatorio(id, valores),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["relatorios_ocorrencia", id] });
      queryClient.invalidateQueries({ queryKey: ["relatorios_ocorrencia"] });
      queryClient.invalidateQueries({ queryKey: ["relatorios_ocorrencia", id, "historico"] });
      toast.success("Relatório atualizado");
    },
    onError: (e: Error) =>
      toast.error("Não foi possível atualizar", { description: e.message }),
  });
}
