// Parser da planilha "Câmeras inoperantes/com novidades" → dados normalizados.
// Regras aprovadas em 14/07/2026 (FASE1_MIGRACAO.md):
//  D1: 4 correções de data fundamentadas · D3: resolvidas sem data → NULL
//  D2: prédio único "Complexo ALESP"

import { createHash } from "node:crypto";
import {
  ehPtz,
  extrairDataNoTexto,
  extrairDefeito,
  extrairHora,
  extrairImpedimento,
  extrairLocal,
  extrairSubstituicao,
  extrairTecnico,
} from "./extracao.mts";
import type {
  CameraImport,
  EntradaLog,
  LinhaPlanilha,
  LocalExtraido,
  OcorrenciaImport,
  ResultadoParse,
  StatusCameraImport,
} from "./tipos.mts";

export const PREDIO_PADRAO = "Complexo ALESP";

// D1 — correções aprovadas para valores impossíveis de interpretar como data
const CORRECOES_DATA: Record<string, string> = {
  // "câmera|valorBruto" → ISO corrigido
  "20|0801/2024": "2025-01-08",
  "38|15/25/2025": "2025-05-15",
};

// Status final de câmera que o texto justifica explicitamente
// (30: removida da creche mas reinstalada no terraço na mesma linha)
const STATUS_CAMERA_OVERRIDE: Record<number, StatusCameraImport> = {
  30: "operante",
};

