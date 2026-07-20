import type { Metadata } from "next";
import { OcorrenciasClient } from "./ocorrencias-client";

export const metadata: Metadata = { title: "Ocorrências" };

export default function OcorrenciasPage() {
  return <OcorrenciasClient />;
}
