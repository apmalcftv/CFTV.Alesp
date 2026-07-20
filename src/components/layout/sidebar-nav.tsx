"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/navigation";
import { usePerfil } from "@/components/perfil-provider";

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const perfil = usePerfil();
  const itens = NAV_ITEMS.filter((item) => !item.papeis || item.papeis.includes(perfil.papel));

  const grupos = itens.reduce<{ grupo: string; itens: typeof itens }[]>((acc, item) => {
    const atual = acc.at(-1);
    if (atual && atual.grupo === item.grupo) {
      atual.itens.push(item);
    } else {
      acc.push({ grupo: item.grupo, itens: [item] });
    }
    return acc;
  }, []);

  return (
    <nav className="flex flex-col gap-4 px-3">
      {grupos.map(({ grupo, itens: itensGrupo }) => (
        <div key={grupo} className="flex flex-col gap-1">
          <span className="rotulo-mono px-3 text-sidebar-foreground/50">
            {grupo}
          </span>
          {itensGrupo.map((item) => {
            const ativo =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-all duration-200 before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-sidebar-primary before:shadow-[0_0_8px_var(--sidebar-primary)] before:transition-transform before:duration-200 before:content-['']",
                  ativo
                    ? "bg-sidebar-accent text-sidebar-primary before:scale-y-100"
                    : "text-sidebar-foreground before:scale-y-0 hover:translate-x-0.5 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icone className="size-5 shrink-0" />
                {item.titulo}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
