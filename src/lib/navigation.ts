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

export interface NavItem {
  titulo: string;
  href: string;
  icone: LucideIcon;
  /** Papéis que veem este item — todos os papéis aprovados, se omitido */
  papeis?: PapelUsuario[];
  /** Rótulo do grupo visual na sidebar (apenas apresentação) */
  grupo: "Operação" | "Análise" | "Sistema";
}

const TODOS_MENOS_EMPRESA: PapelUsuario[] = [
  "administrador",
  "operador_cftc",
  "fiscal_alesp",
  "gestor",
];

export const NAV_ITEMS: NavItem[] = [
  {
    titulo: "Dashboard",
    href: "/dashboard",
    icone: LayoutDashboard,
    papeis: TODOS_MENOS_EMPRESA,
    grupo: "Operação",
  },
  {
    titulo: "Câmeras",
    href: "/cameras",
    icone: Cctv,
    papeis: ["administrador", "operador_cftc", "fiscal_alesp"],
    grupo: "Operação",
  },
  { titulo: "Ocorrências", href: "/ocorrencias", icone: ClipboardList, grupo: "Operação" },
  {
    titulo: "Relatórios de Ocorrências",
    href: "/relatorios-ocorrencias",
    icone: FileSearch,
    papeis: TODOS_MENOS_EMPRESA,
    grupo: "Operação",
  },
  {
    titulo: "Executivo",
    href: "/executivo",
    icone: TrendingUp,
    papeis: TODOS_MENOS_EMPRESA,
    grupo: "Análise",
  },
  {
    titulo: "Relatórios",
    href: "/relatorios",
    icone: FileText,
    papeis: TODOS_MENOS_EMPRESA,
    grupo: "Análise",
  },
  {
    titulo: "Notificações",
    href: "/notificacoes",
    icone: Bell,
    papeis: ["administrador", "operador_cftc", "fiscal_alesp"],
    grupo: "Análise",
  },
  {
    titulo: "Cadastros",
    href: "/cadastros",
    icone: FolderCog,
    papeis: ["administrador", "operador_cftc"],
    grupo: "Sistema",
  },
];
