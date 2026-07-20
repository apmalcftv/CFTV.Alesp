import type { Metadata } from "next";
import { FabricantesClient } from "./fabricantes-client";

export const metadata: Metadata = { title: "Fabricantes" };

export default function FabricantesPage() {
  return <FabricantesClient />;
}
