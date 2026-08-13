import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { temPermissao } from "@/lib/permissoes-servidor";
import { DetalheRelatorioClient } from "./detalhe-client";

export const metadata: Metadata = { title: "Relatório de Ocorrência" };

export default async function DetalheRelatorioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  if (!(await temPermissao("cmal_relatorios", "visualizar"))) {
    redirect("/dashboard");
  }
  const { id } = await params;
  return <DetalheRelatorioClient id={id} />;
}
