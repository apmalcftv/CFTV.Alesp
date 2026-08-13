import type { EventoTimelineComJoins, NovoEventoTimeline } from "@/services/relatorio-timeline";
import type { EventoAnaliseHistorico } from "@/services/relatorio-historico";

/** Linha de trabalho do Grid Investigativo — vive só em memória até
    "Salvar Análise". IDs reais (uuid do banco) para linhas já existentes;
    linhas novas ganham um id temporário prefixado "novo:" (nunca vai pro
    banco, serve só de `rowKeyGetter` do react-data-grid). */
export interface LinhaGrid {
  id: string;
  data: string; // yyyy-mm-dd
  horarioInicial: string; // HH:mm
  horarioFinal: string; // HH:mm ou ""
  cameraId: string | null;
  cameraTexto: string;
  /** Vínculo antigo com o catálogo `locais`. A coluna Local virou texto
      livre, então nada novo grava aqui — o valor só é carregado e
      devolvido intacto para não mexer no que já está registrado. */
  localId: string | null;
  localTexto: string;
  descricao: string;
  operadorId: string | null;
  operadorTexto: string;
  marcadorId: string | null;
  marcadorTexto: string;
  /** Uso interno dos operadores — nunca entra nas exportações. */
  comentarioInterno: string;
}

export function novoIdTemporario(): string {
  return `novo:${crypto.randomUUID()}`;
}

export function linhaVazia(dataPadrao: string, operadorId: string | null, operadorTexto: string): LinhaGrid {
  return {
    id: novoIdTemporario(),
    data: dataPadrao,
    horarioInicial: "",
    horarioFinal: "",
    cameraId: null,
    cameraTexto: "",
    localId: null,
    localTexto: "",
    descricao: "",
    operadorId,
    operadorTexto,
    marcadorId: null,
    marcadorTexto: "",
    comentarioInterno: "",
  };
}

/** Duplicar linha (produtividade para várias ocorrências na mesma câmera):
    mantém câmera/local/operador/data, mas horários, descrição, marcador e
    comentário interno começam vazios — nunca uma cópia idêntica. */
export function linhaDuplicada(linha: LinhaGrid): LinhaGrid {
  return {
    id: novoIdTemporario(),
    data: linha.data,
    horarioInicial: "",
    horarioFinal: "",
    cameraId: linha.cameraId,
    cameraTexto: linha.cameraTexto,
    localId: linha.localId,
    localTexto: linha.localTexto,
    descricao: "",
    operadorId: linha.operadorId,
    operadorTexto: linha.operadorTexto,
    marcadorId: null,
    marcadorTexto: "",
    comentarioInterno: "",
  };
}

export function eventoParaLinha(e: EventoTimelineComJoins): LinhaGrid {
  return {
    id: e.id,
    data: e.data,
    horarioInicial: e.horario_inicial.slice(0, 5),
    horarioFinal: e.horario_final?.slice(0, 5) ?? "",
    cameraId: e.camera_id,
    cameraTexto: e.camera ? `Câmera ${e.camera.numero}` : "",
    localId: e.local_id,
    // Texto livre primeiro; evento antigo não tem `local_texto` e cai no
    // nome vindo do join com `locais`, exatamente como aparecia antes.
    localTexto: e.local_texto ?? e.local?.nome ?? "",
    descricao: e.descricao,
    operadorId: e.operador_id,
    operadorTexto: e.operador?.nome ?? "",
    marcadorId: e.marcador_id,
    marcadorTexto: e.marcador?.nome ?? "",
    comentarioInterno: e.comentario_interno ?? "",
  };
}

/** Só entram no salvamento linhas com pelo menos horário inicial ou
    descrição preenchidos — uma linha em branco deixada no fim do grid não
    vira um registro vazio no banco. */
