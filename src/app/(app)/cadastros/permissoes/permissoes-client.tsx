"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Lock, ShieldOff } from "lucide-react";
import { usePerfil } from "@/components/perfil-provider";
import {
  useCatalogoPermissoes,
  usePermissoesDoPapel,
  useSalvarPermissoes,
} from "@/hooks/use-permissoes";
import type { AlteracaoPermissao } from "@/services/permissoes";
import { PAPEL_LABEL, type PapelUsuario } from "@/types/domain";
import {
  ACOES,
  ACAO_LABEL,
  agruparCatalogo,
  chavePermissao,
  type AcaoPermissao,
} from "@/types/permissoes";
import { Ajuda } from "@/components/ui/ajuda";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

/** Os cinco papéis reais do sistema. Não existe "Técnico": `tecnicos` é
    catálogo de dados (os técnicos da empresa de manutenção citados numa
    OS), não um perfil de login. */
const PAPEIS: PapelUsuario[] = [
  "administrador",
  "operador_cftc",
  "gestor",
  "fiscal_alesp",
  "empresa_contratada",
];

export function PermissoesClient() {
  const perfil = usePerfil();

  // O layout do servidor já redirecionou quem não é administrador; isto
  // cobre o caso de o papel mudar com a aba aberta.
  if (perfil.papel !== "administrador") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed py-24 text-center">
        <ShieldOff className="size-10 text-muted-foreground" />
        <p className="text-sm text-muted-foreground">
          Apenas administradores podem configurar permissões
        </p>
      </div>
    );
  }

  return <PermissoesConteudo />;
}

