"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, type NavItem } from "@/lib/navigation";
import { usePerfil } from "@/components/perfil-provider";
import { useMinhasPermissoes } from "@/hooks/use-permissoes";

interface Grupo {
  grupo: string;
  itens: NavItem[];
}

interface Modulo {
  modulo: string;
  grupos: Grupo[];
}

/** Agrupa em dois níveis (módulo → grupo) preservando a ordem de
    NAV_ITEMS. Como só junta entradas consecutivas, itens do mesmo par
    (módulo, grupo) precisam ficar contíguos no array de origem. */
function agrupar(itens: NavItem[]): Modulo[] {
  return itens.reduce<Modulo[]>((modulos, item) => {
    let modulo = modulos.at(-1);
    if (!modulo || modulo.modulo !== item.modulo) {
      modulo = { modulo: item.modulo, grupos: [] };
      modulos.push(modulo);
    }

    const grupo = modulo.grupos.at(-1);
    if (grupo && grupo.grupo === item.grupo) {
      grupo.itens.push(item);
    } else {
      modulo.grupos.push({ grupo: item.grupo, itens: [item] });
    }

    return modulos;
  }, []);
}

/** Href do item que deve aparecer como ativo: o mais específico entre os
    que casam com a rota atual. Sem isso, `/relatorios-ocorrencias`
    (prefixo de `/painel`, `/executivo` e `/notificacoes`) acenderia junto
    com o item da sub-rota. Rotas sem item próprio — `/…/[id]`, `/…/novo`,
    `/cadastros/*` — continuam acendendo o item-pai, que é o mais longo
    que casa. */
function hrefAtivo(pathname: string, itens: NavItem[]): string | null {
  let melhor: string | null = null;
  for (const { href } of itens) {
    const casa = pathname === href || pathname.startsWith(`${href}/`);
    if (casa && (melhor === null || href.length > melhor.length)) melhor = href;
  }
  return melhor;
}

export function SidebarNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const perfil = usePerfil();
  const { pode } = useMinhasPermissoes();
  // Dois modelos convivendo de propósito: itens com `recurso` consultam a
  // matriz configurável (hoje só o CMAL); os demais seguem por papel até o
  // módulo Câmeras ser migrado. Esconder o item é só a camada visual — as
  // rotas têm guarda no servidor e a RLS decide o acesso ao dado.
  const itens = NAV_ITEMS.filter((item) =>
    item.recurso
      ? pode(item.recurso, "visualizar")
      : !item.papeis || item.papeis.includes(perfil.papel)
  );
  const modulos = agrupar(itens);
  const ativoAtual = hrefAtivo(pathname, itens);

  // Cabeçalho só informa quando há algo para distinguir: com um módulo
  // visível não há o que separar, e um módulo de grupo único já é
  // descrito pelo próprio nome do módulo. Sem isso, papéis restritos
  // (empresa_contratada vê 1 item; gestor vê 1 item no módulo CMAL)
  // ficariam com mais títulos do que links.
  const mostrarModulo = modulos.length > 1;

  return (
    <nav className="flex flex-col gap-5 px-3">
      {modulos.map(({ modulo, grupos }) => {
        const mostrarGrupo = grupos.length > 1;
        return (
          <div key={modulo} className="flex flex-col gap-3">
            {mostrarModulo && (
              <div className="flex items-center gap-2 px-3">
                <span className="rotulo-mono text-sidebar-primary">{modulo}</span>
                <span
                  aria-hidden
                  className="h-px flex-1 bg-linear-to-r from-sidebar-border to-transparent"
                />
              </div>
            )}

            {grupos.map(({ grupo, itens: itensGrupo }) => (
              <div
                key={grupo}
                className={cn("flex flex-col gap-1", mostrarModulo && "pl-1.5")}
              >
                {mostrarGrupo && (
                  <span className="rotulo-mono px-3 text-sidebar-foreground/50">
                    {grupo}
                  </span>
                )}
                {itensGrupo.map((item) => {
                  const ativo = item.href === ativoAtual;
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
          </div>
        );
      })}
    </nav>
  );
}
