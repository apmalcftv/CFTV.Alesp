"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { useAtualizarBranding, useMeuTenant } from "@/hooks/use-tenant";
import type { Branding } from "@/types/domain";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

function CampoCor({
  id,
  rotulo,
  valor,
  onChange,
}: {
  id: string;
  rotulo: string;
  valor: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{rotulo}</Label>
      <div className="flex items-center gap-2">
        <input
          id={id}
          type="color"
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          className="size-9 shrink-0 cursor-pointer rounded-md border bg-transparent p-0.5"
        />
        <Input
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          className="font-mono text-xs"
          maxLength={7}
          aria-label={`${rotulo} (hex)`}
        />
      </div>
    </div>
  );
}

export function MarcaForm() {
  const router = useRouter();
  const { data: tenant, isPending } = useMeuTenant();
  const salvar = useAtualizarBranding();

  const [nome, setNome] = useState("");
  const [form, setForm] = useState<Required<Omit<Branding, "cores" | "logo_url">> & {
    logo_url: string;
    primary: string;
    secondary: string;
    accent: string;
  }>({
    nome_sistema: "",
    subtitulo: "",
    descricao: "",
    rodape: "",
    dominio_email: "",
    logo_url: "",
    primary: "#0b0f34",
    secondary: "#3b82f6",
    accent: "#f59e0b",
  });

  useEffect(() => {
    if (!tenant) return;
    const b = tenant.branding ?? {};
    setNome(tenant.nome);
    setForm({
      nome_sistema: b.nome_sistema ?? tenant.nome,
      subtitulo: b.subtitulo ?? "",
      descricao: b.descricao ?? "",
      rodape: b.rodape ?? "",
      dominio_email: b.dominio_email ?? "",
      logo_url: b.logo_url ?? "",
      primary: b.cores?.primary ?? "#0b0f34",
      secondary: b.cores?.secondary ?? "#3b82f6",
      accent: b.cores?.accent ?? "#f59e0b",
    });
  }, [tenant]);

  if (isPending) {
    return <Skeleton className="h-96 rounded-xl" />;
  }
  if (!tenant) {
    return (
      <p className="text-sm text-muted-foreground">
        Não foi possível carregar os dados da organização.
      </p>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    salvar.mutate(
      {
        tenantId: tenant!.id,
        nome: nome.trim() || tenant!.nome,
        branding: {
          nome_sistema: form.nome_sistema.trim() || undefined,
          subtitulo: form.subtitulo.trim() || undefined,
          descricao: form.descricao.trim() || undefined,
          rodape: form.rodape.trim() || undefined,
          dominio_email: form.dominio_email.trim() || undefined,
          logo_url: form.logo_url.trim() || undefined,
          cores: {
            primary: form.primary,
            secondary: form.secondary,
            accent: form.accent,
          },
        },
      },
      { onSuccess: () => router.refresh() }
    );
  }

  const campo = (k: keyof typeof form) => ({
    value: form[k] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [k]: e.target.value })),
  });

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Textos</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome da organização</Label>
            <Input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nome_sistema">Nome do sistema</Label>
            <Input id="nome_sistema" placeholder="Ex.: CFTV ALESP" {...campo("nome_sistema")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subtitulo">Subtítulo (sidebar)</Label>
            <Input id="subtitulo" placeholder="Central de monitoramento" {...campo("subtitulo")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição (tela de login)</Label>
            <Input id="descricao" placeholder="Gerenciamento do circuito de câmeras" {...campo("descricao")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="rodape">Rodapé da sidebar</Label>
            <Input id="rodape" placeholder="Nome institucional" {...campo("rodape")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="dominio_email">Domínio de e-mail (placeholder do login)</Label>
            <Input id="dominio_email" placeholder="exemplo.gov.br" {...campo("dominio_email")} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="logo_url">URL do logotipo (opcional)</Label>
            <Input id="logo_url" type="url" placeholder="https://…/logo.png" {...campo("logo_url")} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Cores da marca</CardTitle>
          <p className="text-xs text-muted-foreground">
            As cores dos gráficos e do semáforo de status não mudam — são
            validadas para contraste e daltonismo.
          </p>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-3">
          <CampoCor
            id="cor-primaria"
            rotulo="Primária (sidebar/botões)"
            valor={form.primary}
            onChange={(v) => setForm((f) => ({ ...f, primary: v }))}
          />
          <CampoCor
            id="cor-secundaria"
            rotulo="Secundária (destaques)"
            valor={form.secondary}
            onChange={(v) => setForm((f) => ({ ...f, secondary: v }))}
          />
          <CampoCor
            id="cor-acento"
            rotulo="Acento (alertas de marca)"
            valor={form.accent}
            onChange={(v) => setForm((f) => ({ ...f, accent: v }))}
          />
        </CardContent>
      </Card>

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={salvar.isPending}>
          {salvar.isPending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          Salvar identidade
        </Button>
        <span className="text-xs text-muted-foreground">
          Somente administradores conseguem salvar (regra no banco).
        </span>
      </div>
    </form>
  );
}
