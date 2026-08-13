import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { PapelUsuario } from "@/types/domain";

/** Guarda de rota: só administrador entra, nem digitando a URL. O layout
    do grupo `(app)` já garantiu usuário autenticado e aprovado; aqui só
    falta o papel.

    Esta checagem no servidor é a segunda de três camadas — o card no
    índice de Cadastros só aparece para administrador (conveniência), e a
    trava real é a RLS de `permissoes_perfil`, que recusa escrita de
    qualquer papel que não seja administrador mesmo em chamada direta à
    API. Esconder a tela nunca é o que protege o dado. */
export default async function PermissoesLayout({
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

  if (!perfil || perfil.papel !== "administrador") {
    redirect("/cadastros");
  }

  return children;
}
