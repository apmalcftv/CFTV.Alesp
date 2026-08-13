import { redirect } from "next/navigation";
import { temPermissao } from "@/lib/permissoes-servidor";

/** Guarda da tela "Dashboard CMAL". Recurso do tipo "tela": a permissão controla o
    menu e o acesso à rota. Os dados exibidos aqui vêm de
    `relatorios_ocorrencia`, cuja leitura é governada por
    `cmal_relatorios · visualizar` na RLS. */
export default async function PainelCmalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await temPermissao("cmal_painel", "visualizar"))) {
    redirect("/dashboard");
  }

  return children;
}
