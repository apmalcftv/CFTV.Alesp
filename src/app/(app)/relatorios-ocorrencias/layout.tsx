import { redirect } from "next/navigation";
import { temAlgumaPermissao } from "@/lib/permissoes-servidor";

/** Recursos do módulo CMAL. Quem não enxerga nenhum deles não tem o que
    fazer aqui dentro. */
export const RECURSOS_CMAL = [
  "cmal_painel",
  "cmal_relatorios",
  "cmal_executivo",
  "cmal_notificacoes",
] as const;

/** Guarda do módulo "Relatórios de Ocorrências".
 *
 * Deixou de comparar papéis: hoje consulta a matriz configurável, pela
 * mesma função SQL que as policies usam. Cada sub-rota tem a sua própria
 * checagem do recurso específico — esta aqui só barra quem não enxerga
 * absolutamente nada do módulo.
 *
 * O layout do grupo `(app)` já garantiu usuário autenticado e aprovado.
 * A trava real dos dados continua sendo a RLS; este redirect existe para
 * não abrir uma tela que viria vazia. */
export default async function RelatoriosOcorrenciasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await temAlgumaPermissao(RECURSOS_CMAL, "visualizar"))) {
    redirect("/dashboard");
  }

  return children;
}
