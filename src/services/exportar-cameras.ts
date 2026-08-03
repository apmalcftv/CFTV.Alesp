// Exportação do inventário de câmeras (seleção da tela de Câmeras).
// Mesma arquitetura já usada em exportar-relatorios-ocorrencia.ts: uma única
// função monta as linhas, e PDF (window.print + #area-impressao) e Excel
// (xlsx) consomem exatamente a mesma estrutura — nunca duas listas de campos.

import {
  CAMERA_STATUS_LABEL,
  type Camera,
  type CameraStatus,
  type Empresa,
  type Fabricante,
  type Local,
  type ModeloCamera,
  type Predio,
} from "@/types/domain";

/** Catálogos já carregados pela tela — passados por referência para o
    serviço não abrir nenhuma consulta própria. */
export interface CatalogosCamera {
  locais: Local[];
  predios: Predio[];
  modelos: ModeloCamera[];
  fabricantes: Fabricante[];
  empresas: Empresa[];
}

/** Ordem das chaves = ordem das colunas no Excel E no PDF. As 7 primeiras
    espelham a tabela da tela; o resto são os campos complementares. */
export interface LinhaCameraExport {
  "Nº": number;
  Status: string;
  Local: string;
  Modelo: string;
  Empresa: string;
  Patrimônio: string;
  IP: string;
  Fabricante: string;
  Prédio: string;
  Pavimento: string;
  Setor: string;
  Observações: string;
}

export const COLUNAS_CAMERA_EXPORT = [
  "Nº",
  "Status",
  "Local",
  "Modelo",
  "Empresa",
  "Patrimônio",
  "IP",
  "Fabricante",
  "Prédio",
  "Pavimento",
  "Setor",
  "Observações",
] as const satisfies readonly (keyof LinhaCameraExport)[];

/** Larguras de coluna do Excel, na ordem de COLUNAS_CAMERA_EXPORT. */
const LARGURAS = [6, 14, 28, 18, 20, 14, 16, 16, 20, 12, 14, 40];

/** Índices Map para não varrer os catálogos por câmera — com milhares de
    câmeras selecionadas a resolução continua O(n). */
function indexar(catalogos: CatalogosCamera) {
  return {
    locais: new Map(catalogos.locais.map((l) => [l.id, l])),
    predios: new Map(catalogos.predios.map((p) => [p.id, p])),
    modelos: new Map(catalogos.modelos.map((m) => [m.id, m])),
    fabricantes: new Map(catalogos.fabricantes.map((f) => [f.id, f])),
    empresas: new Map(catalogos.empresas.map((e) => [e.id, e])),
  };
}

export function linhasCamerasExport(
  cameras: Camera[],
  catalogos: CatalogosCamera
): LinhaCameraExport[] {
  const idx = indexar(catalogos);

  return cameras.map((c) => {
    const local = c.local_id ? idx.locais.get(c.local_id) : undefined;
    const predio = local?.predio_id ? idx.predios.get(local.predio_id) : undefined;
    const modelo = c.modelo_id ? idx.modelos.get(c.modelo_id) : undefined;
    const fabricante = modelo?.fabricante_id
      ? idx.fabricantes.get(modelo.fabricante_id)
      : undefined;
    const empresa = c.empresa_id ? idx.empresas.get(c.empresa_id) : undefined;

    return {
      "Nº": c.numero,
      Status: CAMERA_STATUS_LABEL[c.status],
      Local: local?.nome ?? "",
      Modelo: modelo?.nome ?? "",
      Empresa: empresa?.nome ?? "",
      Patrimônio: c.patrimonio ?? "",
      IP: c.ip ?? "",
      Fabricante: fabricante?.nome ?? "",
      Prédio: predio?.nome ?? "",
      Pavimento: local?.andar ?? "",
      Setor: local?.tipo_area ?? "",
      Observações: c.observacoes ?? "",
    };
  });
}

// ---------- Resumo executivo (topo do PDF) ----------

export interface ResumoCameras {
  total: number;
  porStatus: { status: CameraStatus; rotulo: string; quantidade: number }[];
}

/** Contagem por status na ordem do enum, omitindo os status sem nenhuma
    câmera na seleção — um inventário de 3 câmeras não precisa listar 6
    status zerados. */
export function resumoCameras(cameras: Camera[]): ResumoCameras {
  const contagem = new Map<CameraStatus, number>();
  for (const c of cameras) {
    contagem.set(c.status, (contagem.get(c.status) ?? 0) + 1);
  }
  const ordem = Object.keys(CAMERA_STATUS_LABEL) as CameraStatus[];
  return {
    total: cameras.length,
    porStatus: ordem
      .filter((s) => (contagem.get(s) ?? 0) > 0)
      .map((s) => ({
        status: s,
        rotulo: CAMERA_STATUS_LABEL[s],
        quantidade: contagem.get(s) ?? 0,
      })),
  };
}

// ---------- Excel ----------

async function montarPlanilha(linhas: LinhaCameraExport[]) {
  const XLSX = await import("xlsx");
  const planilha = XLSX.utils.json_to_sheet(linhas, {
    header: [...COLUNAS_CAMERA_EXPORT],
  });

  // Formatação de cabeçalho suportada de fato pelo xlsx 0.18.5 (build
  // community): largura de coluna e autofiltro — ambas escritas por
  // `write_ws_xml_cols`/`write_ws_xml_autofilter`. Negrito de célula
  // (`cell.s`) e congelar painel (`!freeze`) NÃO são escritos por esta
  // versão: seriam ignorados em silêncio, então não são usados aqui.
  planilha["!cols"] = LARGURAS.map((wch) => ({ wch }));
  const ultimaColuna = XLSX.utils.encode_col(COLUNAS_CAMERA_EXPORT.length - 1);
  planilha["!autofilter"] = { ref: `A1:${ultimaColuna}1` };

  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, planilha, "Câmeras");
  return { XLSX, livro };
}

export async function exportarCamerasExcel(
  linhas: LinhaCameraExport[],
  nomeArquivo = "inventario-cameras.xlsx"
) {
  const { XLSX, livro } = await montarPlanilha(linhas);
  XLSX.writeFile(livro, nomeArquivo);
}

/** Mesmo conteúdo de `exportarCamerasExcel`, mas devolvendo um Blob — para
    o botão "Compartilhar" (Web Share API), igual ao módulo de Relatórios. */
export async function gerarBlobCamerasExcel(
  linhas: LinhaCameraExport[]
): Promise<Blob> {
  const { XLSX, livro } = await montarPlanilha(linhas);
  const arraybuffer = XLSX.write(livro, { bookType: "xlsx", type: "array" });
  return new Blob([arraybuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}

export const MIME_EXCEL =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
