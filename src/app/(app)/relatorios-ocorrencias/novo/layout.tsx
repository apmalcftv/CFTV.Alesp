import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { podeCriarRelatorioOcorrencia } from "@/lib/autorizacao";
import type { PapelUsuario } from "@/types/domain";

/** Guarda extra só desta rota: Gestor enxerga o módulo (herda o layout
    pai), mas não pode criar relatório — sem isso, digitando a URL direto
    ele veria o formulário de criação mesmo sem poder salvar nada. */
export default async function NovoRelatorioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: perfil } = await supabase
    .from("perfis")
    .select("papel")
    .eq("id", user!.id)
    .single<{ papel: PapelUsuario }>();

  if (!perfil || !podeCriarRelatorioOcorrencia(perfil.papel)) {
    redirect("/relatorios-ocorrencias");
  }

  return children;
}
