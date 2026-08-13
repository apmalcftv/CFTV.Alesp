import type { Metadata } from "next";
import { PainelCmalClient } from "./painel-client";

export const metadata: Metadata = { title: "Dashboard CMAL" };

export default function PainelCmalPage() {
  return <PainelCmalClient />;
}
