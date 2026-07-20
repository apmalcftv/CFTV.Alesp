"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  fetchCamerasDashboard,
  fetchCatalogos,
  fetchOcorrenciasDashboard,
} from "@/services/dashboard";

const UM_MINUTO = 60 * 1000;

export function useCatalogos() {
  return useQuery({
    queryKey: ["dashboard", "catalogos"],
    queryFn: fetchCatalogos,
    staleTime: 10 * UM_MINUTO,
    placeholderData: keepPreviousData,
  });
}

export function useCamerasDashboard() {
  return useQuery({
    queryKey: ["dashboard", "cameras"],
    queryFn: fetchCamerasDashboard,
    staleTime: UM_MINUTO,
    placeholderData: keepPreviousData,
  });
}

export function useOcorrenciasDashboard() {
  return useQuery({
    queryKey: ["dashboard", "ocorrencias"],
    queryFn: fetchOcorrenciasDashboard,
    staleTime: UM_MINUTO,
    placeholderData: keepPreviousData,
  });
}
