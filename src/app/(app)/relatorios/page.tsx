import type { Metadata } from "next";
import { RelatoriosClient } from "./relatorios-client";

export const metadata: Metadata = { title: "Relatórios de Câmeras" };

export default function RelatoriosPage() {
  return <RelatoriosClient />;
}
