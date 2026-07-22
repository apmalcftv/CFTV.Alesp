// Leitor da planilha "Análise de ocorrência" (o modelo/exemplo usado hoje
// pela CMAL) para o Grid Investigativo. Cada linha da planilha vira uma
// linha do grid, em memória — nada é gravado aqui, o usuário revisa e
// confirma com "Salvar Análise" como qualquer outra edição.
import type { CameraDash } from "@/services/dashboard";
import { linhaVazia, novoIdTemporario, type LinhaGrid } from "@/components/relatorios-ocorrencia/grid-analise/tipos";

function normalizarTexto(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function textoCelula(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

const MESES: Record<string, string> = {
  jan: "01", fev: "02", mar: "03", abr: "04", mai: "05", jun: "06",
  jul: "07", ago: "08", set: "09", out: "10", nov: "11", dez: "12",
};

/** "18MAR22" -> "2022-03-18" */
function parseDataSessao(texto: string): string | null {
  const m = texto.match(/(\d{1,2})\s*([a-zA-Z]{3})\s*(\d{2,4})/);
  if (!m) return null;
  const [, dia, mesTexto, anoTexto] = m;
  const mes = MESES[normalizarTexto(mesTexto)];
  if (!mes) return null;
  const ano = anoTexto.length === 2 ? `20${anoTexto}` : anoTexto;
  return `${ano}-${mes}-${dia.padStart(2, "0")}`;
}

/** "14h09m20s" | "14h12m" | "14h30" -> "14:09" (segundos descartados —
    o grid trabalha só em HH:mm) */
function parseHorario(texto: string): string {
  const m = texto.match(/(\d{1,2})\s*h\s*(\d{1,2})?/i);
  if (!m) return "";
  const [, h, min] = m;
  return `${h.padStart(2, "0")}:${(min ?? "0").padStart(2, "0")}`;
}

export interface ResultadoImportacaoTimeline {
  linhas: LinhaGrid[];
  dataSessao: string | null;
  avisos: string[];
}

export async function lerPlanilhaAnaliseModelo(
  arquivo: File,
  cameras: CameraDash[],
  operadorId: string | null,
  operadorTexto: string
): Promise<ResultadoImportacaoTimeline> {
  const XLSX = await import("xlsx");
  const buffer = await arquivo.arrayBuffer();
  const livro = XLSX.read(buffer, { type: "array" });
  const planilha = livro.Sheets[livro.SheetNames[0]];
  const linhasBrutas: unknown[][] = XLSX.utils.sheet_to_json(planilha, {
    header: 1,
    blankrows: false,
    raw: false,
  });

  const avisos: string[] = [];
  let dataSessao: string | null = null;
  let indiceHeader = -1;

  for (let i = 0; i < linhasBrutas.length; i++) {
    const celulas = linhasBrutas[i].map(textoCelula);
    const primeira = normalizarTexto(celulas[0] ?? "");
    if (primeira.startsWith("data")) {
      dataSessao = parseDataSessao(celulas.join(" "));
    }
    if (celulas.some((c) => normalizarTexto(c).startsWith("horario de entrada"))) {
      indiceHeader = i;
      break;
    }
  }

  if (indiceHeader === -1) {
    avisos.push('Cabeçalho "Horário de entrada" não encontrado — verifique se é a planilha modelo');
    return { linhas: [], dataSessao, avisos };
  }
  if (!dataSessao) {
    avisos.push('Data da sessão não encontrada (ex.: "Data: 18MAR22") — use a data do cabeçalho da aba');
  }

  const data = dataSessao ?? new Date().toISOString().slice(0, 10);
  const linhas: LinhaGrid[] = [];

  for (let i = indiceHeader + 1; i < linhasBrutas.length; i++) {
    const celulas = linhasBrutas[i].map(textoCelula);
    const [horarioEntradaTexto, horarioSaidaTexto, cameraTexto, descricao] = celulas;
    if (!horarioEntradaTexto && !descricao) continue;

    const numeroCamera = cameraTexto ? Number(cameraTexto.replace(/\D/g, "")) : null;
    const camera = numeroCamera
      ? cameras.find((c) => c.numero === numeroCamera)
      : undefined;
    if (cameraTexto && !camera) {
      avisos.push(`Linha ${i + 1}: câmera "${cameraTexto}" não encontrada no cadastro`);
    }

    linhas.push({
      id: novoIdTemporario(),
      data,
      horarioInicial: parseHorario(horarioEntradaTexto),
      horarioFinal: horarioSaidaTexto ? parseHorario(horarioSaidaTexto) : "",
      cameraId: camera?.id ?? null,
      cameraTexto: camera ? `Câmera ${camera.numero}` : cameraTexto || "",
      localId: null,
      localTexto: "",
      descricao: descricao || "",
      operadorId,
      operadorTexto,
      marcadorId: null,
      marcadorTexto: "",
      comentarioInterno: "",
    });
  }

  if (linhas.length === 0) {
    linhas.push(linhaVazia(data, operadorId, operadorTexto));
  }

  return { linhas, dataSessao, avisos };
}
