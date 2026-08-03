"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  useForm,
  type FieldValues,
  type Resolver,
  type UseFormReturn,
} from "react-hook-form";
import {
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { podeEditar } from "@/types/domain";
import { usePerfil } from "@/components/perfil-provider";
import { useOrdenacao } from "@/hooks/use-ordenacao";
import { CabecalhoOrdenavel } from "@/components/ui/cabecalho-ordenavel";
import { Ajuda } from "@/components/ui/ajuda";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
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
import { Form } from "@/components/ui/form";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export interface ColunaCrud<T> {
  chave: string;
  rotulo: string;
  render: (item: T) => ReactNode;
  className?: string;
  /** Se informado, a coluna vira clicável para ordenar (asc/desc). */
  ordenar?: (item: T) => string | number;
}

interface MutacaoLike<TVariables> {
  mutate: (
    valores: TVariables,
    opts?: { onSuccess?: () => void }
  ) => void;
  isPending: boolean;
}

interface HooksCrud<T> {
  useListar: () => { data?: T[]; isPending: boolean };
  useCriar: () => MutacaoLike<Partial<T>>;
  useAtualizar: () => MutacaoLike<{ id: string; valores: Partial<T> }>;
  useExcluir: () => MutacaoLike<string>;
}

/** Tela de listagem + criação/edição/exclusão para os cadastros de apoio
    (prédios, locais, fabricantes, modelos, NVRs, empresas, técnicos,
    tipos de defeito) — todos seguem o mesmo formato de tabela simples. */
export function PaginaCrud<T extends { id: string }, F extends FieldValues>({
  titulo,
  descricao,
  hooks,
  colunas,
  resolver,
  valoresPadrao,
  paraFormulario,
  campos,
  buscar,
  rotuloItem,
  normalizar,
  acoesExtras,
  filtrosExtras,
  filtroExtra,
  resumo,
  selecaoMassa,
}: {
  titulo: string;
  descricao: string;
  hooks: HooksCrud<T>;
  colunas: ColunaCrud<T>[];
  resolver: Resolver<F>;
  valoresPadrao: F;
  paraFormulario: (item: T) => F;
  /** `editando` é o item em edição (null ao criar) — permite renderizar
      seções que dependem do registro já existente (ex.: histórico) */
  campos: (form: UseFormReturn<F>, editando: T | null) => ReactNode;
  buscar: (item: T, termo: string) => boolean;
  rotuloItem: (item: T) => string;
  /** Converte os valores do formulário (strings vazias etc.) no payload
      real da entidade (ex.: "" -> null para colunas opcionais) */
  normalizar: (valores: F) => Partial<T>;
  /** Botões extras ao lado de "Novo" (ex.: Importar) */
  acoesExtras?: ReactNode;
  /** Controle de filtro extra (ex.: multi-select de status), renderizado ao lado da busca */
  filtrosExtras?: ReactNode;
  /** Predicado do filtro extra — combinado com a busca por texto */
  filtroExtra?: (item: T) => boolean;
  /** Resumo acima da busca (ex.: "Total: 612" / "Exibindo: 87") */
  resumo?: (total: number, exibindo: number) => ReactNode;
  /** Habilita coluna de checkbox + barra de ação em massa quando há seleção */
  selecaoMassa?: {
    barra: (selecionados: T[], limpar: () => void) => ReactNode;
    /** Ações no cabeçalho que dependem da seleção e precisam ficar SEMPRE
        visíveis (tipicamente desabilitadas com seleção vazia) — ao
        contrário de `barra`, que só existe quando há algo selecionado.
        Recebe [] quando nada está marcado. Não passa por `editavel`:
        exportar/ler não é privilégio de quem pode escrever. */
    acoesCabecalho?: (selecionados: T[]) => ReactNode;
  };
}) {
  const perfil = usePerfil();
  const editavel = podeEditar(perfil.papel);

  const { data, isPending } = hooks.useListar();
  const criar = hooks.useCriar();
  const atualizar = hooks.useAtualizar();
  const excluir = hooks.useExcluir();

  const [termo, setTermo] = useState("");
  const [dialogAberto, setDialogAberto] = useState(false);
  const [editando, setEditando] = useState<T | null>(null);
  const [paraExcluir, setParaExcluir] = useState<T | null>(null);
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set());
  const { ordenacao, alternar: alternarOrdenacao, ordenar } = useOrdenacao();

  const form = useForm<F>({
    resolver,
    defaultValues: valoresPadrao as never,
  });

  const acessoresOrdenacao = useMemo(() => {
    const mapa: Record<string, (item: T) => string | number> = {};
    for (const c of colunas) {
      if (c.ordenar) mapa[c.chave] = c.ordenar;
    }
    return mapa;
  }, [colunas]);

  const itens = useMemo(() => {
    let lista = data ?? [];
    if (filtroExtra) {
      lista = lista.filter(filtroExtra);
    }
    if (termo.trim()) {
      const alvo = termo.trim().toLowerCase();
      lista = lista.filter((i) => buscar(i, alvo));
    }
    return ordenar(lista, acessoresOrdenacao);
  }, [data, termo, buscar, filtroExtra, ordenar, acessoresOrdenacao]);

  const selecionadosObjs = useMemo(
    () => itens.filter((i) => selecionados.has(i.id)),
    [itens, selecionados]
  );
  const todosSelecionados =
    itens.length > 0 && itens.every((i) => selecionados.has(i.id));
  const algumSelecionado = itens.some((i) => selecionados.has(i.id));

  function alternarSelecaoTodos() {
    setSelecionados((atual) => {
      if (todosSelecionados) {
        const novo = new Set(atual);
        for (const i of itens) novo.delete(i.id);
        return novo;
      }
      const novo = new Set(atual);
      for (const i of itens) novo.add(i.id);
      return novo;
    });
  }

  function alternarSelecaoItem(id: string) {
    setSelecionados((atual) => {
      const novo = new Set(atual);
      if (novo.has(id)) novo.delete(id);
      else novo.add(id);
      return novo;
    });
  }

  function abrirNovo() {
    setEditando(null);
    form.reset(valoresPadrao);
    setDialogAberto(true);
  }

  function abrirEdicao(item: T) {
    setEditando(item);
    form.reset(paraFormulario(item));
    setDialogAberto(true);
  }

  function onSubmit(valores: F) {
    const dados = normalizar(valores);
    if (editando) {
      atualizar.mutate(
        { id: editando.id, valores: dados },
        { onSuccess: () => setDialogAberto(false) }
      );
    } else {
      criar.mutate(dados, { onSuccess: () => setDialogAberto(false) });
    }
  }

  const salvando = criar.isPending || atualizar.isPending;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            {titulo}
          </h1>
          <p className="text-sm text-muted-foreground">{descricao}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {editavel && acoesExtras}
          {selecaoMassa?.acoesCabecalho?.(selecionadosObjs)}
          {editavel && (
            <Ajuda texto={`Cadastrar novo registro em ${titulo.toLowerCase()}`}>
              <Button onClick={abrirNovo}>
                <Plus className="size-4" />
                Novo
              </Button>
            </Ajuda>
          )}
        </div>
      </div>

      {resumo && resumo(data?.length ?? 0, itens.length)}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Buscar..."
            className="pl-8"
          />
        </div>
        {filtrosExtras}
      </div>

      {selecaoMassa && selecionadosObjs.length > 0 &&
        selecaoMassa.barra(selecionadosObjs, () => setSelecionados(new Set()))}

      <Card>
        <CardContent className="p-0">
          {isPending ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : itens.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              Nenhum registro encontrado
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {selecaoMassa && (
                      <TableHead className="w-10">
                        <Checkbox
                          aria-label="Selecionar todos os exibidos"
                          checked={
                            todosSelecionados
                              ? true
                              : algumSelecionado
                                ? "indeterminate"
                                : false
                          }
                          onCheckedChange={alternarSelecaoTodos}
                        />
                      </TableHead>
                    )}
                    {colunas.map((c) => (
                      <TableHead key={c.chave} className={c.className}>
                        {c.ordenar ? (
                          <CabecalhoOrdenavel
                            chave={c.chave}
                            rotulo={c.rotulo}
                            ordenacao={ordenacao}
                            onClick={alternarOrdenacao}
                          />
                        ) : (
                          c.rotulo
                        )}
                      </TableHead>
                    ))}
                    {editavel && <TableHead aria-label="Ações" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {itens.map((item) => (
                    <TableRow key={item.id}>
                      {selecaoMassa && (
                        <TableCell className="w-10">
                          <Checkbox
                            aria-label="Selecionar item"
                            checked={selecionados.has(item.id)}
                            onCheckedChange={() => alternarSelecaoItem(item.id)}
                          />
                        </TableCell>
                      )}
                      {colunas.map((c) => (
                        <TableCell key={c.chave} className={c.className}>
                          {c.render(item)}
                        </TableCell>
                      ))}
                      {editavel && (
                        <TableCell className="w-10">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                aria-label="Ações"
                              >
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onSelect={() => abrirEdicao(item)}>
                                <Pencil className="size-4" /> Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                onSelect={() => setParaExcluir(item)}
                              >
                                <Trash2 className="size-4" /> Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogAberto} onOpenChange={setDialogAberto}>
        <DialogContent className="sm:max-w-md">
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-4"
            >
              <DialogHeader>
                <DialogTitle>
                  {editando
                    ? `Editar ${titulo.toLowerCase()}`
                    : `Novo ${titulo.toLowerCase()}`}
                </DialogTitle>
              </DialogHeader>
              <div className="flex flex-col gap-4">{campos(form, editando)}</div>
              <DialogFooter>
                <Button type="submit" disabled={salvando}>
                  {salvando && <Loader2 className="size-4 animate-spin" />}
                  Salvar
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!paraExcluir}
        onOpenChange={(open) => !open && setParaExcluir(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Excluir {paraExcluir ? rotuloItem(paraExcluir) : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. Se houver câmeras ou
              ocorrências vinculadas, a exclusão será bloqueada.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!paraExcluir) return;
                excluir.mutate(paraExcluir.id, {
                  onSuccess: () => setParaExcluir(null),
                });
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
