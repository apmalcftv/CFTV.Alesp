import type { OcorrenciaDash } from "@/services/dashboard";
import { diasParada } from "@/services/indicadores";
import {
  CAMERA_STATUS_LABEL,
  OCORRENCIA_STATUS_LABEL,
  PRIORIDADE_LABEL,
} from "@/types/domain";

const fmtDataIso = (v: string | null) => (v ? v.slice(0, 10) : "");

export function linhasRelatorioOcorrencias(ocorrencias: OcorrenciaDash[]) {
  return ocorrencias.map((o) => ({
    "Nº OS": o.numero,
    "Aberta em": fmtDataIso(o.aberta_em),
    "Encerrada em": fmtDataIso(o.encerrada_em),
    Câmera: o.camera ? o.camera.numero : "",
    Prédio: o.camera?.local?.predio?.nome ?? "",
    Local: o.camera?.local?.nome ?? "",
    Defeito: o.tipo_defeito?.nome ?? "",
    "Status da câmera": o.camera ? CAMERA_STATUS_LABEL[o.camera.status] : "",
    Prioridade: PRIORIDADE_LABEL[o.prioridade],
    "Status da OS": OCORRENCIA_STATUS_LABEL[o.status],
    Empresa: o.empresa?.nome ?? "",
    "Dias parada": diasParada(o),
    "SLA vence em": fmtDataIso(o.sla_vence_em),
  }));
}

export async function exportarOcorrenciasExcel(
  ocorrencias: OcorrenciaDash[],
  nomeArquivo = "ocorrencias.xlsx"
) {
  const XLSX = await import("xlsx");
  const linhas = linhasRelatorioOcorrencias(ocorrencias);
  const planilha = XLSX.utils.json_to_sheet(linhas);
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, planilha, "Ocorrências");
  XLSX.writeFile(livro, nomeArquivo);
}
