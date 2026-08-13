import type { Metadata } from "next";
import { ExecutivoClient } from "./executivo-client";

export const metadata: Metadata = { title: "Executivo Câmeras" };

export default function ExecutivoPage() {
  return <ExecutivoClient />;
}
