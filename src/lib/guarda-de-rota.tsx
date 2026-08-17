import { redirect } from "next/navigation";
import { temPermissao } from "@/lib/permissoes-servidor";

/** Fábrica de guarda de rota por recurso.
 *
 * O módulo Câmeras tem 14 rotas e nenhuma tinha guarda de servidor antes
 * desta fase — o menu escondia, mas a URL abria. Cada `layout.tsx` do
 * módulo passa a exportar uma guarda criada por aqui, em vez de repetir
 * a mesma dúzia de linhas catorze vezes.
 *
 * A checagem chama a MESMA função SQL que as policies consultam, por RPC:
 * guarda de rota e RLS não têm como divergir. Isto evita renderizar uma
 * tela proibida; quem protege o dado é a RLS. */
export function criarGuardaDeRota(recurso: string, destino = "/dashboard") {
  return async function GuardaDeRota({ children }: { children: React.ReactNode }) {
    if (!(await temPermissao(recurso, "visualizar"))) {
      redirect(destino);
    }
    return children;
  };
}
