import type { Metadata } from "next";
import { NovoRelatorioClient } from "./novo-relatorio-client";

export const metadata: Metadata = { title: "Novo relatório de ocorrência" };

export default function NovoRelatorioPage() {
  return <NovoRelatorioClient />;
}