function PermissoesConteudo() {
  const [papel, setPapel] = useState<PapelUsuario>("operador_cftc");
  const [rascunho, setRascunho] = useState<Record<string, boolean>>({});
  const [confirmando, setConfirmando] = useState(false);
  /** Recurso cujo Visualizar está sendo desmarcado, com as ações que
      seriam removidas junto. Nulo quando não há confirmação pendente. */
  const [cascata, setCascata] = useState<{
    recurso: string;
    afetadas: AcaoPermissao[];
  } | null>(null);

  const { data: catalogo, isPending: carregandoCatalogo } = useCatalogoPermissoes();
  const { data: permissoes, isPending: carregandoPermissoes } = usePermissoesDoPapel(papel);
  const salvar = useSalvarPermissoes(papel);

  const recursos = useMemo(() => agruparCatalogo(catalogo ?? []), [catalogo]);

  /** Estado gravado no banco, por chave recurso:acao. */
  const salvo = useMemo(() => {
    const mapa: Record<string, boolean> = {};
    for (const p of permissoes ?? []) {
      mapa[chavePermissao(p.recurso, p.acao)] = p.permitido;
    }
    return mapa;
  }, [permissoes]);

  const ehAdministrador = papel === "administrador";

  function valorAtual(recurso: string, acao: AcaoPermissao): boolean {
    // Administrador é sempre tudo: a garantia vem do curto-circuito em
    // tem_permissao(), não destas caixas — por isso elas só exibem.
    if (ehAdministrador) return true;
    const chave = chavePermissao(recurso, acao);
    return rascunho[chave] ?? salvo[chave] ?? false;
  }

  /** Aplica a mudança. A cascata de Visualizar existe porque conceder
      criar, editar ou excluir sobre algo que não se pode ver não é estado
      operacional válido — mas nunca acontece em silêncio: quem chama
      confirma antes (ver `alternar`). */
  function aplicarAlternancia(recurso: string, acao: AcaoPermissao, marcado: boolean) {
    const chave = chavePermissao(recurso, acao);
    setRascunho((atual) => {
      const proximo = { ...atual, [chave]: marcado };
      if (acao === "visualizar" && !marcado) {
        for (const outra of ACOES) {
          if (outra !== "visualizar") proximo[chavePermissao(recurso, outra)] = false;
        }
      }
      // Marcar qualquer ação implica poder ver — este sentido não precisa
      // de confirmação: amplia o acesso em vez de reduzir, e é o que o
      // Administrador quis dizer ao marcar a caixa.
      if (acao !== "visualizar" && marcado) {
        proximo[chavePermissao(recurso, "visualizar")] = true;
      }
      return proximo;
    });
  }

  function alternar(recurso: string, acao: AcaoPermissao, marcado: boolean) {
    // Desmarcar Visualizar com outras ações ligadas remove as três junto.
    // Pergunta antes, dizendo exatamente quais: foi essa cascata
    // silenciosa que zerou um perfil inteiro sem o Administrador perceber.
    if (acao === "visualizar" && !marcado) {
      const afetadas = ACOES.filter(
        (outra) => outra !== "visualizar" && valorAtual(recurso, outra)
      );
      if (afetadas.length > 0) {
        setCascata({ recurso, afetadas });
        return;
      }
    }
    aplicarAlternancia(recurso, acao, marcado);
  }

  /** Só o que difere do que está gravado. */
  const alteracoes: AlteracaoPermissao[] = useMemo(() => {
    if (ehAdministrador) return [];
    return Object.entries(rascunho)
      .filter(([chave, valor]) => (salvo[chave] ?? false) !== valor)
      .map(([chave, permitido]) => {
        const [recurso, acao] = chave.split(":");
        return { recurso, acao, permitido };
      });
  }, [rascunho, salvo, ehAdministrador]);

  function trocarPapel(novo: string) {
    setPapel(novo as PapelUsuario);
    setRascunho({});
  }

  async function confirmarSalvar() {
    try {
      await salvar.mutateAsync(alteracoes);
      setRascunho({});
      setConfirmando(false);
    } catch {
      // o toast de erro já vem do hook; o diálogo fica aberto para retentar
    }
  }

  const carregando = carregandoCatalogo || carregandoPermissoes;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/cadastros" aria-label="Voltar para Cadastros">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Permissões</h1>
          <p className="text-sm text-muted-foreground">
            Define o que cada perfil pode fazer no módulo CMAL
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="flex flex-wrap items-end gap-4 pt-6">
          <div className="flex min-w-56 flex-col gap-2">
            <Label htmlFor="papel">Perfil</Label>
            <Select value={papel} onValueChange={trocarPapel}>
              <SelectTrigger id="papel" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAPEIS.map((p) => (
                  <SelectItem key={p} value={p}>
                    {PAPEL_LABEL[p]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <p className="flex-1 text-sm text-muted-foreground">
            {ehAdministrador ? (
              <span className="flex items-center gap-2">
                <Lock className="size-4 shrink-0" />
                O Administrador tem acesso total garantido em código, dentro da função
                <code className="mx-1 rounded bg-muted px-1.5 py-0.5 text-xs">tem_permissao()</code>
                — não depende destas caixas e não pode ser removido por aqui.
              </span>
            ) : (
              <>
                Alterando <strong>{PAPEL_LABEL[papel]}</strong>. As mudanças só valem depois
                de salvar.
              </>
            )}
          </p>
        </CardContent>
      </Card>

      {carregando ? (
        <Skeleton className="h-72 w-full" />
      ) : (
        <MatrizPermissoes
          recursos={recursos}
          valorAtual={valorAtual}
          alternar={alternar}
          desabilitado={ehAdministrador}
        />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Button
          onClick={() => setConfirmando(true)}
          disabled={alteracoes.length === 0 || salvar.isPending}
        >
          {salvar.isPending && <Loader2 className="size-4 animate-spin" />}
          Salvar permissões
        </Button>
        {alteracoes.length > 0 && (
          <span className="text-sm text-muted-foreground">
            {alteracoes.length}{" "}
            {alteracoes.length === 1 ? "alteração pendente" : "alterações pendentes"}
          </span>
        )}
        {alteracoes.length > 0 && (
          <Button variant="ghost" onClick={() => setRascunho({})} disabled={salvar.isPending}>
            Descartar
          </Button>
        )}
      </div>

      <AlertDialog open={!!cascata} onOpenChange={(aberto) => !aberto && setCascata(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover também as demais permissões?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p className="mb-3">
                  <strong>Visualizar</strong> é a permissão-base de{" "}
                  <strong>
                    {recursos.find((r) => r.recurso === cascata?.recurso)?.rotulo ??
                      cascata?.recurso}
                  </strong>
                  . Sem ela, {PAPEL_LABEL[papel]} não teria como usar as ações abaixo, que
                  serão removidas junto:
                </p>
                <ul className="flex flex-col gap-1 text-sm">
                  {(cascata?.afetadas ?? []).map((a) => (
                    <li key={a}>• {ACAO_LABEL[a]}</li>
                  ))}
                </ul>
                <p className="mt-3">
                  Cancelar mantém a configuração como está. Nada é gravado até você
                  salvar.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setCascata(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (cascata) aplicarAlternancia(cascata.recurso, "visualizar", false);
                setCascata(null);
              }}
            >
              Remover as {(cascata?.afetadas.length ?? 0) + 1} permissões
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmando} onOpenChange={setConfirmando}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Salvar permissões de {PAPEL_LABEL[papel]}?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <p className="mb-3">
                  Estas {alteracoes.length === 1 ? "alteração será gravada" : "alterações serão gravadas"} para
                  todos os usuários com o perfil {PAPEL_LABEL[papel]}:
                </p>
                <ul className="flex max-h-52 flex-col gap-1 overflow-y-auto text-sm">
                  {alteracoes.map((a) => {
                    const recurso = recursos.find((r) => r.recurso === a.recurso);
                    return (
                      <li key={`${a.recurso}:${a.acao}`}>
                        <span className={a.permitido ? "text-primary" : "text-destructive"}>
                          {a.permitido ? "Permitir" : "Remover"}
                        </span>{" "}
                        {ACAO_LABEL[a.acao as AcaoPermissao]} em{" "}
                        <strong>{recurso?.rotulo ?? a.recurso}</strong>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={salvar.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                // sem isto o diálogo fecha antes da mutação terminar
                e.preventDefault();
                confirmarSalvar();
              }}
              disabled={salvar.isPending}
            >
              {salvar.isPending && <Loader2 className="size-4 animate-spin" />}
              Salvar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function MatrizPermissoes({
  recursos,
  valorAtual,
  alternar,
  desabilitado,
}: {
  recursos: ReturnType<typeof agruparCatalogo>;
  valorAtual: (recurso: string, acao: AcaoPermissao) => boolean;
  alternar: (recurso: string, acao: AcaoPermissao, marcado: boolean) => void;
  desabilitado: boolean;
}) {
  // Agrupa por módulo › grupo, na mesma leitura do menu lateral.
  const porGrupo = useMemo(() => {
    const mapa = new Map<string, typeof recursos>();
    for (const r of recursos) {
      const chave = `${r.modulo} · ${r.grupo}`;
      mapa.set(chave, [...(mapa.get(chave) ?? []), r]);
    }
    return [...mapa.entries()];
  }, [recursos]);

  if (recursos.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-sm text-muted-foreground">
          Nenhum recurso cadastrado no catálogo de permissões
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {porGrupo.map(([grupo, itens]) => (
        <Card key={grupo}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{grupo}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 pr-4 text-left font-medium text-muted-foreground">
                      Recurso
                    </th>
                    {ACOES.map((acao) => (
                      <th
                        key={acao}
                        className="w-24 px-2 py-2 text-center font-medium text-muted-foreground"
                      >
                        {ACAO_LABEL[acao]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {itens.map((r) => (
                    <tr key={r.recurso} className="border-b last:border-b-0">
                      <td className="py-3 pr-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{r.rotulo}</span>
                          <Ajuda
                            texto={
                              r.tipo === "dado"
                                ? "Tem dados próprios: a permissão vale também no banco, inclusive contra chamada direta à API."
                                : "É uma tela sobre os dados de Relatórios de Ocorrências. A permissão controla o menu e o acesso à rota, não o acesso ao dado em si."
                            }
                          >
                            <Badge
                              variant={r.tipo === "dado" ? "default" : "secondary"}
                              className="cursor-help text-[10px] uppercase"
                            >
                              {r.tipo}
                            </Badge>
                          </Ajuda>
                        </div>
                      </td>
                      {ACOES.map((acao) => {
                        const existe = r.acoes.includes(acao);
                        return (
                          <td key={acao} className="px-2 py-3 text-center">
                            {existe ? (
                              <Checkbox
                                checked={valorAtual(r.recurso, acao)}
                                disabled={desabilitado}
                                onCheckedChange={(v) => alternar(r.recurso, acao, v === true)}
                                aria-label={`${ACAO_LABEL[acao]} em ${r.rotulo}`}
                              />
                            ) : (
                              <span className="text-muted-foreground/50">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
