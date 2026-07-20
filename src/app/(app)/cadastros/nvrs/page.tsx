import type { Metadata } from "next";
import { NvrsClient } from "./nvrs-client";

export const metadata: Metadata = { title: "NVRs" };

export default function NvrsPage() {
  return <NvrsClient />;
}
