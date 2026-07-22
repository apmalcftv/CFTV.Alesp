"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as servico from "@/services/relatorio-anexos";

export function useAnexosRelatorio(relatorioId: string) {
  return useQuery({
    queryKey: ["relatorios_ocorrencia", relatorioId, "anexos"],
    queryFn: () => servico.listarAnexosRelatorio(relatorioId),
    enabled: !!relatorioId,
    staleTime: 30 * 1000,
  });
}

export function useEnviarAnexoRelatorio(relatorioId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { tenantId: string; arquivo: File }) =>
      servico.enviarAnexoRelatorio({ relatorioId, ...params }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["relatorios_ocorrencia", relatorioId, "anexos"],
      });
      toast.success("Anexo enviado");
    },
    onError: (e: Error) =>
      toast.error("Não foi possível enviar o anexo", { description: e.message }),
  });
}

export function useRemoverAnexoRelatorio(relatorioId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: servico.removerAnexoRelatorio,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["relatorios_ocorrencia", relatorioId, "anexos"],
      });
      toast.success("Anexo removido");
    },
    onError: (e: Error) =>
      toast.error("Não foi possível remover o anexo", { description: e.message }),
  });
}
