import type { Metadata } from "next";
import { Cctv } from "lucide-react";
import { getBrandingPublico } from "@/lib/branding-publico";
import { BRANDING_PRODUTO } from "@/types/domain";
import { CadastroForm } from "./cadastro-form";

export const metadata: Metadata = { title: "Criar conta" };

export default async function CadastroPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>;
}) {
  const { t } = await searchParams;
  const publico = await getBrandingPublico(t);
  const nome =
    publico?.branding?.nome_sistema ?? publico?.nome ?? BRANDING_PRODUTO.nome_sistema;
  const descricao = publico?.branding?.descricao ?? BRANDING_PRODUTO.descricao;
  const corPrimaria = publico?.branding?.cores?.primary;

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
        <div className="mb-8 flex flex-col items-center gap-3 text-sidebar-accent-foreground">
          <div className="flex size-14 items-center justify-center overflow-hidden rounded-2xl bg-sidebar-accent">
            {publico?.branding?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element -- logo externo por tenant
              <img
                src={publico.branding.logo_url}
                alt=""
                className="size-14 object-contain"
              />
            ) : (
              <Cctv className="size-8 text-sidebar-primary" />
            )}
          </div>
          <div className="text-center">
            <h1 className="font-heading text-2xl font-semibold tracking-tight">
              Criar conta
            </h1>
            <p className="text-sm text-sidebar-foreground">
              {nome} · {descricao}
            </p>
          </div>
        </div>
        <CadastroForm
          tenantSlug={publico ? t : undefined}
          dominioEmail={publico?.branding?.dominio_email ?? null}
        />
        <p className="mt-6 text-center text-xs text-sidebar-foreground/70">
          O cadastro requer um convite do administrador — o papel e a
          organização da sua conta vêm definidos no convite.
        </p>
      </div>
    </main>
  );
}
