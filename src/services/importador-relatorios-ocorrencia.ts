// Importador administrativo de planilhas Excel para o módulo "Relatórios
// de Ocorrências" — mesma filosofia permissiva de importador-cameras.ts
// (só um campo realmente inviável vira erro; o resto vira aviso e importa
// mesmo assim). Suporta os dois layouts de cabeçalho já identificados nas
// planilhas reais da CMAL (2020-2023 e 2025) via um mapa de aliases; para
// cabeçalhos desconhecidos, a tela de preview permite reatribuir cada
// coluna manualmente antes de confirmar.
import { createClient } from "@/lib/supabase/client";
import { crudLocais } from "@/services/cadastros";
import { crudSolicitantes } from "@/services/cadastros-relatorios-ocorrencia";
import type { Local } from "@/types/domain";
import type { Solicitante } from "@/types/relatorios-ocorrencia";

export const CAMPOS_RELATORIO = [
  "numero_original",
  "operador",
  "data_solicitacao",
  "data_fato",
  "hora_aproximada",
  "local_fato",
  "solicitante",
  "solicitante_civil",
  "solicitante_pm",
  "camera_texto",
  "descricao_fato",
  "data_exportacao",
  "destino",
  "conclusao",
  "providencias",
  "dias_analisados",
  "ignorar",
] as const;
export type CampoRelatorio = (typeof CAMPOS_RELATORIO)[number];

export const CAMPO_RELATORIO_LABEL: Record<CampoRelatorio, string> = {
  numero_original: "Número (original da planilha)",
  operador: "Operador",
  data_solicitacao: "Data da solicitação",
  data_fato: "Data do fato",
  hora_aproximada: "Hora aproximada",
  local_fato: "Local do fato",
  solicitante: "Solicitante",
  solicitante_civil: "Solicitante civil",
  solicitante_pm: "Solicitante PM",
  camera_texto: "Câmera(s)",
  descricao_fato: "Descrição do fato (Novidade)",
  data_exportacao: "Data da exportação",
  destino: "Destino/local armazenado",
  conclusao: "Conclusão/Resultados",
  providencias: "Providências",
  dias_analisados: "Dias/horas analisados",
  ignorar: "(ignorar esta coluna)",
};

const ALIASES: Record<Exclude<CampoRelatorio, "ignorar">, string[]> = {
  numero_original: ["ocorrencia", "no", "numero", "n"],
  operador: ["operador"],
  data_solicitacao: ["data da solicitacao"],
  data_fato: ["data do fato"],
  hora_aproximada: ["hora aproximada"],
  local_fato: ["local do fato"],
  solicitante: ["solicitante"],
  solicitante_civil: ["solicitante civil"],
  solicitante_pm: ["solicitante pm"],
  camera_texto: ["camera que captou", "camera", "cameras"],
  descricao_fato: ["novidade"],
  data_exportacao: ["data da exportacao"],
  destino: ["armazenado", "local armazenado"],
  conclusao: ["resultados"],
  providencias: ["providencias"],
  dias_analisados: [
    "total de horas",
    "total de horas analisadas",
    "periodo analizado",
    "dias analisados",
  ],
};

