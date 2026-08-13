import type { RelatorioOcorrenciaDetalhe } from "@/services/relatorios-ocorrencia";
import type { EventoTimelineComJoins } from "@/services/relatorio-timeline";
import type { RelatorioExportacao } from "@/types/relatorios-ocorrencia";
import { PRIORIDADE_LABEL } from "@/types/domain";
import { RELATORIO_STATUS_LABEL } from "@/types/relatorios-ocorrencia";

const fmtDataIso = (v: string | null) => (v ? v.slice(0, 10) : "");

export function linhaDadosRelatorio(r: RelatorioOcorrenciaDetalhe) {
  return {
    "Nº Relatório": r.numero,
    Memorando: r.numero_memorando ?? "",
    "Tipo de solicitação": r.tipo_solicitacao?.nome ?? "",
    Solicitante: r.solicitante?.nome ?? "",
    Departamento: r.departamento?.nome ?? "",
    "Data da solicitação": fmtDataIso(r.data_solicitacao),
    Prioridade: PRIORIDADE_LABEL[r.prioridade],
    Operador: r.operador?.nome ?? "",
    "Data limite": fmtDataIso(r.data_limite),
    Status: RELATORIO_STATUS_LABEL[r.status],
    "Data do fato": fmtDataIso(r.data_fato),
    "Hora aproximada": r.hora_aproximada ?? "",
    Local: r.local?.nome ?? "",
    "Tipo de ocorrência": r.tipo_ocorrencia?.nome ?? "",
    "Descrição do fato": r.descricao_fato,
    "Pessoas envolvidas": r.pessoas_envolvidas ?? "",
    Conclusão: r.conclusao ?? "",
    "Providências adotadas": r.providencias_adotadas ?? "",
    "Resumo executivo": r.resumo_executivo ?? "",
    Encaminhamento: r.encaminhamento ?? "",
    "Data da conclusão": fmtDataIso(r.data_conclusao),
  };
}

/** Resumo executivo (tela principal, lista com seleção) — só as colunas
    exibidas na tabela, para acompanhamento gerencial. Nunca inclui dados
    do fato, timeline, exportações, resultado, histórico ou anexos — isso
    só existe na exportação completa de dentro do relatório individual. */
export function linhaResumoExecutivo(r: RelatorioOcorrenciaDetalhe) {
  return {
    "Nº": r.numero,
    Solicitante: r.solicitante?.nome ?? "",
    Departamento: r.departamento?.nome ?? "",
    Local: r.local?.nome ?? "",
    Operador: r.operador?.nome ?? "",
    Status: RELATORIO_STATUS_LABEL[r.status],
    Prioridade: PRIORIDADE_LABEL[r.prioridade],
    Solicitação: fmtDataIso(r.data_solicitacao),
  };
}

export async function exportarResumoExecutivoExcel(
  lista: RelatorioOcorrenciaDetalhe[],
  nomeArquivo = "resumo-relatorios-ocorrencias.xlsx"
) {
  const XLSX = await import("xlsx");
  const planilha = XLSX.utils.json_to_sheet(lista.map(linhaResumoExecutivo));
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, planilha, "Resumo");
  XLSX.writeFile(livro, nomeArquivo);
}

/** Mesmo conteúdo de `exportarResumoExecutivoExcel`, mas devolvendo um Blob
    — usado pelo botão "Compartilhar" da barra de ações em lote. */
