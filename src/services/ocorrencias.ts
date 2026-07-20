import { createClient } from "@/lib/supabase/client";
import type { Anexo, Ocorrencia, OcorrenciaEvento, Prioridade } from "@/types/domain";

export interface NovaOcorrencia {
  camera_id: string | null;
  tipo_defeito_id: string | null;
  descricao: string;
  prioridade: Prioridade;
  empresa_id: string | null;
  tecnico_id: string | null;
  os_externa: string | null;
  impedimento: string | null;
  sla_horas: number | null;
}

export interface OcorrenciaDetalhe extends Ocorrencia {
  camera: {
    id: string;
    numero: number;
    local: {
      id: string;
      nome: string;
      predio: { id: string; nome: string } | null;
    } | null;
  } | null;
  tipo_defeito: { id: string; nome: string } | null;
  empresa: { id: string; nome: string } | null;
  tecnico: { id: string; nome: string } | null;
}

const SELECT_DETALHE = `
  *,
  camera:cameras!ocorrencias_camera_id_fkey(id, numero, local:locais(id, nome, predio:predios(id, nome))),
  tipo_defeito:tipos_defeito(id, nome),
  empresa:empresas(id, nome),
  tecnico:tecnicos(id, nome)
`;

export async function buscarOcorrencia(id: string): Promise<OcorrenciaDetalhe> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ocorrencias")
    .select(SELECT_DETALHE)
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as unknown as OcorrenciaDetalhe;
}

export async function criarOcorrencia(
  valores: NovaOcorrencia
): Promise<Ocorrencia> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ocorrencias")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- sem Database gerado; ver dashboard.ts
    .insert(valores as any)
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as Ocorrencia;
}

export async function atualizarOcorrencia(
  id: string,
  valores: Partial<Ocorrencia>
): Promise<Ocorrencia> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ocorrencias")
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- sem Database gerado; ver dashboard.ts
    .update(valores as any)
    .eq("id", id)
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as Ocorrencia;
}

export interface EventoComAutor extends OcorrenciaEvento {
  autor: { nome: string } | null;
}

export async function listarEventos(
  ocorrenciaId: string
): Promise<EventoComAutor[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("ocorrencia_eventos")
    .select("*, autor:perfis(nome)")
    .eq("ocorrencia_id", ocorrenciaId)
    .order("criado_em");
  if (error) throw error;
  return (data ?? []) as unknown as EventoComAutor[];
}

export async function adicionarComentario(
  ocorrenciaId: string,
  mensagem: string
): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase.from("ocorrencia_eventos").insert({
    ocorrencia_id: ocorrenciaId,
    tipo: "comentario",
    mensagem,
    autor_id: user?.id,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- sem Database gerado; ver dashboard.ts
  } as any);
  if (error) throw error;
}

export async function listarAnexos(ocorrenciaId: string): Promise<Anexo[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("anexos")
    .select("*")
    .eq("ocorrencia_id", ocorrenciaId)
    .order("criado_em");
  if (error) throw error;
  return (data ?? []) as unknown as Anexo[];
}

export async function enviarAnexo(params: {
  ocorrenciaId: string;
  tenantId: string;
  arquivo: File;
}): Promise<Anexo> {
  const supabase = createClient();
  const extensao = params.arquivo.name.split(".").pop();
  const nomeArquivo = `${crypto.randomUUID()}${extensao ? `.${extensao}` : ""}`;
  const caminho = `${params.tenantId}/${params.ocorrenciaId}/${nomeArquivo}`;

  const { error: erroUpload } = await supabase.storage
    .from("anexos")
    .upload(caminho, params.arquivo);
  if (erroUpload) throw erroUpload;

  const tipo = params.arquivo.type.startsWith("image/")
    ? "foto"
    : params.arquivo.type.startsWith("video/")
      ? "video"
      : "arquivo";

  const { data, error } = await supabase
    .from("anexos")
    .insert({
      ocorrencia_id: params.ocorrenciaId,
      tipo,
      storage_path: caminho,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- sem Database gerado; ver dashboard.ts
    } as any)
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as Anexo;
}

export async function urlAssinadaAnexo(caminho: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from("anexos")
    .createSignedUrl(caminho, 10 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function removerAnexo(anexo: Anexo): Promise<void> {
  const supabase = createClient();
  const { error: erroStorage } = await supabase.storage
    .from("anexos")
    .remove([anexo.storage_path]);
  if (erroStorage) throw erroStorage;
  const { error } = await supabase.from("anexos").delete().eq("id", anexo.id);
  if (error) throw error;
}
