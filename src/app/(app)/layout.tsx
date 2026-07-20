import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getTenantAtual } from "@/lib/tenant-server";
import { AppShell } from "@/components/layout/app-shell";
import { TenantBrandingProvider } from "@/components/tenant-branding";
import { BRANDING_PRODUTO, type Perfil } from "@/types/domain";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getTenantAtual();
  const nome =
    tenant?.branding?.nome_sistema ?? tenant?.nome ?? BRANDING_PRODUTO.nome_sistema;
  return {
    title: { default: nome, template: `%s · ${nome}` },
  };
}

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [{ data: perfil }, tenant] = await Promise.all([
    supabase
      .from("perfis")
      .select("id, nome, papel, empresa_id, status")
      .eq("id", user.id)
      .single<Perfil & { status: string }>(),
    getTenantAtual(),
  ]);

  // conta pendente/rejeitada/bloqueada/excluída: nenhuma tela do sistema
  if (!perfil || perfil.status !== "aprovado") {
    redirect("/pendente");
  }

  return (
    <TenantBrandingProvider tenant={tenant}>
      <AppShell perfil={perfil}>{children}</AppShell>
    </TenantBrandingProvider>
  );
}
