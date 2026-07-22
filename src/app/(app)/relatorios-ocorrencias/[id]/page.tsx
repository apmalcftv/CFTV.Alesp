import type { Metadata } from "next";
import { DetalheRelatorioClient } from "./detalhe-client";

export const metadata: Metadata = { title: "Relatório de Ocorrência" };

export default async function DetalheRelatorioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DetalheRelatorioClient id={id} />;
}
