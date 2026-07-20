import type { Metadata } from "next";
import { DetalheOcorrenciaClient } from "./detalhe-client";

export const metadata: Metadata = { title: "Ocorrência" };

export default async function DetalheOcorrenciaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <DetalheOcorrenciaClient id={id} />;
}
