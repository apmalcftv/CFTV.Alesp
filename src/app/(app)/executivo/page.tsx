import type { Metadata } from "next";
import { ExecutivoClient } from "./executivo-client";

export const metadata: Metadata = { title: "Visão Executiva" };

export default function ExecutivoPage() {
  return <ExecutivoClient />;
}
