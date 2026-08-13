import type { Metadata } from "next";
import { NotificacoesClient } from "./notificacoes-client";

export const metadata: Metadata = { title: "Notificações de Câmeras" };

export default function NotificacoesPage() {
  return <NotificacoesClient />;
}