function normalizarTexto(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function campoDoTexto(texto: string): CampoRelatorio | null {
  const alvo = normalizarTexto(texto);
  if (!alvo) return null;
  for (const campo of Object.keys(ALIASES) as (keyof typeof ALIASES)[]) {
    if (ALIASES[campo].includes(alvo)) return campo;
  }
  return null;
}

function textoCelula(v: unknown): string {
  if (v === null || v === undefined) return "";
  return String(v).trim();
}

/** Uma linha é ruído (título de bloco mensal, cabeçalho repetido no meio do
    arquivo, ou linha totalmente vazia) — nunca vira registro. */
function linhaEhRuido(celulas: string[]): boolean {
  const preenchidas = celulas.filter(Boolean);
  if (preenchidas.length === 0) return true;
  const primeira = normalizarTexto(celulas[0] ?? "");
  if (primeira.startsWith("registro de novidades")) return true;
  if (primeira === "ocorrencia") return true; // cabeçalho repetido
  if (preenchidas.length === 1 && /^\d{4}$/.test(primeira)) return true; // "2022" solto
  return false;
}

export interface LinhaRelatorioBruta {
  linha: number;
  aba: string;
  valores: Partial<Record<CampoRelatorio, string>>;
}

export interface ArquivoRelatoriosLido {
  linhas: LinhaRelatorioBruta[];
  cabecalhoOriginal: string[];
  mapeamento: (CampoRelatorio | null)[];
}

export async function lerArquivoRelatorios(arquivo: File): Promise<ArquivoRelatoriosLido> {
  const XLSX = await import("xlsx");
  const ehCsv = arquivo.name.toLowerCase().endsWith(".csv");
  const livro = ehCsv
    ? XLSX.read(await arquivo.text(), { type: "string" })
    : XLSX.read(await arquivo.arrayBuffer(), { type: "array" });

  const linhas: LinhaRelatorioBruta[] = [];
  let cabecalhoOriginal: string[] = [];
  let mapeamentoExibicao: (CampoRelatorio | null)[] = [];

  for (const nomeAba of livro.SheetNames) {
    const planilha = livro.Sheets[nomeAba];
    const dados: unknown[][] = XLSX.utils.sheet_to_json(planilha, {
      header: 1,
      blankrows: false,
      raw: false,
    });

    let mapeamento: (CampoRelatorio | null)[] | null = null;

    dados.forEach((linhaBruta, i) => {
      const celulas = linhaBruta.map(textoCelula);
      if (linhaEhRuido(celulas)) return;

      if (!mapeamento) {
        const candidato = celulas.map(campoDoTexto);
        // header válido: reconhece ao menos "descricao_fato" (Novidade),
        // a coluna sempre presente nos dois layouts conhecidos
        if (candidato.includes("descricao_fato")) {
          mapeamento = candidato;
          if (cabecalhoOriginal.length === 0) {
            cabecalhoOriginal = celulas;
            mapeamentoExibicao = candidato;
          }
        }
        return;
      }

      const valores: Partial<Record<CampoRelatorio, string>> = {};
      mapeamento.forEach((campo, j) => {
        if (!campo || campo === "ignorar") return;
        const texto = celulas[j];
        if (!texto) return;
        valores[campo] = valores[campo] ? `${valores[campo]} / ${texto}` : texto;
      });
      if (Object.values(valores).some(Boolean)) {
        linhas.push({ linha: i + 1, aba: nomeAba, valores });
      }
    });
  }

  return { linhas, cabecalhoOriginal, mapeamento: mapeamentoExibicao };
}

/** Cabeçalho do modelo para download — mesmo layout usado nos registros
    mais recentes da CMAL (2025), já reconhecido automaticamente pelo
    mapa de aliases acima. */
const CABECALHO_MODELO = [
  "Ocorrência",
  "Operador",
  "Data do Fato",
  "Local do Fato",
  "Data da Solicitação",
  "Solicitante",
  "Câmera",
  "Novidade",
  "DATA DA EXPORTAÇÃO",
  "ARMAZENADO",
  "Resultados",
  "Providências",
] as const;

export async function baixarModeloRelatorios(): Promise<void> {
  const XLSX = await import("xlsx");
  const planilha = XLSX.utils.aoa_to_sheet([[...CABECALHO_MODELO]]);
  const livro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(livro, planilha, "Relatórios");
  XLSX.writeFile(livro, "modelo-relatorios-ocorrencias.xlsx");
}

const DATA_BR = /^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/;

function parseData(texto: string | undefined): string | null {
  if (!texto) return null;
  const m = texto.match(DATA_BR);
  if (!m) return null;
  const [, d, mes] = m;
  let ano = m[3];
  if (ano.length === 2) ano = Number(ano) < 50 ? `20${ano}` : `19${ano}`;
  const dia = d.padStart(2, "0");
  const mesFmt = mes.padStart(2, "0");
  const data = new Date(`${ano}-${mesFmt}-${dia}T00:00:00`);
  if (Number.isNaN(data.getTime())) return null;
  return `${ano}-${mesFmt}-${dia}`;
}

/** Hash simples e determinístico (FNV-1a) — suficiente para uma chave de
    idempotência de import, não precisa ser criptográfico. */
function hashFnv1a(texto: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    hash ^= texto.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16);
}

export type AcaoLinhaRelatorio = "nova" | "atualiza" | "erro";

export interface LinhaRelatorioAvaliada extends LinhaRelatorioBruta {
  acao: AcaoLinhaRelatorio;
  importChave: string;
  erro: string | null;
  avisos: string[];
  dataSolicitacaoResolvida: string | null;
}

export function avaliarLinhasRelatorio(
  linhas: LinhaRelatorioBruta[],
  chavesExistentes: Set<string>
): LinhaRelatorioAvaliada[] {
  return linhas.map((l) => {
    const descricao = l.valores.descricao_fato?.trim();
    const importChave = hashFnv1a(
      `${l.valores.numero_original ?? ""}|${l.valores.data_fato ?? ""}|${descricao ?? ""}`
    );

    if (!descricao) {
      return {
        ...l,
        acao: "erro",
        importChave,
        erro: "Descrição do fato (Novidade) vazia — não é possível importar sem descrição",
        avisos: [],
        dataSolicitacaoResolvida: null,
      };
    }

    const avisos: string[] = [];
    const dataSolicitacao =
      parseData(l.valores.data_solicitacao) ?? parseData(l.valores.data_fato);
    if (!dataSolicitacao) {
      avisos.push(
        "Sem data de solicitação nem data do fato reconhecível — será usada a data de hoje"
      );
    }
    if (!l.valores.local_fato) {
      avisos.push("Local do fato não informado");
    }
    if (
      !l.valores.solicitante &&
      !l.valores.solicitante_civil &&
      !l.valores.solicitante_pm
    ) {
      avisos.push("Solicitante não informado");
    }

    return {
      ...l,
      acao: chavesExistentes.has(importChave) ? "atualiza" : "nova",
      importChave,
      erro: null,
      avisos,
      dataSolicitacaoResolvida: dataSolicitacao,
    };
  });
}

