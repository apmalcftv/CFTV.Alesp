import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Branding } from "@/types/domain";

export interface BrandingPublico {
  nome: string;
  branding: Branding;
}

/** Branding público de um tenant pelo slug (?t=slug nas telas de auth).
    Retorna null para slug ausente/inválido — cai na marca neutra do produto. */
export const getBrandingPublico = cache(
  async (slug: string | undefined): Promise<BrandingPublico | null> => {
    if (!slug || !/^[a-z0-9-]+$/.test(slug)) return null;
    const supabase = await createClient();
    const { data } = await supabase.rpc("branding_publico", { p_slug: slug });
    return (data as BrandingPublico | null) ?? null;
  }
);
