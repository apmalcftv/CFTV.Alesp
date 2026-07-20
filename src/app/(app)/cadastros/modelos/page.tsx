import type { Metadata } from "next";
import { ModelosClient } from "./modelos-client";

export const metadata: Metadata = { title: "Modelos de câmera" };

export default function ModelosPage() {
  return <ModelosClient />;
}
