import type { Metadata } from "next";
import { TecnicosClient } from "./tecnicos-client";

export const metadata: Metadata = { title: "Técnicos" };

export default function TecnicosPage() {
  return <TecnicosClient />;
}
