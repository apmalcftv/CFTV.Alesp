"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as servico from "@/services/relatorio-exportacoes";

export function useExportacoesRelatorio(relatorioId: string) {
  return useQuery({
    queryKey: ["relatorios_ocorrencia", relatorioId, "exportacoes"],
    queryFn: () => servico.listarExportacoes(relatorioId),
    enabled: !!relatorioId,
    staleTime: 30 * 1000,
  });
}

export function useCriarExportacao(relatorioId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: servico.criarExportacao,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["relatorios_ocorrencia", relatorioId, "exportacoes"],
      });
      toast.success("Exportação registrada");
    },
    onError: (e: Error) =>
      toast.error("Não foi possível registrar a exportação", { description: e.message }),
  });
}

export function useExcluirExportacao(relatorioId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: servico.excluirExportacao,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["relatorios_ocorrencia", relatorioId, "exportacoes"],
      });
      toast.success("Exportação removida");
    },
    onError: (e: Error) =>
      toast.error("Não foi possível remover", { description: e.message }),
  });
}
