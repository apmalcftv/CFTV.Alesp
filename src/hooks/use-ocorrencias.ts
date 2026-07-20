"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as servico from "@/services/ocorrencias";
import type { Ocorrencia } from "@/types/domain";

const UM_MINUTO = 60 * 1000;

export function useOcorrencia(id: string) {
  return useQuery({
    queryKey: ["ocorrencias", id],
    queryFn: () => servico.buscarOcorrencia(id),
    enabled: !!id,
    staleTime: UM_MINUTO,
  });
}

export function useCriarOcorrencia() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: servico.criarOcorrencia,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard", "ocorrencias"] });
      toast.success("Ocorrência aberta");
    },
    onError: (e: Error) =>
      toast.error("Não foi possível abrir a ocorrência", {
        description: e.message,
      }),
  });
}

export function useAtualizarOcorrencia(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (valores: Partial<Ocorrencia>) =>
      servico.atualizarOcorrencia(id, valores),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ocorrencias", id] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "ocorrencias"] });
      queryClient.invalidateQueries({ queryKey: ["ocorrencias", id, "eventos"] });
      toast.success("Ocorrência atualizada");
    },
    onError: (e: Error) =>
      toast.error("Não foi possível atualizar", { description: e.message }),
  });
}

export function useEventos(ocorrenciaId: string) {
  return useQuery({
    queryKey: ["ocorrencias", ocorrenciaId, "eventos"],
    queryFn: () => servico.listarEventos(ocorrenciaId),
    enabled: !!ocorrenciaId,
    staleTime: 30 * 1000,
  });
}

export function useAdicionarComentario(ocorrenciaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (mensagem: string) =>
      servico.adicionarComentario(ocorrenciaId, mensagem),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["ocorrencias", ocorrenciaId, "eventos"],
      });
      toast.success("Comentário adicionado");
    },
    onError: (e: Error) =>
      toast.error("Não foi possível comentar", { description: e.message }),
  });
}

export function useAnexos(ocorrenciaId: string) {
  return useQuery({
    queryKey: ["ocorrencias", ocorrenciaId, "anexos"],
    queryFn: () => servico.listarAnexos(ocorrenciaId),
    enabled: !!ocorrenciaId,
    staleTime: 30 * 1000,
  });
}

export function useEnviarAnexo(ocorrenciaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { tenantId: string; arquivo: File }) =>
      servico.enviarAnexo({ ocorrenciaId, ...params }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["ocorrencias", ocorrenciaId, "anexos"],
      });
      toast.success("Anexo enviado");
    },
    onError: (e: Error) =>
      toast.error("Não foi possível enviar o anexo", { description: e.message }),
  });
}

export function useRemoverAnexo(ocorrenciaId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: servico.removerAnexo,
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["ocorrencias", ocorrenciaId, "anexos"],
      });
      toast.success("Anexo removido");
    },
    onError: (e: Error) =>
      toast.error("Não foi possível remover o anexo", { description: e.message }),
  });
}
