import { createClient } from "@/lib/supabase/client";
import type { PapelUsuario } from "@/types/domain";
import type { PermissaoCatalogo, PermissaoPerfil } from "@/types/permissoes";

/** Catálogo dos recursos configuráveis. Semente do sistema: a tabela não
    tem policy de escrita nenhuma, só é alterada por migration. */
export async function listarCatalogoPermissoes(): Promise<PermissaoCatalogo[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("permissoes_catalogo")
    .select("*")
    .order("ordem")
    .order("acao");
  if (error) throw error;
  return (data ?? []) as unknown as PermissaoCatalogo[];
}

/** Matriz de um papel. A RLS de `permissoes_perfil` já restringe ao
    tenant do usuário, então não é preciso filtrar por tenant aqui. */
export async function listarPermissoesDoPapel(
  papel: PapelUsuario
): Promise<PermissaoPerfil[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("permissoes_perfil")
    .select("papel, recurso, acao, permitido")
    .eq("papel", papel);
  if (error) throw error;
  return (data ?? []) as unknown as PermissaoPerfil[];
}

/** Permissões efetivas do usuário logado, para o frontend refletir o que
    o banco vai permitir. A RLS de `permissoes_perfil` já limita ao tenant;
    aqui filtra-se pelo papel de quem está logado.

    Isto é espelho, não trava: quem protege é a RLS das tabelas de dados.
    Se esta consulta falhar, o pior que acontece é um botão sumir. */
export async function listarMinhasPermissoes(
  papel: PapelUsuario
): Promise<PermissaoPerfil[]> {
  return listarPermissoesDoPapel(papel);
}

export interface AlteracaoPermissao {
  recurso: string;
  acao: string;
  permitido: boolean;
}

/** Grava só o que mudou, com `update` linha a linha em vez de upsert: as
    linhas já existem todas (a semente da Fase 1 criou a matriz completa,
    inclusive as negadas), então não há caso de inserção. Isso também
    mantém a policy de INSERT sem uso, reduzindo a superfície.

    Quem não é administrador é recusado pela RLS da tabela — esconder o
    menu é conveniência, a trava é no banco. */
export async function salvarPermissoes(
  papel: PapelUsuario,
  alteracoes: AlteracaoPermissao[]
): Promise<void> {
  if (alteracoes.length === 0) return;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  for (const alteracao of alteracoes) {
    const { error } = await supabase
      .from("permissoes_perfil")
      .update({
        permitido: alteracao.permitido,
        atualizado_por: user?.id ?? null,
        atualizado_em: new Date().toISOString(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- sem Database gerado; ver dashboard.ts
      } as any)
      .eq("papel", papel)
      .eq("recurso", alteracao.recurso)
      .eq("acao", alteracao.acao);
    if (error) throw error;
  }
}
