import type { EventoTimelineComJoins, NovoEventoTimeline } from "@/services/relatorio-timeline";

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
    localTexto: e.local?.nome ?? "",
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
    local_id: linha.localId,
    descricao: linha.descricao,
    operador_id: linha.operadorId,
    marcador_id: linha.marcadorId,
    comentario_interno: linha.comentarioInterno || null,
  };
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
