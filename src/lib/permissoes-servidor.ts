import { createClient } from "@/lib/supabase/server";

/** Checagem de permissão nos guardas de rota (Server Components).
 *
 * Chama a MESMA função SQL que as policies consultam, via RPC — não
 * reimplementa a regra em TypeScript. Assim guarda de rota e RLS nunca
 * podem divergir: são literalmente o mesmo código rodando no Postgres,
 * com o mesmo curto-circuito de administrador e o mesmo "nega por
 * omissão".
 *
 * Vale lembrar o papel de cada camada: isto evita renderizar uma tela
 * proibida, mas quem protege o dado é a RLS. Se esta checagem falhasse,
 * a tela abriria vazia — nunca com dado indevido. */
export async function temPermissao(recurso: string, acao: string): Promise<boolean> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("tem_permissao", {
    p_recurso: recurso,
    p_acao: acao,
  });
  // Erro de rede ou de RPC nega o acesso: falhar fechado é o
  // comportamento seguro para uma checagem de autorização.
  if (error) return false;
  return data === true;
}

/** Verdadeiro se o usuário enxerga pelo menos um recurso do módulo —
    usado pelo layout do CMAL para decidir se a pessoa tem o que fazer
    ali dentro. */
export async function temAlgumaPermissao(
  recursos: readonly string[],
  acao: string
): Promise<boolean> {
  const resultados = await Promise.all(recursos.map((r) => temPermissao(r, acao)));
  return resultados.some(Boolean);
}
