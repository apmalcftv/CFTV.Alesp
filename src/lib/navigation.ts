import {
  Bell,
  Cctv,
  ClipboardList,
  FileSearch,
  FileText,
  FolderCog,
  LayoutDashboard,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";
import type { PapelUsuario } from "@/types/domain";

/** Nível 1 da navegação: os domínios de negócio do sistema. "Câmeras"
    (manutenção do CFTV) e "Relatórios de Ocorrências" (investigação da
    CMAL) são independentes — não há nenhuma FK entre `ocorrencias` e
    `relatorios_ocorrencia`. "Sistema" é transversal aos dois: os
    catálogos de prédios/locais/câmeras alimentam ambos, por isso ele não
    pertence a nenhum dos dois módulos de negócio. */
export type ModuloSistema =
  | "Operação e Análise de Câmeras"
  | "CMAL"
  | "Sistema";

export interface NavItem {
  titulo: string;
  href: string;
  icone: LucideIcon;
  /** Papéis que veem este item. Sobrou só no índice de Cadastros, que é
      uma porta para os 8 catálogos mais as áreas exclusivas do
      Administrador (usuários, marca, permissões) — estas últimas ficam
      fora da matriz por decisão de projeto. Cada catálogo tem guarda
      própria por recurso na sua rota. */
  papeis?: readonly PapelUsuario[];
  /** Recurso da matriz configurável (Cadastros › Permissões). Quando
      presente, o item aparece se o usuário tiver `visualizar` nele, e
      `papeis` é ignorado. */
  recurso?: string;
  /** Nível 1 — módulo de negócio (apenas apresentação) */
  modulo: ModuloSistema;
  /** Nível 2 — subgrupo dentro do módulo (apenas apresentação) */
  grupo: string;
}


// A ordem deste array define a ordem do menu. `SidebarNav` agrupa por
// módulo e, dentro dele, por grupo — mantenha itens do mesmo par
// (módulo, grupo) contíguos.
export const NAV_ITEMS: NavItem[] = [
  // ---------- Operação e Análise de Câmeras ----------
  // Desde a Fase 3 estes itens seguem a matriz configurável, pelo campo
  // `recurso`, igual ao CMAL. Cada rota também tem guarda no servidor, e
  // a RLS das tabelas consulta a mesma matriz.
  {
    titulo: "Dashboard Câmeras",
    href: "/dashboard",
    icone: LayoutDashboard,
    recurso: "cameras_dashboard",
    modulo: "Operação e Análise de Câmeras",
    grupo: "Operação de Câmeras",
  },
  {
    titulo: "Câmeras",
    href: "/cameras",
    icone: Cctv,
    recurso: "cameras_inventario",
    modulo: "Operação e Análise de Câmeras",
    grupo: "Operação de Câmeras",
  },
  {
    titulo: "OS/Câmeras",
    href: "/ocorrencias",
    icone: ClipboardList,
    recurso: "cameras_os",
    modulo: "Operação e Análise de Câmeras",
    grupo: "Operação de Câmeras",
  },
  {
    titulo: "Executivo",
    href: "/executivo",
    icone: TrendingUp,
    recurso: "cameras_executivo",
    modulo: "Operação e Análise de Câmeras",
    grupo: "Análise de Câmeras",
  },
  {
    titulo: "Relatórios de Câmeras",
    href: "/relatorios",
    icone: FileText,
    recurso: "cameras_relatorios",
    modulo: "Operação e Análise de Câmeras",
    grupo: "Análise de Câmeras",
  },
  {
    titulo: "Notificações de Câmeras",
    href: "/notificacoes",
    icone: Bell,
    recurso: "cameras_notificacoes",
    modulo: "Operação e Análise de Câmeras",
    grupo: "Análise de Câmeras",
  },

  // ---------- CMAL (Central de Monitoramento) ----------
  // Os itens deste módulo não usam `papeis`: quem decide é a matriz
  // configurável em Cadastros › Permissões, pelo campo `recurso`. Cada
  // rota tem guarda própria no servidor e a RLS das tabelas consulta a
  // mesma matriz — esconder o item aqui é só a camada visual.
  {
    titulo: "Dashboard",
    href: "/relatorios-ocorrencias/painel",
    icone: LayoutDashboard,
    recurso: "cmal_painel",
    modulo: "CMAL",
    grupo: "Operação CMAL",
  },
  {
    titulo: "Relatórios de Ocorrências",
    href: "/relatorios-ocorrencias",
    icone: FileSearch,
    recurso: "cmal_relatorios",
    modulo: "CMAL",
    grupo: "Operação CMAL",
  },
  {
    titulo: "Executivo",
    href: "/relatorios-ocorrencias/executivo",
    icone: TrendingUp,
    recurso: "cmal_executivo",
    modulo: "CMAL",
    grupo: "Análise de Ocorrências",
  },
  {
    titulo: "Notificações",
    href: "/relatorios-ocorrencias/notificacoes",
    icone: Bell,
    recurso: "cmal_notificacoes",
    modulo: "CMAL",
    grupo: "Análise de Ocorrências",
  },

  // ---------- Sistema ----------
  {
    titulo: "Cadastros",
    href: "/cadastros",
    icone: FolderCog,
    papeis: ["administrador", "operador_cftc"],
    modulo: "Sistema",
    grupo: "Configuração",
  },
];
