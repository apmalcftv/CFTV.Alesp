import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { podeAcessarRelatoriosOcorrencia } from "@/lib/autorizacao";
import type { PapelUsuario } from "@/types/domain";

/** Guarda de rota do módulo "Relatórios de Ocorrências": Fiscal ALESP e
    Empresa Contratada não têm acesso — nem pelo menu (já escondido em
    navigation.ts), nem digitando a URL direto. O layout do grupo `(app)`
    já garante usuário autenticado e aprovado antes deste ponto; aqui só
    falta checar o papel específico deste módulo. A trava real de dados
    continua sendo a RLS — este redirect é só para não expor a tela. */
export default async function RelatoriosOcorrenciasLayout({
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

  if (!perfil || !podeAcessarRelatoriosOcorrencia(perfil.papel)) {
    redirect("/dashboard");
  }

  return children;
}
