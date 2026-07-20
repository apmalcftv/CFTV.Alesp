#!/usr/bin/env node
// Importação da planilha CFTV → SQL idempotente + log de migração.
//
// Uso:  node scripts/importar-planilha.mts [caminho-da-planilha.xlsx] [slug-do-tenant]
//       (tenant padrão: alesp)
// Saída: supabase/import/planilha_import.sql  (executar no Supabase)
//        supabase/import/import_log.md        (relatório da migração)

import { createRequire } from "node:module";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { processarPlanilha } from "../src/services/import/parser-planilha.mts";
import { gerarSql } from "../src/services/import/gerar-sql.mts";
import type { EntradaLog, ResultadoParse } from "../src/services/import/tipos.mts";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const caminhoPlanilha = resolve(
  process.argv[2] ?? join(raiz, "..", "planilha_cftv.xlsx")
);
const tenantSlug = process.argv[3] ?? "alesp";

console.log(`Lendo: ${caminhoPlanilha} (tenant: ${tenantSlug})`);
const wb = XLSX.readFile(caminhoPlanilha, { cellDates: true });
const aba = wb.SheetNames[0];
const rows: unknown[][] = XLSX.utils.sheet_to_json(wb.Sheets[aba], {
  header: 1,
  raw: true,
  defval: null,
});
console.log(`Aba "${aba}": ${rows.length} linhas brutas`);

const resultado = processarPlanilha(rows);
const agora = new Date();

// ---------- SQL ----------
const dirSaida = join(raiz, "supabase", "import");
mkdirSync(dirSaida, { recursive: true });
const sqlPath = join(dirSaida, "planilha_import.sql");
writeFileSync(sqlPath, gerarSql(resultado, agora, tenantSlug), "utf8");

// ---------- Log ----------
const logPath = join(dirSaida, "import_log.md");
writeFileSync(logPath, gerarLogMd(resultado, agora), "utf8");

// ---------- Resumo no terminal ----------
const e = resultado.estatisticas;
console.log(`
========== RESUMO DA IMPORTAÇÃO ==========
Linhas lidas:              ${e.linhasLidas}
Ocorrências geradas:       ${e.ocorrencias} (${e.concluidas} concluídas, ${e.abertas} abertas)
  · de sistema (sem cam):  ${e.ocorrenciasSistema}
Câmeras no inventário:     ${e.cameras} (${e.camerasConsolidadas} consolidadas de linhas repetidas)
Locais normalizados:       ${e.locais}
Datas corrigidas (D1):     ${e.datasCorrigidas}
Horas extraídas do texto:  ${e.horasExtraidas}
Sem data de solução (D3):  ${e.semDataSolucao}
Sem data de abertura:      ${e.semDataAbertura}
Registros descartados:     ${e.registrosDescartados}
Entradas de log:           ${resultado.log.length}
===========================================
SQL: ${sqlPath}
LOG: ${logPath}
`);

function gerarLogMd(r: ResultadoParse, quando: Date): string {
  const rotulo: Record<EntradaLog["tipo"], string> = {
    corrigido: "Corrigidos",
    extraido: "Extraídos do texto",
    consolidado: "Consolidações",
    ambiguo: "Ambiguidades (revisar)",
    invalido: "Campos inválidos/ausentes",
    ignorado: "Ignorados",
  };
  const s = r.estatisticas;
  const linhas: string[] = [
    `# Log de migração da planilha CFTV`,
    ``,
    `Gerado em ${quando.toISOString()} · idempotente (reimportar não duplica).`,
    ``,
    `## Totais`,
    ``,
    `| Métrica | Valor |`,
    `|---|---|`,
    `| Linhas lidas da planilha | ${s.linhasLidas} |`,
    `| Ocorrências importadas | ${s.ocorrencias} (${s.concluidas} concluídas · ${s.abertas} abertas) |`,
    `| Ocorrências de sistema (sem câmera) | ${s.ocorrenciasSistema} |`,
    `| Câmeras no inventário | ${s.cameras} |`,
    `| Câmeras consolidadas (linhas repetidas) | ${s.camerasConsolidadas} |`,
    `| Locais normalizados | ${s.locais} |`,
    `| Empresas | 1 (Infogoogle) · Técnicos: 1 (Eduardo) |`,
    `| Datas corrigidas (decisão D1) | ${s.datasCorrigidas} |`,
    `| Horas de falha extraídas do texto | ${s.horasExtraidas} |`,
    `| Concluídas sem data de solução (D3 → NULL) | ${s.semDataSolucao} |`,
    `| Sem data de abertura (regra §2.3) | ${s.semDataAbertura} |`,
    `| Registros descartados | ${s.registrosDescartados} |`,
    ``,
    `> Coluna "Grau" descartada por estar 100% vazia (não é um registro).`,
    `> Texto original de cada linha preservado integralmente em ocorrencias.descricao.`,
  ];

  for (const tipo of Object.keys(rotulo) as EntradaLog["tipo"][]) {
    const itens = r.log.filter((l) => l.tipo === tipo);
    if (!itens.length) continue;
    linhas.push(``, `## ${rotulo[tipo]} (${itens.length})`, ``);
    for (const i of itens) {
      linhas.push(
        `- ${i.linha ? `**L${i.linha}**` : "**—**"} · ${i.campo}: ${i.mensagem}`
      );
    }
  }

  linhas.push(
    ``,
    `## Inventário gerado`,
    ``,
    `| Câmera | Local | Status | Ocorrências | Observações |`,
    `|---|---|---|---|---|`
  );
  for (const c of r.cameras) {
    linhas.push(
      `| ${c.numero} | ${c.local?.nome ?? "—"} | ${c.status} | ${c.totalOcorrencias} | ${c.observacoes ?? ""} |`
    );
  }

  return linhas.join("\n") + "\n";
}
