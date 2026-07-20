import type { Metadata } from "next";
import { PrediosClient } from "./predios-client";

export const metadata: Metadata = { title: "Prédios" };

export default function PrediosPage() {
  return <PrediosClient />;
}
