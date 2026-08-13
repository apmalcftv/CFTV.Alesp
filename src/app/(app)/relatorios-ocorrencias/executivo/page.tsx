import type { Metadata } from "next";
import { ExecutivoCmalClient } from "./executivo-client";

export const metadata: Metadata = { title: "Executivo CMAL" };

export default function ExecutivoCmalPage() {
  return <ExecutivoCmalClient />;
}
