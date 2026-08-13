import type { PapelUsuario } from "@/types/domain";

/** As quatro ações da matriz. Deliberadamente só estas: são as que têm
    correspondência direta em SELECT/INSERT/UPDATE/DELETE e portanto as
    únicas que a RLS conseguirá garantir na Fase 3. "Exportar" e
    "Compartilhar" ficaram de fora porque rodam no navegador sobre dados
    já lidos — não haveria como fazê-las valer no servidor. */
export const ACOES = ["visualizar", "criar", "editar", "excluir"] as const;
export type AcaoPermissao = (typeof ACOES)[number];

export const ACAO_LABEL: Record<AcaoPermissao, string> = {
  visualizar: "Visualizar",
  criar: "Criar",
  editar: "Editar",
  excluir: "Excluir",
};

/** `dado` tem tabelas próprias e vira predicado de RLS na Fase 3.
    `tela` é uma leitura dos mesmos dados de outro recurso: controla menu
    e rota, não acesso ao dado. A tela de configuração mostra a diferença
    para ninguém confundir os dois níveis de garantia. */
export type TipoRecurso = "dado" | "tela";

export interface PermissaoCatalogo {
  recurso: string;
  acao: AcaoPermissao;
  modulo: string;
  grupo: string;
  rotulo: string;
  rota: string | null;
  tipo: TipoRecurso;
  ordem: number;
}

export interface PermissaoPerfil {
  papel: PapelUsuario;
  recurso: string;
  acao: AcaoPermissao;
  permitido: boolean;
}

/** Uma linha da tela: o recurso com as ações que existem para ele. */
export interface RecursoAgrupado {
  recurso: string;
  rotulo: string;
  modulo: string;
  grupo: string;
  tipo: TipoRecurso;
  ordem: number;
  acoes: AcaoPermissao[];
}

/** Agrupa o catálogo (uma linha por recurso+ação) na forma que a tela
    desenha (uma linha por recurso). */
export function agruparCatalogo(catalogo: PermissaoCatalogo[]): RecursoAgrupado[] {
  const porRecurso = new Map<string, RecursoAgrupado>();
  for (const item of catalogo) {
    const atual = porRecurso.get(item.recurso);
    if (atual) {
      atual.acoes.push(item.acao);
      continue;
    }
    porRecurso.set(item.recurso, {
      recurso: item.recurso,
      rotulo: item.rotulo,
      modulo: item.modulo,
      grupo: item.grupo,
      tipo: item.tipo,
      ordem: item.ordem,
      acoes: [item.acao],
    });
  }
  return [...porRecurso.values()]
    .map((r) => ({
      ...r,
      acoes: ACOES.filter((a) => r.acoes.includes(a)),
    }))
    .sort((a, b) => a.ordem - b.ordem);
}

export function chavePermissao(recurso: string, acao: AcaoPermissao): string {
  return `${recurso}:${acao}`;
}
