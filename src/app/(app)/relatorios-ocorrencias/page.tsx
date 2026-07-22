import type { Metadata } from "next";
import { RelatoriosOcorrenciasClient } from "./relatorios-ocorrencias-client";

export const metadata: Metadata = { title: "Relatórios de Ocorrências" };

export default function RelatoriosOcorrenciasPage() {
  return <RelatoriosOcorrenciasClient />;
}
