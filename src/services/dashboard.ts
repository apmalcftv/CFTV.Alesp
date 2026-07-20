import { createClient } from "@/lib/supabase/client";
import type {
  CameraStatus,
  OcorrenciaStatus,
  Prioridade,
} from "@/types/domain";

// ---------- Tipos das linhas retornadas (com joins) ----------

export interface ItemCatalogo {
  id: string;
  nome: string;
}

export interface Catalogos {
  predios: ItemCatalogo[];
  empresas: ItemCatalogo[];
  fabricantes: ItemCatalogo[];
  tiposDefeito: ItemCatalogo[];
}

export interface CameraDash {
  id: string;
  numero: number;
  status: CameraStatus;
  local: {
    id: string;
    nome: string;
    tipo_area: string | null;
    predio: { id: string; nome: string; sigla: string | null } | null;
  } | null;
  modelo: {
    id: string;
    nome: string;
    fabricante: { id: string; nome: string } | null;
  } | null;
}

export interface OcorrenciaDash {
  id: string;
  numero: number;
  camera_id: string | null;
  descricao: string;
  prioridade: Prioridade;
  status: OcorrenciaStatus;
  aberta_em: string;
  primeira_resposta_em: string | null;
  encerrada_em: string | null;
  sla_vence_em: string | null;
  impedimento: string | null;
  tipo_defeito: { id: string; nome: string } | null;
  empresa: { id: string; nome: string } | null;
  camera: {
    id: string;
    numero: number;
    local: {
      id: string;
      nome: string;
      predio: { id: string; nome: string } | null;
    } | null;
  } | null;
}

// ---------- Consultas (uma por domínio; React Query faz o cache) ----------

export async function fetchCatalogos(): Promise<Catalogos> {
  const supabase = createClient();
  const [predios, empresas, fabricantes, tiposDefeito] = await Promise.all([
    supabase.from("predios").select("id, nome").order("nome"),
    supabase.from("empresas").select("id, nome").order("nome"),
    supabase.from("fabricantes").select("id, nome").order("nome"),
    supabase.from("tipos_defeito").select("id, nome").order("nome"),
  ]);

  const erro =
    predios.error ?? empresas.error ?? fabricantes.error ?? tiposDefeito.error;
  if (erro) throw erro;

  return {
    predios: (predios.data ?? []) as ItemCatalogo[],
    empresas: (empresas.data ?? []) as ItemCatalogo[],
    fabricantes: (fabricantes.data ?? []) as ItemCatalogo[],
    tiposDefeito: (tiposDefeito.data ?? []) as ItemCatalogo[],
  };
}

export async function fetchCamerasDashboard(): Promise<CameraDash[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("cameras")
    .select(
      `id, numero, status,
       local:locais(id, nome, tipo_area, predio:predios(id, nome, sigla)),
       modelo:modelos_camera(id, nome, fabricante:fabricantes(id, nome))`
    )
    .order("numero");

  if (error) throw error;
  return (data ?? []) as unknown as CameraDash[];
}

export async function fetchOcorrenciasDashboard(): Promise<OcorrenciaDash[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ocorrencias")
    .select(
      `id, numero, camera_id, descricao, prioridade, status,
       aberta_em, primeira_resposta_em, encerrada_em, sla_vence_em, impedimento,
       tipo_defeito:tipos_defeito(id, nome),
       empresa:empresas(id, nome),
       camera:cameras!ocorrencias_camera_id_fkey(id, numero,
         local:locais(id, nome, predio:predios(id, nome)))`
    )
    .order("aberta_em", { ascending: false })
    .limit(5000);

  if (error) throw error;
  return (data ?? []) as unknown as OcorrenciaDash[];
}
