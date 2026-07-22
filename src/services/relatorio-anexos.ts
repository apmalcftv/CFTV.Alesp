import { createClient } from "@/lib/supabase/client";
import type { RelatorioAnexo, TipoAnexoRelatorio } from "@/types/relatorios-ocorrencia";

const BUCKET = "anexos-relatorios";

export async function listarAnexosRelatorio(relatorioId: string): Promise<RelatorioAnexo[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("relatorio_anexos")
    .select("*")
    .eq("relatorio_id", relatorioId)
    .order("criado_em");
  if (error) throw error;
  return (data ?? []) as unknown as RelatorioAnexo[];
}

function tipoDoArquivo(arquivo: File): TipoAnexoRelatorio {
  if (arquivo.type === "application/pdf") return "pdf";
  if (arquivo.type.startsWith("image/")) return "foto";
  if (arquivo.type.startsWith("video/")) return "video";
  if (
    arquivo.type.includes("word") ||
    arquivo.type === "text/plain" ||
    /\.(docx?|txt)$/i.test(arquivo.name)
  )
    return "documento";
  return "outro";
}

export async function enviarAnexoRelatorio(params: {
  relatorioId: string;
  tenantId: string;
  arquivo: File;
  tipo?: TipoAnexoRelatorio;
}): Promise<RelatorioAnexo> {
  const supabase = createClient();
  const extensao = params.arquivo.name.split(".").pop();
  const nomeArquivo = `${crypto.randomUUID()}${extensao ? `.${extensao}` : ""}`;
  const caminho = `${params.tenantId}/${params.relatorioId}/${nomeArquivo}`;

  const { error: erroUpload } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, params.arquivo);
  if (erroUpload) throw erroUpload;

  const { data, error } = await supabase
    .from("relatorio_anexos")
    .insert({
      relatorio_id: params.relatorioId,
      tipo: params.tipo ?? tipoDoArquivo(params.arquivo),
      storage_path: caminho,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- sem Database gerado; ver dashboard.ts
    } as any)
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as RelatorioAnexo;
}

export async function urlAssinadaAnexoRelatorio(caminho: string): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(caminho, 10 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function removerAnexoRelatorio(anexo: RelatorioAnexo): Promise<void> {
  const supabase = createClient();
  const { error: erroStorage } = await supabase.storage
    .from(BUCKET)
    .remove([anexo.storage_path]);
  if (erroStorage) throw erroStorage;
  const { error } = await supabase.from("relatorio_anexos").delete().eq("id", anexo.id);
  if (error) throw error;
}
