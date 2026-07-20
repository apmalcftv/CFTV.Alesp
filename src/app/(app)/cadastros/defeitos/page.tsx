import type { Metadata } from "next";
import { DefeitosClient } from "./defeitos-client";

export const metadata: Metadata = { title: "Tipos de defeito" };

export default function DefeitosPage() {
  return <DefeitosClient />;
}
