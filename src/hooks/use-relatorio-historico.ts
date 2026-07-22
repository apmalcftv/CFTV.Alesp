"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as servico from "@/services/relatorio-historico";

export function useHistoricoRelatorio(relatorioId: string) {
  return useQuery({
    queryKey: ["relatorios_ocorrencia", relatorioId, "historico"],
    queryFn: () => servico.listarHistorico(relatorioId),
    enabled: !!relatorioId,
    staleTime: 30 * 1000,
  });
}

export function useAdicionarComentarioHistorico(relatorioId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mensagem: string) =>
      servico.adicionarComentarioHistorico(relatorioId, mensagem),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["relatorios_ocorrencia", relatorioId, "historico"],
      });
      toast.success("Comentário adicionado");
    },
    onError: (e: Error) =>
      toast.error("Não foi possível comentar", { description: e.message }),
  });
}
