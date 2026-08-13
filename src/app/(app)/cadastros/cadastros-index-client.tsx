"use client";

import Link from "next/link";
import {
  Building2,
  ChevronRight,
  Cctv,
  Factory,
  Landmark,
  MapPin,
  Palette,
  ShieldAlert,
  ShieldCheck,
  ShieldOff,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { usePerfil } from "@/components/perfil-provider";
import { podeVerCadastrosOperacionais } from "@/types/domain";
import { Card, CardContent } from "@/components/ui/card";

interface ItemCadastro {
  href: string;
  titulo: string;
  descricao: string;
  icone: LucideIcon;
}

const ITENS_OPERACIONAIS: ItemCadastro[] = [
  { href: "/cadastros/predios", titulo: "Prédios", descricao: "Prédios do Complexo ALESP", icone: Landmark },
  { href: "/cadastros/locais", titulo: "Locais", descricao: "Locais dentro de cada prédio", icone: MapPin },
  { href: "/cadastros/fabricantes", titulo: "Fabricantes", descricao: "Fabricantes das câmeras", icone: Factory },
  { href: "/cadastros/modelos", titulo: "Modelos de câmera", descricao: "Modelos por fabricante", icone: Cctv },
  { href: "/cadastros/nvrs", titulo: "NVRs", descricao: "Gravadores em rede", icone: Building2 },
  { href: "/cadastros/empresas", titulo: "Empresas", descricao: "Empresas de manutenção", icone: Building2 },
  { href: "/cadastros/tecnicos", titulo: "Técnicos", descricao: "Técnicos das empresas", icone: Wrench },
  { href: "/cadastros/defeitos", titulo: "Tipos de defeito", descricao: "Categorias de defeito", icone: ShieldAlert },
];

const ITENS_ADMIN: ItemCadastro[] = [
  { href: "/cadastros/usuarios", titulo: "Usuários", descricao: "Aprovação e papéis de acesso", icone: Users },
  { href: "/cadastros/permissoes", titulo: "Permissões", descricao: "O que cada perfil pode fazer", icone: ShieldCheck },
  { href: "/cadastros/marca", titulo: "Marca e identidade", descricao: "Nome, textos e cores", icone: Palette },
];

function CardCadastro({ item }: { item: ItemCadastro }) {
  return (
    <Link href={item.href}>
      <Card className="h-full transition-all hover:-translate-y-0.5 hover:shadow-md">
        <CardContent className="flex items-center gap-4 p-5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <item.icone className="size-6" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-medium">{item.titulo}</p>
            <p className="text-xs text-muted-foreground">{item.descricao}</p>
          </div>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
        </CardContent>
      </Card>
    </Link>
  );
}

export function CadastrosIndexClient() {
  const perfil = usePerfil();
  const veOperacionais = podeVerCadastrosOperacionais(perfil.papel);
  const eAdministrador = perfil.papel === "administrador";

  if (!veOperacionais && !eAdministrador) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-24 text-center">
        <ShieldOff className="size-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Seu papel não tem acesso aos cadastros do sistema
        </p>
      </div>
    );
  }

  const itens = [
    ...(veOperacionais ? ITENS_OPERACIONAIS : []),
    ...(eAdministrador ? ITENS_ADMIN : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Cadastros
        </h1>
        <p className="text-sm text-muted-foreground">
          Configurações e catálogos da sua organização
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {itens.map((item) => (
          <CardCadastro key={item.href} item={item} />
        ))}
      </div>
    </div>
  );
}
