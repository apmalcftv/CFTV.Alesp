"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as servico from "@/services/usuarios";
import type { PapelUsuario } from "@/types/domain";

export function usePerfis() {
  return useQuery({
    queryKey: ["usuarios", "perfis"],
    queryFn: servico.listarPerfis,
    staleTime: 30 * 1000,
  });
}

function useAcaoUsuario<TVariaveis>(
  mutationFn: (v: TVariaveis) => Promise<void>,
  mensagemSucesso: string,
  mensagemErro: string
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios", "perfis"] });
      toast.success(mensagemSucesso);
    },
    onError: (e: Error) => toast.error(mensagemErro, { description: e.message }),
  });
}

export function useAprovarUsuario() {
  return useAcaoUsuario(
    (v: { id: string; papel: PapelUsuario; empresaId: string | null }) =>
      servico.aprovarUsuario(v.id, v.papel, v.empresaId),
    "Usuário aprovado",
    "Não foi possível aprovar"
  );
}

export function useRejeitarUsuario() {
  return useAcaoUsuario(servico.rejeitarUsuario, "Usuário rejeitado", "Não foi possível rejeitar");
}

export function useBloquearUsuario() {
  return useAcaoUsuario(servico.bloquearUsuario, "Usuário bloqueado", "Não foi possível bloquear");
}

export function useReativarUsuario() {
  return useAcaoUsuario(servico.reativarUsuario, "Usuário reativado", "Não foi possível reativar");
}

export function useExcluirUsuario() {
  return useAcaoUsuario(servico.excluirUsuario, "Usuário excluído", "Não foi possível excluir");
}

export function useEditarUsuario() {
  return useAcaoUsuario(
    (v: { id: string; dados: servico.DadosEdicaoUsuario }) => servico.editarUsuario(v.id, v.dados),
    "Usuário atualizado",
    "Não foi possível salvar"
  );
}

export function useResetarSenha() {
  return useMutation({
    mutationFn: servico.resetarSenha,
    onSuccess: () =>
      toast.success("E-mail de redefinição enviado", {
        description: "A pessoa recebe um link para escolher uma nova senha.",
      }),
    onError: (e: Error) =>
      toast.error("Não foi possível enviar o e-mail", { description: e.message }),
  });
}
