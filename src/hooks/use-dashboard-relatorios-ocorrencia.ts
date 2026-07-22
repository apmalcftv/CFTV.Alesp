"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchTotalExportacoesRelatorio } from "@/services/dashboard-relatorios-ocorrencia";

const UM_MINUTO = 60 * 1000;

export function useTotalExportacoesRelatorio() {
  return useQuery({
    queryKey: ["dashboard", "relatorios_ocorrencia", "exportacoes_total"],
    queryFn: fetchTotalExportacoesRelatorio,
    staleTime: UM_MINUTO,
    placeholderData: keepPreviousData,
  });
}
