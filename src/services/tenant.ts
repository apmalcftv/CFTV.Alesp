import { createClient } from "@/lib/supabase/client";
import type { Branding, TenantAtual } from "@/types/domain";

/** Tenant do usuário logado (RLS devolve apenas o próprio). */
export async function fetchMeuTenant(): Promise<TenantAtual | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("tenants")
    .select("id, slug, nome, branding")
    .limit(1)
    .maybeSingle<TenantAtual>();
  if (error) throw error;
  return data;
}

export async function atualizarBranding(
  tenantId: string,
  nome: string,
  branding: Branding
): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from("tenants")
    .update({ nome, branding })
    .eq("id", tenantId);
  if (error) throw error;
}
