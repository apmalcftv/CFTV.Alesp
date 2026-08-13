import type { Metadata } from "next";
import { PermissoesClient } from "./permissoes-client";

export const metadata: Metadata = { title: "Permissões" };

export default function PermissoesPage() {
  return <PermissoesClient />;
}
