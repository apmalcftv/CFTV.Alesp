import type { Metadata } from "next";
import { CadastrosIndexClient } from "./cadastros-index-client";

export const metadata: Metadata = { title: "Cadastros" };

export default function CadastrosPage() {
  return <CadastrosIndexClient />;
}
