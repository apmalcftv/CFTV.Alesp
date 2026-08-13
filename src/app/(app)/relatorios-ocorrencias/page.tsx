import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { temPermissao } from "@/lib/permissoes-servidor";
import { RelatoriosOcorrenciasClient } from "./relatorios-ocorrencias-client";

export const metadata: Metadata = { title: "Relatórios de Ocorrências" };

/** A checagem vive aqui, e não num layout, porque esta é a rota-índice do
    módulo: um layout próprio valeria também para todas as sub-rotas, que
    já têm as suas. */
export default async function RelatoriosOcorrenciasPage() {
  if (!(await temPermissao("cmal_relatorios", "visualizar"))) {
    redirect("/dashboard");
  }
  return <RelatoriosOcorrenciasClient />;
}
