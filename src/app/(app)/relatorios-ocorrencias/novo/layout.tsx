import { redirect } from "next/navigation";
import { temPermissao } from "@/lib/permissoes-servidor";

/** Guarda extra só desta rota: quem enxerga o módulo mas não tem
    permissão de criar não deve nem ver o formulário — sem isto, digitando
    a URL direto, apareceria a tela de criação para alguém cujo INSERT a
    RLS vai recusar. */
export default async function NovoRelatorioLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!(await temPermissao("cmal_relatorios", "criar"))) {
    redirect("/relatorios-ocorrencias");
  }

  return children;
}
