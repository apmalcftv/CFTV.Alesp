import type { Metadata } from "next";
import { CamerasClient } from "./cameras-client";

export const metadata: Metadata = { title: "Câmeras" };

export default function CamerasPage() {
  return <CamerasClient />;
}