export interface RelatorioImportacaoRelatorios {
  importados: number;
  atualizados: number;
  locaisCriados: number;
  solicitantesCriados: number;
  avisos: { linha: number; mensagem: string }[];
  erros: { linha: number; motivo: string }[];
}

async function resolverOuCriarLocalRelatorio(
  nome: string,
  predioPadraoId: string | null,
  locais: Local[]
): Promise<{ id: string | null; criado: boolean }> {
  const existente = locais.find((l) => l.nome.toLowerCase() === nome.toLowerCase());
  if (existente) return { id: existente.id, criado: false };
  if (!predioPadraoId) return { id: null, criado: false };
  const criado = await crudLocais.criar({ nome, predio_id: predioPadraoId });
  locais.push(criado);
  return { id: criado.id, criado: true };
}

async function resolverOuCriarSolicitante(
  nome: string,
  solicitantes: Solicitante[]
): Promise<{ id: string; criado: boolean }> {
  const existente = solicitantes.find((s) => s.nome.toLowerCase() === nome.toLowerCase());
  if (existente) return { id: existente.id, criado: false };
  const criado = await crudSolicitantes.criar({ nome });
  solicitantes.push(criado);
  return { id: criado.id, criado: true };
}

export async function aplicarImportacaoRelatorios(
  linhas: LinhaRelatorioAvaliada[],
  tenantId: string,
  nomeArquivo: string,
  catalogos: {
    locais: Local[];
    predioPadraoId: string | null;
    solicitantes: Solicitante[];
  }
): Promise<RelatorioImportacaoRelatorios> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const relatorio: RelatorioImportacaoRelatorios = {
    importados: 0,
    atualizados: 0,
    locaisCriados: 0,
    solicitantesCriados: 0,
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

    try {
      let localId: string | null = null;
      if (linha.valores.local_fato) {
        const resultado = await resolverOuCriarLocalRelatorio(
          linha.valores.local_fato,
          catalogos.predioPadraoId,
          catalogos.locais
        );
        localId = resultado.id;
        if (resultado.criado) relatorio.locaisCriados++;
      }

      const nomeSolicitante =
        linha.valores.solicitante ??
        [linha.valores.solicitante_civil, linha.valores.solicitante_pm]
          .filter(Boolean)
          .join(" / ");
      let solicitanteId: string | null = null;
      if (nomeSolicitante) {
        const resultado = await resolverOuCriarSolicitante(
          nomeSolicitante,
          catalogos.solicitantes
        );
        solicitanteId = resultado.id;
        if (resultado.criado) relatorio.solicitantesCriados++;
      }

      const observacoesExtras = [
        linha.valores.camera_texto ? `Câmera(s) citada(s): ${linha.valores.camera_texto}` : null,
        linha.valores.dias_analisados
          ? `Tempo analisado (planilha original): ${linha.valores.dias_analisados}`
          : null,
        linha.valores.numero_original
          ? `Nº original na planilha: ${linha.valores.numero_original}`
          : null,
      ].filter(Boolean);

      const payload = {
        tenant_id: tenantId,
        data_solicitacao: linha.dataSolicitacaoResolvida ?? new Date().toISOString().slice(0, 10),
        data_fato: parseData(linha.valores.data_fato),
        local_id: localId,
        descricao_fato: linha.valores.descricao_fato,
        solicitante_id: solicitanteId,
        observacoes_fato: observacoesExtras.join(" · ") || null,
        conclusao: linha.valores.conclusao || null,
        providencias_adotadas: linha.valores.providencias || null,
        status: "concluida" as const,
        data_conclusao: parseData(linha.valores.data_exportacao),
        criado_por: user?.id,
        import_chave: linha.importChave,
        origem_importacao: `${nomeArquivo} (${linha.aba}, linha ${linha.linha})`,
      };

      const { error } = await supabase
        .from("relatorios_ocorrencia")
        .upsert(payload, { onConflict: "tenant_id,import_chave" });
      if (error) throw error;

      if (linha.acao === "atualiza") relatorio.atualizados++;
      else relatorio.importados++;
    } catch (e) {
      relatorio.erros.push({ linha: linha.linha, motivo: (e as Error).message });
    }
  }

  return relatorio;
}
