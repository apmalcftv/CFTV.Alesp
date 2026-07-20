"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Ban,
  Key,
  Loader2,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  ShieldOff,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";
import {
  useAprovarUsuario,
  useBloquearUsuario,
  useEditarUsuario,
  useExcluirUsuario,
  usePerfis,
  useReativarUsuario,
  useRejeitarUsuario,
  useResetarSenha,
} from "@/hooks/use-usuarios";
import { hooksEmpresas } from "@/hooks/use-cadastros";
import { usePerfil } from "@/components/perfil-provider";
import { BadgeStatusUsuario } from "@/components/dashboard/badges";
import { PAPEL_LABEL, type PapelUsuario, type PerfilUsuario } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Form } from "@/components/ui/form";
import { CampoSelect, CampoTexto } from "@/components/cadastros/campos-formulario";

const fmtData = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const OPCOES_PAPEL = Object.entries(PAPEL_LABEL).map(([valor, rotulo]) => ({
  valor,
  rotulo,
}));

// ---------- Aprovação ----------

const schemaAprovacao = z.object({
  papel: z.string().min(1, "Selecione o papel"),
  empresa_id: z.string(),
});
type FormAprovacao = z.infer<typeof schemaAprovacao>;

function DialogAprovacao({
  usuario,
  onOpenChange,
}: {
  usuario: PerfilUsuario;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: empresas } = hooksEmpresas.useListar();
  const aprovar = useAprovarUsuario();
  const rejeitar = useRejeitarUsuario();

  const form = useForm<FormAprovacao>({
    resolver: zodResolver(schemaAprovacao),
    defaultValues: { papel: "", empresa_id: "" },
  });
  const papel = form.watch("papel");
  const opcoesEmpresa = (empresas ?? []).map((e) => ({ valor: e.id, rotulo: e.nome }));

  function onSubmit(v: FormAprovacao) {
    aprovar.mutate(
      { id: usuario.id, papel: v.papel as PapelUsuario, empresaId: v.empresa_id || null },
      { onSuccess: () => onOpenChange(false) }
    );
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Cadastro pendente</DialogTitle>
        </DialogHeader>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Nome</dt>
            <dd>{usuario.nome}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">E-mail</dt>
            <dd>{usuario.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Telefone</dt>
            <dd>{usuario.telefone ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Empresa informada</dt>
            <dd>{usuario.empresa_informada ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Data de cadastro</dt>
            <dd>{fmtData.format(new Date(usuario.criado_em))}</dd>
          </div>
        </dl>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <CampoSelect
              control={form.control}
              name="papel"
              label="Papel"
              placeholder="Selecione o papel de acesso"
              opcoes={OPCOES_PAPEL}
            />
            {papel === "empresa_contratada" && (
              <CampoSelect
                control={form.control}
                name="empresa_id"
                label="Empresa"
                placeholder="Selecione a empresa"
                opcoes={opcoesEmpresa}
              />
            )}
            <DialogFooter className="sm:justify-between">
              <Button
                type="button"
                variant="outline"
                className="text-destructive hover:text-destructive"
                disabled={rejeitar.isPending}
                onClick={() => rejeitar.mutate(usuario.id, { onSuccess: () => onOpenChange(false) })}
              >
                <UserX className="size-4" />
                Rejeitar
              </Button>
              <Button type="submit" disabled={aprovar.isPending}>
                {aprovar.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <UserCheck className="size-4" />
                )}
                Aprovar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Editar ----------

const schemaEdicao = z.object({
  nome: z.string().min(1, "Informe o nome"),
  telefone: z.string(),
  empresa_informada: z.string(),
  papel: z.string(),
  empresa_id: z.string(),
});
type FormEdicao = z.infer<typeof schemaEdicao>;

function DialogEditar({
  usuario,
  onOpenChange,
}: {
  usuario: PerfilUsuario;
  onOpenChange: (open: boolean) => void;
}) {
  const { data: empresas } = hooksEmpresas.useListar();
  const editar = useEditarUsuario();

  const form = useForm<FormEdicao>({
    resolver: zodResolver(schemaEdicao),
    defaultValues: {
      nome: usuario.nome,
      telefone: usuario.telefone ?? "",
      empresa_informada: usuario.empresa_informada ?? "",
      papel: usuario.papel ?? "",
      empresa_id: usuario.empresa_id ?? "",
    },
  });
  const papel = form.watch("papel");
  const opcoesEmpresa = (empresas ?? []).map((e) => ({ valor: e.id, rotulo: e.nome }));

  function onSubmit(v: FormEdicao) {
    editar.mutate(
      {
        id: usuario.id,
        dados: {
          nome: v.nome,
          telefone: v.telefone || null,
          empresa_informada: v.empresa_informada || null,
          papel: (v.papel || null) as PapelUsuario | null,
          empresa_id: v.empresa_id || null,
        },
      },
      { onSuccess: () => onOpenChange(false) }
    );
  }

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
            <DialogHeader>
              <DialogTitle>Editar usuário</DialogTitle>
            </DialogHeader>
            <CampoTexto control={form.control} name="nome" label="Nome" />
            <CampoTexto control={form.control} name="telefone" label="Telefone (opcional)" />
            <CampoTexto
              control={form.control}
              name="empresa_informada"
              label="Empresa informada (opcional)"
            />
            <CampoSelect
              control={form.control}
              name="papel"
              label="Papel"
              placeholder="Selecione"
              opcoes={OPCOES_PAPEL}
            />
            {papel === "empresa_contratada" && (
              <CampoSelect
                control={form.control}
                name="empresa_id"
                label="Empresa"
                placeholder="Selecione a empresa"
                opcoes={opcoesEmpresa}
              />
            )}
            <DialogFooter>
              <Button type="submit" disabled={editar.isPending}>
                {editar.isPending && <Loader2 className="size-4 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Visualizar ----------

function DialogVisualizar({
  usuario,
  onOpenChange,
}: {
  usuario: PerfilUsuario;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{usuario.nome}</DialogTitle>
        </DialogHeader>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">E-mail</dt>
            <dd>{usuario.email ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Telefone</dt>
            <dd>{usuario.telefone ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Empresa informada</dt>
            <dd>{usuario.empresa_informada ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Papel</dt>
            <dd>{usuario.papel ? PAPEL_LABEL[usuario.papel] : "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Status</dt>
            <dd>
              <BadgeStatusUsuario status={usuario.status} />
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Cadastro</dt>
            <dd>{fmtData.format(new Date(usuario.criado_em))}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Aprovado em</dt>
            <dd>{usuario.aprovado_em ? fmtData.format(new Date(usuario.aprovado_em)) : "—"}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Último acesso</dt>
            <dd>{usuario.ultimo_acesso ? fmtData.format(new Date(usuario.ultimo_acesso)) : "—"}</dd>
          </div>
        </dl>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Página ----------

export function UsuariosClient() {
  const perfil = usePerfil();

  if (perfil.papel !== "administrador") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-24 text-center">
        <ShieldOff className="size-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Apenas administradores podem gerenciar usuários
        </p>
      </div>
    );
  }

  return <UsuariosConteudo />;
}

function UsuariosConteudo() {
  const { data: perfis, isPending } = usePerfis();
  const { data: empresas } = hooksEmpresas.useListar();
  const bloquear = useBloquearUsuario();
  const reativar = useReativarUsuario();
  const excluir = useExcluirUsuario();
  const resetarSenha = useResetarSenha();

  const [aprovando, setAprovando] = useState<PerfilUsuario | null>(null);
  const [editando, setEditando] = useState<PerfilUsuario | null>(null);
  const [visualizando, setVisualizando] = useState<PerfilUsuario | null>(null);
  const [excluindo, setExcluindo] = useState<PerfilUsuario | null>(null);

  const nomeEmpresa = (id: string | null) =>
    id ? (empresas?.find((e) => e.id === id)?.nome ?? "—") : "—";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Usuários</h1>
        <p className="text-sm text-muted-foreground">
          Aprovação de cadastros e papéis de acesso da sua organização
        </p>
      </div>

      <Card>
        <CardContent className="p-0">
          {isPending ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : !perfis || perfis.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              Nenhum usuário cadastrado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Perfil</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Telefone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Último acesso</TableHead>
                    <TableHead aria-label="Ações" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {perfis.map((p) => (
                    <TableRow
                      key={p.id}
                      className={p.status === "pendente" ? "cursor-pointer" : undefined}
                      onClick={() => p.status === "pendente" && setAprovando(p)}
                    >
                      <TableCell className="font-medium">{p.nome}</TableCell>
                      <TableCell>
                        {p.papel === "empresa_contratada"
                          ? nomeEmpresa(p.empresa_id)
                          : (p.empresa_informada ?? "—")}
                      </TableCell>
                      <TableCell>{p.papel ? PAPEL_LABEL[p.papel] : "—"}</TableCell>
                      <TableCell>
                        <BadgeStatusUsuario status={p.status} />
                      </TableCell>
                      <TableCell>{p.telefone ?? "—"}</TableCell>
                      <TableCell>{p.email ?? "—"}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {p.ultimo_acesso ? fmtData.format(new Date(p.ultimo_acesso)) : "—"}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" aria-label="Ações">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={() => setVisualizando(p)}>
                              <UserCheck className="size-4" /> Visualizar
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => setEditando(p)}>
                              <Pencil className="size-4" /> Editar
                            </DropdownMenuItem>
                            {p.status === "bloqueado" ? (
                              <DropdownMenuItem onSelect={() => reativar.mutate(p.id)}>
                                <RotateCcw className="size-4" /> Reativar
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onSelect={() => bloquear.mutate(p.id)}>
                                <Ban className="size-4" /> Bloquear
                              </DropdownMenuItem>
                            )}
                            {p.email && (
                              <DropdownMenuItem
                                onSelect={() => resetarSenha.mutate(p.email!)}
                              >
                                <Key className="size-4" /> Resetar senha
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem
                              variant="destructive"
                              onSelect={() => setExcluindo(p)}
                            >
                              <Trash2 className="size-4" /> Excluir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {aprovando && <DialogAprovacao usuario={aprovando} onOpenChange={() => setAprovando(null)} />}
      {editando && <DialogEditar usuario={editando} onOpenChange={() => setEditando(null)} />}
      {visualizando && (
        <DialogVisualizar usuario={visualizando} onOpenChange={() => setVisualizando(null)} />
      )}

      <AlertDialog open={!!excluindo} onOpenChange={(open) => !open && setExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir {excluindo?.nome}?</AlertDialogTitle>
            <AlertDialogDescription>
              O acesso é revogado imediatamente e o usuário some da listagem
              principal. A conta de login não é apagada do Supabase, só fica
              permanentemente inativa.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!excluindo) return;
                excluir.mutate(excluindo.id, { onSuccess: () => setExcluindo(null) });
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
