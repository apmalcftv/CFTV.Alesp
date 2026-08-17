"use client";

import { useState } from "react";
import Link from "next/link";
import { Cctv, Menu } from "lucide-react";
import type { Perfil } from "@/types/domain";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { textosDoBranding, useTenant } from "@/components/tenant-branding";
import { PerfilProvider } from "@/components/perfil-provider";
import { SidebarNav } from "./sidebar-nav";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";

function Logo() {
  const textos = textosDoBranding(useTenant());
  return (
    <Link
      href="/dashboard"
      className="flex items-center gap-3 px-6 py-5 text-sidebar-accent-foreground"
    >
      {textos.logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- logo externo por tenant
        <img
          src={textos.logoUrl}
          alt=""
          className="size-12 shrink-0 rounded-lg object-contain"
        />
      ) : (
        <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
          <Cctv className="size-6" />
        </div>
      )}
      <div className="leading-tight">
        <div className="flex items-center gap-1.5 font-heading text-base font-semibold">
          <span
            aria-hidden
            className="size-1.5 shrink-0 animate-pulse rounded-full bg-sidebar-primary shadow-[0_0_6px_var(--sidebar-primary)]"
          />
          {textos.nomeSistema}
        </div>
        <div className="text-[11px] text-sidebar-foreground">
          {textos.subtitulo}
        </div>
      </div>
    </Link>
  );
}

export function AppShell({
  perfil,
  children,
}: {
  perfil: Perfil;
  children: React.ReactNode;
}) {
  const [menuAberto, setMenuAberto] = useState(false);
  const textos = textosDoBranding(useTenant());

  return (
    <PerfilProvider perfil={perfil}>
      <div className="flex min-h-screen w-full">
        {/* Sidebar fixa (desktop) */}
        <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col bg-sidebar lg:flex">
          <Logo />
          <div className="flex-1 overflow-y-auto py-2">
            <SidebarNav />
          </div>
          {textos.rodape && (
            <div className="textura-pontos border-t border-sidebar-border px-6 py-4 text-[11px] text-sidebar-foreground/70">
              {textos.rodape}
            </div>
          )}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col lg:pl-60">
          {/* Header */}
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background/95 px-4 backdrop-blur supports-backdrop-filter:bg-background/80">
            {/* Menu mobile */}
            <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Abrir menu"
                >
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 bg-sidebar p-0 border-sidebar-border">
                <SheetHeader className="sr-only">
                  <SheetTitle>Menu de navegação</SheetTitle>
                </SheetHeader>
                <Logo />
                {/* flex-1 + overflow: com dois níveis de cabeçalho o menu
                    passa de 700px de altura e não cabe inteiro num celular —
                    sem isso os últimos itens ficam inalcançáveis. A sidebar
                    fixa do desktop já tem o mesmo tratamento. */}
                <div className="min-h-0 flex-1 overflow-y-auto py-2">
                  <SidebarNav onNavigate={() => setMenuAberto(false)} />
                </div>
              </SheetContent>
            </Sheet>

            <div className="flex-1" />
            <ThemeToggle />
            <UserMenu perfil={perfil} />
          </header>

          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </div>
    </PerfilProvider>
  );
}
