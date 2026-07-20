import type { Metadata } from "next";
import { EmpresasClient } from "./empresas-client";

export const metadata: Metadata = { title: "Empresas" };

export default function EmpresasPage() {
  return <EmpresasClient />;
}
