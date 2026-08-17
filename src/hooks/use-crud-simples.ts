"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { criarCrud } from "@/services/crud-simples";

export function criarHooksCrud<T extends { id: string }>(
  chave: string,
  crud: ReturnType<typeof criarCrud<T>>,
  rotulo: string
) {
  function useListar() {
    return useQuery({
      queryKey: [chave],
      queryFn: crud.listar,
      staleTime: 5 * 60 * 1000,
    });
  }

  function useCriar() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: crud.criar,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [chave] });
        toast.success(`${rotulo} cadastrado(a)`);
      },
      onError: (e: Error) =>
        toast.error("Não foi possível salvar", { description: e.message }),
    });
  }

  function useAtualizar() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (p: { id: string; valores: Partial<T> }) =>
        crud.atualizar(p.id, p.valores),
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [chave] });
        toast.success(`${rotulo} atualizado(a)`);
      },
      onError: (e: Error) =>
        toast.error("Não foi possível salvar", { description: e.message }),
    });
  }

  function useExcluir() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: crud.excluir,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: [chave] });
        toast.success(`${rotulo} excluído(a)`);
      },
      onError: (e: Error) =>
        toast.error("Não foi possível excluir", { description: e.message }),
    });
  }

  function useAtualizarVarios() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: (p: { ids: string[]; valores: Partial<T> }) =>
        crud.atualizarVarios(p.ids, p.valores),
      // Reporta o que o banco realmente alterou, não o que foi pedido: a
      // RLS pode filtrar parte da seleção sem gerar erro.
      onSuccess: (afetados) => {
        queryClient.invalidateQueries({ queryKey: [chave] });
        toast.success(`${afetados} registro(s) atualizado(s)`);
      },
      onError: (e: Error) =>
        toast.error("Não foi possível salvar", { description: e.message }),
    });
  }

  function useExcluirVarios() {
    const queryClient = useQueryClient();
    return useMutation({
      mutationFn: crud.excluirVarios,
      onSuccess: (afetados) => {
        queryClient.invalidateQueries({ queryKey: [chave] });
        toast.success(`${afetados} registro(s) excluído(s)`);
      },
      onError: (e: Error) =>
        toast.error("Não foi possível excluir", { description: e.message }),
    });
  }

  return {
    useListar,
    useCriar,
    useAtualizar,
    useExcluir,
    useAtualizarVarios,
    useExcluirVarios,
  };
}