export async function gerarBlobResumoExecutivoExcel(
  lista: RelatorioOcorrenciaDetalhe[]
): Promise<Blob> {
  const XLSX = await import("xlsx");
  const planilha = XLSX.utils.json_to_sheet(lista.map(linhaResumoExecutivo));
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, planilha, "Resumo");
  const arraybuffer = XLSX.write(livro, { bookType: "xlsx", type: "array" });
  return new Blob([arraybuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

/** Local do evento como ele aparece na coluna Local do grid: texto livre
    primeiro, nome vindo do join com `locais` como reserva para os eventos
    antigos. Mesma regra de `eventoParaLinha`. Só lê — exportar nunca cria
    nem altera cadastro de local. */
export function localDoEvento(e: EventoTimelineComJoins): string {
  return e.local_texto ?? e.local?.nome ?? "";
}

/** Colunas na mesma ordem do grid da aba Análise, para a planilha ser lida
    como a tela. `Nº` é a posição do evento na ordem cronológica —
    `listarTimeline` já devolve ordenado por data e horário inicial, que é
    a mesma numeração que o grid mostra. */
export function linhasTimeline(eventos: EventoTimelineComJoins[]) {
  return eventos.map((e, i) => ({
    "Nº": i + 1,
    "Horário inicial": e.horario_inicial,
    "Horário final": e.horario_final ?? "",
    Data: fmtDataIso(e.data),
    Câmera: e.camera ? `Câmera ${e.camera.numero}` : "",
    Local: localDoEvento(e),
    "Descrição do evento": e.descricao,
    Operador: e.operador?.nome ?? "",
    Marcador: e.marcador?.nome ?? "",
    "Comentário interno": e.comentario_interno ?? "",
  }));
}

export function linhasExportacoes(exportacoes: RelatorioExportacao[]) {
  return exportacoes.map((ex) => ({
    Data: fmtDataIso(ex.data_exportacao),
    Hora: ex.hora_exportacao ?? "",
    "Câmeras exportadas": ex.cameras_exportadas ?? "",
    "Período início": ex.periodo_inicio ? new Date(ex.periodo_inicio).toLocaleString("pt-BR") : "",
    "Período fim": ex.periodo_fim ? new Date(ex.periodo_fim).toLocaleString("pt-BR") : "",
    Formato: ex.formato ?? "",
    Tamanho: ex.tamanho ?? "",
    Destino: ex.destino ?? "",
    Hash: ex.hash ?? "",
    Observações: ex.observacoes ?? "",
  }));
}

export async function exportarRelatorioExcel(
  relatorio: RelatorioOcorrenciaDetalhe,
  timeline: EventoTimelineComJoins[],
  exportacoes: RelatorioExportacao[]
) {
  const XLSX = await import("xlsx");
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    livro,
    XLSX.utils.json_to_sheet([linhaDadosRelatorio(relatorio)]),
    "Dados"
  );
  XLSX.utils.book_append_sheet(
    livro,
    XLSX.utils.json_to_sheet(linhasTimeline(timeline)),
    "Análise"
  );
  XLSX.utils.book_append_sheet(
    livro,
    XLSX.utils.json_to_sheet(linhasExportacoes(exportacoes)),
    "Exportações"
  );
  XLSX.writeFile(livro, `relatorio-ocorrencia-${relatorio.numero}.xlsx`);
}

export async function exportarTimelineExcel(
  relatorio: RelatorioOcorrenciaDetalhe,
  timeline: EventoTimelineComJoins[]
) {
  const XLSX = await import("xlsx");
  const planilha = XLSX.utils.json_to_sheet(linhasTimeline(timeline));
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, planilha, "Análise");
  XLSX.writeFile(livro, `analise-ocorrencia-${relatorio.numero}.xlsx`);
}

export async function exportarListaRelatoriosExcel(
  lista: RelatorioOcorrenciaDetalhe[],
  nomeArquivo = "relatorios-ocorrencias.xlsx"
) {
  const XLSX = await import("xlsx");
  const planilha = XLSX.utils.json_to_sheet(lista.map(linhaDadosRelatorio));
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, planilha, "Relatórios");
  XLSX.writeFile(livro, nomeArquivo);
}

/** Mesmo conteúdo de `exportarRelatorioExcel`, mas devolvendo um Blob em vez
    de disparar o download — usado pelo botão "Compartilhar" (Web Share API). */
export async function gerarBlobRelatorioExcel(
  relatorio: RelatorioOcorrenciaDetalhe,
  timeline: EventoTimelineComJoins[],
  exportacoes: RelatorioExportacao[]
): Promise<Blob> {
  const XLSX = await import("xlsx");
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    livro,
    XLSX.utils.json_to_sheet([linhaDadosRelatorio(relatorio)]),
    "Dados"
  );
  XLSX.utils.book_append_sheet(
    livro,
    XLSX.utils.json_to_sheet(linhasTimeline(timeline)),
    "Análise"
  );
  XLSX.utils.book_append_sheet(
    livro,
    XLSX.utils.json_to_sheet(linhasExportacoes(exportacoes)),
    "Exportações"
  );
  const arraybuffer = XLSX.write(livro, { bookType: "xlsx", type: "array" });
  return new Blob([arraybuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
