"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { atualizarBranding, fetchMeuTenant } from "@/services/tenant";
import type { Branding } from "@/types/domain";

export function useMeuTenant() {
  return useQuery({
    queryKey: ["tenant", "meu"],
    queryFn: fetchMeuTenant,
    staleTime: 10 * 60 * 1000,
  });
}

export function useAtualizarBranding() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (p: { tenantId: string; nome: string; branding: Branding }) =>
      atualizarBranding(p.tenantId, p.nome, p.branding),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tenant"] });
      toast.success("Identidade visual salva", {
        description: "As mudanças valem para todos os usuários da organização.",
      });
    },
    onError: (e: Error) =>
      toast.error("Não foi possível salvar", { description: e.message }),
  });
}
