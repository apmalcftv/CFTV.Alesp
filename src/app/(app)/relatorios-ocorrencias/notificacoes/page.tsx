import type { Metadata } from "next";
import { NotificacoesCmalClient } from "./notificacoes-client";

export const metadata: Metadata = { title: "Notificações CMAL" };

export default function NotificacoesCmalPage() {
  return <NotificacoesCmalClient />;
}
