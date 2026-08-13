import type { Metadata } from "next";
import { OcorrenciasClient } from "./ocorrencias-client";

export const metadata: Metadata = { title: "OS/Câmeras" };

export default function OcorrenciasPage() {
  return <OcorrenciasClient />;
}
