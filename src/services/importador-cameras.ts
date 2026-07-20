import { crudCameras } from "@/services/cameras";
import {
  crudFabricantes,
  crudLocais,
  crudModelos,
  crudNvrs,
} from "@/services/cadastros";
import {
  CAMERA_STATUS_LABEL,
  type Camera,
  type CameraStatus,
  type Fabricante,
  type Local,
  type ModeloCamera,
  type Nvr,
} from "@/types/domain";

const CABECALHO = [
  "IP",
  "Local",
  "Patrimônio",
  "Fabricante",
  "Modelo",
  "NVR",
  "Observações",
  "Status",
] as const;

function normalizarTexto(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

const MAPA_STATUS: Record<string, CameraStatus> = {};
for (const s of Object.keys(CAMERA_STATUS_LABEL) as CameraStatus[]) {
  MAPA_STATUS[normalizarTexto(s)] = s;
  MAPA_STATUS[normalizarTexto(CAMERA_STATUS_LABEL[s])] = s;
}

/** Status é um enum fechado (não um catálogo como Fabricante/Modelo): texto
    ausente vira "Operante" em silêncio; texto presente mas não reconhecido
    também vira "Operante", mas com aviso — nunca bloqueia a linha. */
function statusDoTexto(texto: string): { status: CameraStatus; aviso: string | null } {
  const t = texto.trim();
  if (!t) return { status: "operante", aviso: null };
  const encontrado = MAPA_STATUS[normalizarTexto(t)];
  if (encontrado) return { status: encontrado, aviso: null };
  return {
    status: "operante",
    aviso: `Status "${t}" não reconhecido — aplicado "Operante"`,
  };
}

export async function baixarModeloInventario() {
  const XLSX = await import("xlsx");
  const planilha = XLSX.utils.aoa_to_sheet([[...CABECALHO]]);
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, planilha, "Inventário");
  XLSX.writeFile(livro, "modelo-inventario-cameras.xlsx");
}

export interface LinhaInventario {
  linha: number;
  ip: string;
  local: string;
  patrimonio: string;
  fabricante: string;
  modelo: string;
  nvr: string;
  observacoes: string;
  status: string;
}

function textoCelula(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

export async function lerArquivoInventario(arquivo: File): Promise<LinhaInventario[]> {
  const XLSX = await import("xlsx");
  const ehCsv = arquivo.name.toLowerCase().endsWith(".csv");
  let planilha: import("xlsx").WorkSheet;

  if (ehCsv) {
    const texto = await arquivo.text();
    const livro = XLSX.read(texto, { type: "string" });
    planilha = livro.Sheets[livro.SheetNames[0]];
  } else {
    const buffer = await arquivo.arrayBuffer();
    const livro = XLSX.read(buffer, { type: "array" });
    planilha = livro.Sheets[livro.SheetNames[0]];
  }

  const linhas: unknown[][] = XLSX.utils.sheet_to_json(planilha, {
    header: 1,
    blankrows: false,
  });

  return linhas
    .slice(1) // pula o cabeçalho
    .map((celulas, i) => ({
      linha: i + 2,
      ip: textoCelula(celulas[0]),
      local: textoCelula(celulas[1]),
      patrimonio: textoCelula(celulas[2]),
      fabricante: textoCelula(celulas[3]),
      modelo: textoCelula(celulas[4]),
      nvr: textoCelula(celulas[5]),
      observacoes: textoCelula(celulas[6]),
      status: textoCelula(celulas[7]),
    }))
    .filter((l) => l.ip || l.local);
}

function ipValido(ip: string): boolean {
  const partes = ip.split(".");
  if (partes.length !== 4) return false;
  return partes.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255);
}

function numeroDoIp(ip: string): number {
  return Number(ip.split(".")[3]);
}

/** "erro" só existe para IP inválido/vazio — o resto do importador é
    permissivo: cadastros auxiliares ausentes viram avisos e são criados
    automaticamente na aplicação (importar primeiro, validar depois). */
export type AcaoLinha = "nova" | "duplicada" | "erro";

export interface LinhaAvaliada extends LinhaInventario {
  acao: AcaoLinha;
  numero: number | null;
  cameraExistenteId: string | null;
  erro: string | null;
  avisos: string[];
  statusResolvido: CameraStatus;
}

export function avaliarLinhas(
  linhas: LinhaInventario[],
  camerasAtuais: Camera[],
  locais: Local[]
): LinhaAvaliada[] {
  return linhas.map((l) => {
    if (!l.ip || !ipValido(l.ip)) {
      return {
        ...l,
        acao: "erro",
        numero: null,
        cameraExistenteId: null,
        erro: `IP inválido: "${l.ip || "(vazio)"}"`,
        avisos: [],
        statusResolvido: "operante",
      };
    }

    const avisos: string[] = [];
    if (l.local) {
      const local = locais.find((loc) => loc.nome.toLowerCase() === l.local.toLowerCase());
      if (!local) avisos.push(`Local "${l.local}" será cadastrado automaticamente`);
    } else {
      avisos.push("Local não informado — câmera ficará sem local definido");
    }
    if (l.fabricante && l.modelo === "") {
      avisos.push("Fabricante informado sem modelo — modelo não será associado");
    }
    const { status: statusResolvido, aviso: avisoStatus } = statusDoTexto(l.status);
    if (avisoStatus) avisos.push(avisoStatus);

    const numero = numeroDoIp(l.ip);
    const existente = camerasAtuais.find((c) => c.ip === l.ip);
    return {
      ...l,
      acao: existente ? "duplicada" : "nova",
      numero,
      cameraExistenteId: existente?.id ?? null,
      erro: null,
      avisos,
      statusResolvido,
    };
  });
}

