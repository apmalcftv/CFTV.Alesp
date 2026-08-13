"use client";

import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import * as servico from "@/services/permissoes";
import { usePerfil } from "@/components/perfil-provider";
import type { PapelUsuario } from "@/types/domain";
import { chavePermissao, type AcaoPermissao } from "@/types/permissoes";

const CINCO_MINUTOS = 5 * 60 * 1000;

/** Catálogo muda só por migration — cache longo. */
export function useCatalogoPermissoes() {
  return useQuery({
    queryKey: ["permissoes", "catalogo"],
    queryFn: servico.listarCatalogoPermissoes,
    staleTime: CINCO_MINUTOS,
  });
}

export function usePermissoesDoPapel(papel: PapelUsuario) {
  return useQuery({
    queryKey: ["permissoes", "perfil", papel],
    queryFn: () => servico.listarPermissoesDoPapel(papel),
    enabled: !!papel,
  });
}

/** Permissões do usuário logado, na forma de um predicado `pode()`.
 *
 * Administrador é curto-circuitado aqui pelo mesmo motivo que em
 * `tem_permissao()`: o acesso total dele é regra, não configuração.
 *
 * Enquanto carrega, `pode()` devolve falso — o botão aparece um instante
 * depois em vez de aparecer e sumir, e nunca se oferece uma ação que o
 * banco vai recusar. */
export function useMinhasPermissoes() {
  const perfil = usePerfil();
  const ehAdministrador = perfil.papel === "administrador";

  const { data, isPending } = useQuery({
    queryKey: ["permissoes", "minhas", perfil.papel],
    queryFn: () => servico.listarMinhasPermissoes(perfil.papel),
    enabled: !ehAdministrador,
    staleTime: 30 * 1000,
  });

  const permitidas = useMemo(() => {
    const conjunto = new Set<string>();
    for (const p of data ?? []) {
      if (p.permitido) conjunto.add(chavePermissao(p.recurso, p.acao));
    }
    return conjunto;
  }, [data]);

  const pode = useCallback(
    (recurso: string, acao: AcaoPermissao) =>
      ehAdministrador || permitidas.has(chavePermissao(recurso, acao)),
    [ehAdministrador, permitidas]
  );

  return { pode, carregando: !ehAdministrador && isPending };
}

export function useSalvarPermissoes(papel: PapelUsuario) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (alteracoes: servico.AlteracaoPermissao[]) =>
      servico.salvarPermissoes(papel, alteracoes),
    onSuccess: (_dado, alteracoes) => {
      queryClient.invalidateQueries({ queryKey: ["permissoes", "perfil", papel] });
      toast.success("Permissões atualizadas", {
        description: `${alteracoes.length} ${
          alteracoes.length === 1 ? "permissão gravada" : "permissões gravadas"
        }.`,
      });
    },
    onError: (e: Error) =>
      toast.error("Não foi possível salvar as permissões", { description: e.message }),
  });
}