export function linhaParaEvento(
  relatorioId: string,
  linha: LinhaGrid
): NovoEventoTimeline | null {
  if (!linha.horarioInicial && !linha.descricao.trim()) return null;
  return {
    relatorio_id: relatorioId,
    data: linha.data,
    horario_inicial: linha.horarioInicial || "00:00",
    horario_final: linha.horarioFinal || null,
    camera_id: linha.cameraId,
    // Devolvido como veio: não se cria nem se altera vínculo de catálogo
    // a partir do grid — só o texto abaixo é editável.
    local_id: linha.localId,
    local_texto: linha.localTexto || null,
    descricao: linha.descricao,
    operador_id: linha.operadorId,
    marcador_id: linha.marcadorId,
    comentario_interno: linha.comentarioInterno || null,
  };
}

/** Colunas da análise que entram na trilha de auditoria, na ordem em que
    aparecem no grid. A chave é o que vai para `relatorio_historico.campo`;
    o rótulo de tela vive em `secao-historico.tsx`. */
const CAMPOS_AUDITADOS: (keyof LinhaGrid)[] = [
  "data",
  "horarioInicial",
  "horarioFinal",
  "cameraTexto",
  "localTexto",
  "descricao",
  "operadorTexto",
  "marcadorTexto",
  "comentarioInterno",
];

/** O que mudou entre o que foi carregado e o que está sendo salvo, para
    virar histórico. Compara por `id`: linha nova tem id temporário
    ("novo:"), então nunca casa com nenhuma carregada. Só devolve o nome do
    campo — nunca o valor, antigo ou novo. */
export function diferencaParaHistorico(
  antes: LinhaGrid[],
  depois: LinhaGrid[]
): EventoAnaliseHistorico[] {
  const porIdAntes = new Map(antes.map((l) => [l.id, l]));
  const idsDepois = new Set(depois.map((l) => l.id));
  const eventos: EventoAnaliseHistorico[] = [];

  for (const linha of depois) {
    const original = porIdAntes.get(linha.id);
    if (!original) {
      // Linha em branco que o grid mantém no fim e o operador nunca
      // preencheu não é "linha adicionada" — `linhaParaEvento` também a
      // descarta, então ela nem chega ao banco.
      if (linha.horarioInicial || linha.descricao.trim()) {
        eventos.push({ tipo: "adicao_linha_analise" });
      }
      continue;
    }
    for (const campo of CAMPOS_AUDITADOS) {
      if (original[campo] !== linha[campo]) {
        eventos.push({ tipo: "edicao_analise", campo });
      }
    }
  }

  for (const linha of antes) {
    if (!idsDepois.has(linha.id)) {
      eventos.push({ tipo: "exclusao_linha_analise" });
    }
  }

  return eventos;
}

export function ordenarPorHorario(linhas: LinhaGrid[]): LinhaGrid[] {
  return [...linhas].sort((a, b) => {
    if (a.data !== b.data) return a.data.localeCompare(b.data);
    return a.horarioInicial.localeCompare(b.horarioInicial);
  });
}

// ---------- Destaque visual (reaproveita o campo Marcador já existente —
// nenhuma coluna nova no banco. Os 5 nomes abaixo, quando digitados/criados
// no Marcador, ganham uma cor de linha reconhecível; qualquer outro texto
// de marcador continua funcionando normalmente, só sem cor especial). ----------

export const DESTAQUES_LINHA = [
  "Evidência",
  "Atenção",
  "Exportado",
  "Sem imagem",
  "Evento importante",
] as const;
export type DestaqueLinha = (typeof DESTAQUES_LINHA)[number];

function normalizarTexto(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

const MAPA_DESTAQUE = new Map(DESTAQUES_LINHA.map((d) => [normalizarTexto(d), d]));

export function destaqueDaLinha(linha: LinhaGrid): DestaqueLinha | null {
  return MAPA_DESTAQUE.get(normalizarTexto(linha.marcadorTexto)) ?? null;
}

/** Classes definidas em globals.css — tingem discretamente o fundo da
    linha conforme o destaque reconhecido. */
export const DESTAQUE_CLASSE: Record<DestaqueLinha, string> = {
  Evidência: "linha-destaque-evidencia",
  Atenção: "linha-destaque-atencao",
  Exportado: "linha-destaque-exportado",
  "Sem imagem": "linha-destaque-sem-imagem",
  "Evento importante": "linha-destaque-evento-importante",
};
