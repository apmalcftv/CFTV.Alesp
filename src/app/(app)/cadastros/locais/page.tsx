import type { Metadata } from "next";
import { LocaisClient } from "./locais-client";

export const metadata: Metadata = { title: "Locais" };

export default function LocaisPage() {
  return <LocaisClient />;
}