function dataUTC(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(
    d.getUTCDate()
  ).padStart(2, "0")}`;
}

function md5(s: string): string {
  return createHash("md5").update(s, "utf8").digest("hex");
}

/** Converte as linhas cruas do xlsx (header:1, cellDates) em LinhaPlanilha */
export function lerLinhas(rowsBrutas: unknown[][]): LinhaPlanilha[] {
  const linhas: LinhaPlanilha[] = [];
  // dados começam na linha 4 do Excel (índice 3); L1 título, L2 vazia, L3 cabeçalho
  for (let i = 3; i < rowsBrutas.length; i++) {
    const r = rowsBrutas[i] ?? [];
    const [check, , data, sol, cam, tarefa] = r;
    const vazia = r.every((c) => c === null || c === undefined || c === "");
    if (vazia) continue;
    linhas.push({
      linha: i + 1,
      resolvida: check === true || check === 1 || String(check) === "1",
      dataAbertura: data instanceof Date ? data : null,
      dataSolucaoBruta:
        sol instanceof Date ? sol : sol == null || sol === "" ? null : String(sol),
      camera:
        typeof cam === "number" && Number.isInteger(cam) ? cam : null,
      tarefa: String(tarefa ?? "").trim(),
    });
  }
  return linhas;
}

export function processarPlanilha(rowsBrutas: unknown[][]): ResultadoParse {
  const linhas = lerLinhas(rowsBrutas);
  const log: EntradaLog[] = [];
  const ocorrencias: OcorrenciaImport[] = [];

  let datasCorrigidas = 0;
  let horasExtraidas = 0;
  let semDataSolucao = 0;
  let semDataAbertura = 0;

  // data mínima do dataset (fallback aprovado para L42)
  const minData = linhas
    .filter((l) => l.dataAbertura)
    .reduce(
      (min, l) => (l.dataAbertura! < min ? l.dataAbertura! : min),
      new Date()
    );

  for (const l of linhas) {
    // ---------- Data de solução ----------
    let encerradaISO: string | null = null;
    if (l.dataSolucaoBruta instanceof Date) {
      encerradaISO = dataUTC(l.dataSolucaoBruta);
    } else if (typeof l.dataSolucaoBruta === "string") {
      const chave = `${l.camera}|${l.dataSolucaoBruta}`;
      if (CORRECOES_DATA[chave]) {
        encerradaISO = CORRECOES_DATA[chave];
        datasCorrigidas++;
        log.push({
          tipo: "corrigido",
          linha: l.linha,
          campo: "Data/Solução",
          mensagem: `"${l.dataSolucaoBruta}" → ${encerradaISO} (correção D1 aprovada)`,
        });
      } else {
        log.push({
          tipo: "invalido",
          linha: l.linha,
          campo: "Data/Solução",
          mensagem: `valor "${l.dataSolucaoBruta}" não interpretável — importado como NULL`,
        });
      }
    }

    // ---------- Data de abertura ----------
    let abertaBase: Date | null = l.dataAbertura;
    if (!abertaBase) {
      semDataAbertura++;
      if (encerradaISO) {
        abertaBase = new Date(`${encerradaISO}T00:00:00Z`);
        log.push({
          tipo: "corrigido",
          linha: l.linha,
          campo: "Data",
          mensagem: `sem data de abertura — usada a data de solução (${encerradaISO})`,
        });
      } else {
        abertaBase = minData;
        log.push({
          tipo: "corrigido",
          linha: l.linha,
          campo: "Data",
          mensagem: `sem nenhuma data — usada a data mínima do dataset (${dataUTC(minData)}), conforme plano §2.3`,
        });
      }
    }

    // data real de início citada no texto (ex.: "desde 23/12")
    const dataTexto = extrairDataNoTexto(l.tarefa, abertaBase);
    if (dataTexto) {
      const diffDias =
        (abertaBase.getTime() - dataTexto.getTime()) / 86400000;
      if (diffDias > 0 && diffDias <= 45) {
        log.push({
          tipo: "extraido",
          linha: l.linha,
          campo: "Data",
          mensagem: `início real da falha extraído do texto: ${dataUTC(dataTexto)} (coluna dizia ${dataUTC(abertaBase)})`,
        });
        abertaBase = dataTexto;
      } else if (diffDias > 45) {
        log.push({
          tipo: "ambiguo",
          linha: l.linha,
          campo: "Data",
          mensagem: `texto cita ${dataUTC(dataTexto)}, mas difere ${Math.round(diffDias)} dias da coluna — mantida a coluna`,
        });
      }
    }

    // hora extraída do texto
    const hora = extrairHora(l.tarefa);
    let abertaISO = dataUTC(abertaBase);
    if (hora) {
      horasExtraidas++;
      abertaISO += `T${String(hora.h).padStart(2, "0")}:${String(hora.m).padStart(2, "0")}:${String(hora.s).padStart(2, "0")}Z`;
    } else {
      abertaISO += "T00:00:00Z";
    }

    // correção genérica aprovada: solução < abertura por erro de ano digitado.
    // Comparação em granularidade de DIA (a hora extraída do texto não pode
    // invalidar uma solução ocorrida no mesmo dia da falha).
    let encerradaTimestamp: string | null = null;
    if (encerradaISO) {
      const enc = new Date(`${encerradaISO}T00:00:00Z`);
      const abertaDia = new Date(`${dataUTC(abertaBase)}T00:00:00Z`);
      const diff = (abertaDia.getTime() - enc.getTime()) / 86400000;
      if (diff > 0 && diff > 250 && diff < 430) {
        const corrigida = `${enc.getUTCFullYear() + 1}-${encerradaISO.slice(5)}`;
        datasCorrigidas++;
        log.push({
          tipo: "corrigido",
          linha: l.linha,
          campo: "Data/Solução",
          mensagem: `${encerradaISO} anterior à abertura (ano digitado errado) → ${corrigida} (correção D1)`,
        });
        encerradaISO = corrigida;
      } else if (diff > 0) {
        log.push({
          tipo: "invalido",
          linha: l.linha,
          campo: "Data/Solução",
          mensagem: `solução ${encerradaISO} anterior à abertura — importada como NULL`,
        });
        encerradaISO = null;
      }
    }
    if (encerradaISO) {
      // solução no MESMO dia de abertura com hora extraída: encerrada = aberta
      // (satisfaz o check encerrada_em >= aberta_em; MTTR 0 no mesmo dia)
      encerradaTimestamp =
        encerradaISO === dataUTC(abertaBase) ? abertaISO : `${encerradaISO}T00:00:00Z`;
    }

    if (l.resolvida && !encerradaTimestamp) {
      semDataSolucao++;
      log.push({
        tipo: "invalido",
        linha: l.linha,
        campo: "Data/Solução",
        mensagem: "resolvida sem data de solução — encerrada_em = NULL (decisão D3), fora do MTTR",
      });
    }

    // ---------- Classificações ----------
    const defeito = extrairDefeito(l.tarefa);
    if (defeito.ambiguo) {
      log.push({
        tipo: "ambiguo",
        linha: l.linha,
        campo: "Defeito",
        mensagem: `${defeito.ambiguo} (texto: "${l.tarefa.slice(0, 60)}…")`,
      });
    }

    const impedimento = extrairImpedimento(l.tarefa);
    const status = l.resolvida
      ? "concluida"
      : impedimento
        ? "aguardando_terceiros"
        : "aberta";

    if (l.camera === null) {
      log.push({
        tipo: "extraido",
        linha: l.linha,
        campo: "IP Cam",
        mensagem: "sem número de câmera — importada como ocorrência de sistema",
      });
    }

    ocorrencias.push({
      // chave estável: usa os valores BRUTOS da planilha (não muda se as
      // regras de extração evoluírem) → reimportação idempotente
      importChave: md5(
        `${l.camera ?? "sistema"}|${l.dataAbertura ? dataUTC(l.dataAbertura) : ""}|${l.tarefa}`
      ),
      linha: l.linha,
      camera: l.camera,
      defeito: defeito.nome,
      descricao: l.tarefa,
      status,
      abertaEm: abertaISO,
      encerradaEm: l.resolvida ? encerradaTimestamp : null,
      impedimento,
      tecnico: extrairTecnico(l.tarefa),
    });
  }

  // ---------- Consolidação do inventário ----------
  const porCamera = new Map<number, OcorrenciaImport[]>();
  for (const o of ocorrencias) {
    if (o.camera === null) continue;
    const lista = porCamera.get(o.camera) ?? [];
    lista.push(o);
    porCamera.set(o.camera, lista);
  }

  const linhaPorChave = new Map(ocorrencias.map((o) => [o.importChave, o]));
  const cameras: CameraImport[] = [];
  const substituicoes: { de: number; para: number; linha: number }[] = [];

  for (const [numero, lista] of [...porCamera.entries()].sort((a, b) => a[0] - b[0])) {
    lista.sort((a, b) => a.abertaEm.localeCompare(b.abertaEm));
    const ultima = lista[lista.length - 1];

    if (lista.length > 1) {
      log.push({
        tipo: "consolidado",
        linha: null,
        campo: "Câmera",
        mensagem: `câmera ${numero}: ${lista.length} registros na planilha consolidados em 1 cadastro + histórico`,
      });
    }

    // local: extração mais recente que encontrou local
    let local: LocalExtraido | null = null;
    for (let i = lista.length - 1; i >= 0 && !local; i--) {
      local = extrairLocal(lista[i].descricao, numero);
    }

    // substituição citada no texto
    const sub = extrairSubstituicao(ultima.descricao);
    if (sub) {
      substituicoes.push({
        de: numero,
        para: sub,
        linha: linhaPorChave.get(ultima.importChave)!.linha,
      });
    }

    // status
    let status: StatusCameraImport = "operante";
    const temAberta = lista.some((o) => o.status !== "concluida");
    const ultimaRemovida = ultima.defeito === "Removida por obra";
    if (sub) status = "desativada";
    else if (temAberta) status = ultimaRemovida ? "removida" : "inoperante";
    else if (ultimaRemovida) status = "removida";
    if (STATUS_CAMERA_OVERRIDE[numero]) {
      if (status !== STATUS_CAMERA_OVERRIDE[numero]) {
        log.push({
          tipo: "corrigido",
          linha: null,
          campo: "Câmera",
          mensagem: `câmera ${numero}: status ajustado para "${STATUS_CAMERA_OVERRIDE[numero]}" (texto indica reinstalação no terraço)`,
        });
      }
      status = STATUS_CAMERA_OVERRIDE[numero];
    }

    // observações reais extraídas
    const obs: string[] = [];
    if (lista.some((o) => ehPtz(o.descricao))) obs.push("Câmera PTZ (segundo a planilha)");
    if (sub) obs.push(`Substituída pela câmera ${sub} (planilha L${ultima.linha})`);
    if (numero === 30 || numero === 146) {
      obs.push("Troca cruzada 30↔146 (creche/terraço) citada na planilha — conferir numeração física");
    }

    cameras.push({
      numero,
      local,
      status,
      substituidaPor: sub,
      observacoes: obs.length ? obs.join(". ") : null,
      totalOcorrencias: lista.length,
    });
  }

  // câmeras novas criadas por substituição (199, 230)
  for (const s of substituicoes) {
    if (!porCamera.has(s.para)) {
      cameras.push({
        numero: s.para,
        local: cameras.find((c) => c.numero === s.de)?.local ?? null,
        status: "operante",
        substituidaPor: null,
        observacoes: `Instalada em substituição à câmera ${s.de} (planilha L${s.linha})`,
        totalOcorrencias: 0,
      });
      log.push({
        tipo: "extraido",
        linha: s.linha,
        campo: "Câmera",
        mensagem: `câmera ${s.para} criada a partir da substituição ${s.de} → ${s.para}`,
      });
    }
  }
  cameras.sort((a, b) => a.numero - b.numero);

  // locais únicos
  const locaisMap = new Map<string, LocalExtraido>();
  for (const c of cameras) {
    if (c.local) locaisMap.set(c.local.nome, c.local);
  }

  const concluidas = ocorrencias.filter((o) => o.status === "concluida").length;

  return {
    ocorrencias,
    cameras,
    locais: [...locaisMap.values()].sort((a, b) => a.nome.localeCompare(b.nome)),
    log,
    estatisticas: {
      linhasLidas: linhas.length,
      ocorrencias: ocorrencias.length,
      concluidas,
      abertas: ocorrencias.length - concluidas,
      ocorrenciasSistema: ocorrencias.filter((o) => o.camera === null).length,
      cameras: cameras.length,
      camerasConsolidadas: [...porCamera.values()].filter((l) => l.length > 1).length,
      locais: locaisMap.size,
      datasCorrigidas,
      horasExtraidas,
      semDataSolucao,
      semDataAbertura,
      registrosDescartados: 0,
    },
  };
}
