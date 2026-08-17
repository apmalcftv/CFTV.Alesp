"use client";

import { createContext, useContext, useMemo } from "react";
import type { Branding, TenantAtual } from "@/types/domain";
import { BRANDING_PRODUTO } from "@/types/domain";

const TenantContext = createContext<TenantAtual | null>(null);

export function useTenant() {
  return useContext(TenantContext);
}

/** Textos com fallback para a marca neutra do produto */
export function textosDoBranding(tenant: TenantAtual | null) {
  const b = tenant?.branding ?? {};
  return {
    nomeSistema: b.nome_sistema ?? tenant?.nome ?? BRANDING_PRODUTO.nome_sistema,
    subtitulo: b.subtitulo ?? BRANDING_PRODUTO.subtitulo,
    descricao: b.descricao ?? BRANDING_PRODUTO.descricao,
    rodape: b.rodape ?? null,
    dominioEmail: b.dominio_email ?? null,
    logoUrl: b.logo_url ?? BRANDING_PRODUTO.logo_url,
  };
}

/** Só as cores de MARCA são sobrescritas por tenant. As paletas de gráfico e
    de status permanecem as validadas (contraste/daltonismo) do tema base. */
export function cssVarsDoBranding(branding: Branding | undefined): string {
  const c = branding?.cores;
  if (!c) return "";
  const claras: string[] = [];
  const escuras: string[] = [];
  if (c.primary) {
    claras.push(`--primary:${c.primary}`, `--sidebar:${c.primary}`);
  }
  if (c.secondary) {
    claras.push(`--ring:${c.secondary}`, `--sidebar-primary:${c.secondary}`);
    escuras.push(`--ring:${c.secondary}`, `--sidebar-primary:${c.secondary}`);
  }
  if (c.accent) {
    claras.push(`--brand-accent:${c.accent}`);
    escuras.push(`--brand-accent:${c.accent}`);
  }
  let css = "";
  // :root:not(.dark) — sem o :not(.dark), essa regra empata em especificidade
  // com .dark{} e, por vir depois no DOM (style injetado em runtime), vencia
  // a cascata mesmo no tema escuro, sobrescrevendo --primary com uma cor de
  // marca que pode não ter contraste nenhum no fundo escuro novo.
  if (claras.length) css += `:root:not(.dark){${claras.join(";")}}`;
  if (escuras.length) css += `.dark{${escuras.join(";")}}`;
  return css;
}

export function TenantBrandingProvider({
  tenant,
  children,
}: {
  tenant: TenantAtual | null;
  children: React.ReactNode;
}) {
  const css = useMemo(() => cssVarsDoBranding(tenant?.branding), [tenant]);

  return (
    <TenantContext.Provider value={tenant}>
      {css && <style data-tenant-branding>{css}</style>}
      {children}
    </TenantContext.Provider>
  );
}
