import { createClient } from "@/lib/supabase/client";

export async function fetchTotalExportacoesRelatorio(): Promise<number> {
  const supabase = createClient();
  const { count, error } = await supabase
    .from("relatorio_exportacoes")
    .select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}