export type OpcaoDuplicata = "atualizar" | "duplicar" | "ignorar";

export interface RelatorioImportacao {
  importadas: number;
  atualizadas: number;
  ignoradas: number;
  locaisCriados: number;
  fabricantesCriados: number;
  modelosCriados: number;
  nvrsCriados: number;
  avisos: { linha: number; mensagem: string }[];
  erros: { linha: number; motivo: string }[];
}

async function resolverOuCriarLocal(
  nome: string,
  predioPadraoId: string | null,
  locais: Local[]
): Promise<{ id: string | null; criado: boolean }> {
  const existente = locais.find((loc) => loc.nome.toLowerCase() === nome.toLowerCase());
  if (existente) return { id: existente.id, criado: false };
  if (!predioPadraoId) return { id: null, criado: false };
  const criado = await crudLocais.criar({ nome, predio_id: predioPadraoId });
  locais.push(criado);
  return { id: criado.id, criado: true };
}

async function resolverOuCriarFabricante(
  nome: string,
  fabricantes: Fabricante[]
): Promise<{ id: string; criado: boolean }> {
  const existente = fabricantes.find((f) => f.nome.toLowerCase() === nome.toLowerCase());
  if (existente) return { id: existente.id, criado: false };
  const criado = await crudFabricantes.criar({ nome });
  fabricantes.push(criado);
  return { id: criado.id, criado: true };
}

async function resolverOuCriarModelo(
  nome: string,
  fabricanteId: string,
  modelos: ModeloCamera[]
): Promise<{ id: string; criado: boolean }> {
  const existente = modelos.find(
    (m) => m.fabricante_id === fabricanteId && m.nome.toLowerCase() === nome.toLowerCase()
  );
  if (existente) return { id: existente.id, criado: false };
  const criado = await crudModelos.criar({ nome, fabricante_id: fabricanteId });
  modelos.push(criado);
  return { id: criado.id, criado: true };
}

async function resolverOuCriarNvr(
  nome: string,
  nvrs: Nvr[]
): Promise<{ id: string; criado: boolean }> {
  const existente = nvrs.find((n) => n.nome.toLowerCase() === nome.toLowerCase());
  if (existente) return { id: existente.id, criado: false };
  const criado = await crudNvrs.criar({ nome });
  nvrs.push(criado);
  return { id: criado.id, criado: true };
}

export async function aplicarImportacao(
  linhas: LinhaAvaliada[],
  opcaoDuplicata: OpcaoDuplicata,
  catalogos: {
    fabricantes: Fabricante[];
    modelos: ModeloCamera[];
    nvrs: Nvr[];
    locais: Local[];
    predioPadraoId: string | null;
  }
): Promise<RelatorioImportacao> {
  const relatorio: RelatorioImportacao = {
    importadas: 0,
    atualizadas: 0,
    ignoradas: 0,
    locaisCriados: 0,
    fabricantesCriados: 0,
    modelosCriados: 0,
    nvrsCriados: 0,
    avisos: [],
    erros: [],
  };

  for (const linha of linhas) {
    if (linha.acao === "erro") {
      relatorio.erros.push({ linha: linha.linha, motivo: linha.erro ?? "Erro desconhecido" });
      continue;
    }
    for (const aviso of linha.avisos) {
      relatorio.avisos.push({ linha: linha.linha, mensagem: aviso });
    }
    if (linha.acao === "duplicada" && opcaoDuplicata === "ignorar") {
      relatorio.ignoradas++;
      continue;
    }

    try {
      let localId: string | null = null;
      if (linha.local) {
        const resultado = await resolverOuCriarLocal(
          linha.local,
          catalogos.predioPadraoId,
          catalogos.locais
        );
        localId = resultado.id;
        if (resultado.criado) relatorio.locaisCriados++;
      }

      let modeloId: string | null = null;
      if (linha.modelo && linha.fabricante) {
        const fab = await resolverOuCriarFabricante(linha.fabricante, catalogos.fabricantes);
        if (fab.criado) relatorio.fabricantesCriados++;
        const mod = await resolverOuCriarModelo(linha.modelo, fab.id, catalogos.modelos);
        if (mod.criado) relatorio.modelosCriados++;
        modeloId = mod.id;
      }

      let nvrId: string | null = null;
      if (linha.nvr) {
        const nvr = await resolverOuCriarNvr(linha.nvr, catalogos.nvrs);
        if (nvr.criado) relatorio.nvrsCriados++;
        nvrId = nvr.id;
      }

      const payload: Partial<Camera> = {
        numero: linha.numero!,
        ip: linha.ip,
        local_id: localId,
        patrimonio: linha.patrimonio || null,
        modelo_id: modeloId,
        nvr_id: nvrId,
        observacoes: linha.observacoes || null,
        status: linha.statusResolvido,
      };

      if (linha.acao === "duplicada" && opcaoDuplicata === "atualizar" && linha.cameraExistenteId) {
        await crudCameras.atualizar(linha.cameraExistenteId, payload);
        relatorio.atualizadas++;
      } else {
        // "nova" ou "duplicada" com opção "duplicar" — nunca cancela o lote;
        // se a trava de IP único do banco rejeitar, essa linha vira erro.
        await crudCameras.criar(payload);
        relatorio.importadas++;
      }
    } catch (e) {
      relatorio.erros.push({ linha: linha.linha, motivo: (e as Error).message });
    }
  }

  return relatorio;
}
