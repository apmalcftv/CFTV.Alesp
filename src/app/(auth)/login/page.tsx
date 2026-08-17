import type { Metadata } from "next";
import { Cctv } from "lucide-react";
import { getBrandingPublico } from "@/lib/branding-publico";
import { BRANDING_PRODUTO } from "@/types/domain";
import { LoginForm } from "./login-form";

// title.absolute ignora o template "%s · Gestão de CFTV" do layout raiz —
// aqui a marca é sempre CFTV Alesp, independente do nome neutro do produto.
export const metadata: Metadata = { title: { absolute: "Entrar - CFTV Alesp" } };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const publico = await getBrandingPublico(t);
  const corPrimaria = publico?.branding?.cores?.primary;
  // Sem ?t=slug (é como o PWA abre — start_url não carrega slug nenhum),
  // publico é null e cai na logo padrão do produto — mesmo padrão que já
  // valia para nome/descrição, só que agora também para o logo.
  const logoUrl = publico?.branding?.logo_url ?? BRANDING_PRODUTO.logo_url;

  return (
    <main
      className="relative flex min-h-screen items-center justify-center overflow-hidden bg-sidebar p-4"
      style={corPrimaria ? { backgroundColor: corPrimaria } : undefined}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 900px 560px at 10% -10%, color-mix(in oklch, var(--sidebar-primary) 12%, transparent), transparent 60%), radial-gradient(ellipse 800px 560px at 100% 110%, color-mix(in oklch, var(--sidebar-ring) 10%, transparent), transparent 60%)",
        }}
      />
      <div
        aria-hidden
        className="textura-pontos pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_800px_500px_at_50%_0%,black,transparent)]"
      />
      <div className="relative w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-sidebar-accent-foreground">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- logo externo por tenant, ou o padrão do produto
            <img
              src={logoUrl}
              alt="CFTV Alesp"
              className="size-40 object-contain sm:size-56"
            />
          ) : (
            <Cctv className="size-16 text-sidebar-primary" />
          )}
        </div>
        <LoginForm
          tenantSlug={publico ? t : undefined}
          dominioEmail={publico?.branding?.dominio_email ?? null}
        />
        <p className="mt-6 text-center text-xs text-sidebar-foreground/70">
          Acesso restrito. Solicite credenciais ao administrador do sistema.
        </p>
      </div>
    </main>
  );
}
