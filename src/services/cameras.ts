import { createClient } from "@/lib/supabase/client";
import { criarCrud } from "@/services/crud-simples";
import type { Camera, CameraEvento } from "@/types/domain";

export const crudCameras = criarCrud<Camera>("cameras", "*", "numero");

export interface EventoCameraComAutor extends CameraEvento {
  autor: { nome: string } | null;
}

/** Histórico próprio da câmera — só leitura, populado pela trigger
    `on_camera_status_change`, nunca escrito pela aplicação. */
export async function listarEventosCamera(
  cameraId: string
): Promise<EventoCameraComAutor[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("camera_eventos")
    .select("*, autor:perfis(nome)")
    .eq("camera_id", cameraId)
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as EventoCameraComAutor[];
}
