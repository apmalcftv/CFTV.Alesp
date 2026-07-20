"use client";

import { useQuery } from "@tanstack/react-query";
import { crudCameras, listarEventosCamera } from "@/services/cameras";
import { criarHooksCrud } from "@/hooks/use-crud-simples";
import type { Camera } from "@/types/domain";

export const hooksCameras = criarHooksCrud<Camera>("cameras", crudCameras, "Câmera");

export function useEventosCamera(cameraId: string) {
  return useQuery({
    queryKey: ["cameras", cameraId, "eventos"],
    queryFn: () => listarEventosCamera(cameraId),
    enabled: !!cameraId,
    staleTime: 30 * 1000,
  });
}
