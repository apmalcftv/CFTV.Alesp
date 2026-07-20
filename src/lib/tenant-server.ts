import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { TenantAtual } from "@/types/domain";

/** Tenant do usuário logado, memoizado por requisição (layout + metadata). */
export const getTenantAtual = cache(async (): Promise<TenantAtual | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("tenants")
    .select("id, slug, nome, branding")
    .limit(1)
    .maybeSingle<TenantAtual>();
  return data ?? null;
});
