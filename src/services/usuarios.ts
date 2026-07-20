import { createClient } from "@/lib/supabase/client";
import type { PapelUsuario, PerfilUsuario } from "@/types/domain";

const COLUNAS =
  "id, nome, email, telefone, empresa_informada, papel, empresa_id, status, criado_em, aprovado_em, ultimo_acesso";

export async function listarPerfis(): Promise<PerfilUsuario[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("perfis")
    .select(COLUNAS)
    .order("criado_em", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as PerfilUsuario[];
}

export async function aprovarUsuario(
  id: string,
  papel: PapelUsuario,
  empresaId: string | null
): Promise<void> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("perfis")
    .update({
      papel,
      empresa_id: papel === "empresa_contratada" ? empresaId : null,
      status: "aprovado",
      aprovado_por: user?.id,
      aprovado_em: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw error;
}

export async function rejeitarUsuario(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("perfis")
    .update({ status: "rejeitado" })
    .eq("id", id);
  if (error) throw error;
}

export async function bloquearUsuario(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("perfis")
    .update({ status: "bloqueado" })
    .eq("id", id);
  if (error) throw error;
}

export async function reativarUsuario(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("perfis")
    .update({ status: "aprovado" })
    .eq("id", id);
  if (error) throw error;
}

/** "Excluir" não apaga a conta de login (isso exigiria a service_role key,
    que nunca fica no navegador) — vira um bloqueio permanente. */
export async function excluirUsuario(id: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("perfis")
    .update({ status: "excluido" })
    .eq("id", id);
  if (error) throw error;
}

export interface DadosEdicaoUsuario {
  nome: string;
  telefone: string | null;
  empresa_informada: string | null;
  papel: PapelUsuario | null;
  empresa_id: string | null;
}

export async function editarUsuario(
  id: string,
  dados: DadosEdicaoUsuario
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("perfis")
    .update({
      nome: dados.nome,
      telefone: dados.telefone,
      empresa_informada: dados.empresa_informada,
      papel: dados.papel,
      empresa_id: dados.papel === "empresa_contratada" ? dados.empresa_id : null,
    })
    .eq("id", id);
  if (error) throw error;
}

/** Envia o e-mail de redefinição de senha do Supabase — não precisa de
    service_role, é seguro chamar direto do navegador. */
export async function resetarSenha(email: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(email);
  if (error) throw error;
}
