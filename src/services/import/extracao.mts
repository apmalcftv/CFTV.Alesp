// Regras de extração sobre o texto livre da coluna "Tarefa".
// Cada regra é declarativa e testável; o texto original nunca é alterado.

import type { LocalExtraido } from "./tipos.mts";

// ---------- Defeito (mapeia para o catálogo tipos_defeito) ----------
// A ordem importa: padrões específicos antes dos genéricos.

const REGRAS_DEFEITO: { padrao: RegExp; nome: string; ambiguo?: string }[] = [
  { padrao: /ssd/i, nome: "Falha de disco (SSD/HD)" },
  { padrao: /anyvision/i, nome: "Falha de software (ANYVISION)" },
  { padrao: /plugin/i, nome: "Falha de plugin / player" },
  { padrao: /desprendida/i, nome: "Desprendida do suporte" },
  {
    padrao: /desalinhada|filmando o c[eé]u|tirada de [aâ]ngulo|fora de [aâ]ngulo/i,
    nome: "Desalinhada / fora de ângulo",
  },
  { padrao: /r[oe]movida/i, nome: "Removida por obra" },
  { padrao: /rebeixada|folhagem/i, nome: "Obstrução por folhagem" },
  { padrao: /oscila/i, nome: "Oscilação de imagem" },
  {
    padrao: /instabilidade|perda de dados|perdendo comunica|perdendo conec|perda de sinal/i,
    nome: "Instabilidade / perda de sinal",
  },
  {
    padrao: /lente\s+(?:muito\s+)?suja\s+ou\s+riscada/i,
    nome: "Lente suja",
    ambiguo: '"suja ou riscada" — classificada como Lente suja',
  },
  { padrao: /lente\s+riscada/i, nome: "Lente riscada" },
  { padrao: /lente/i, nome: "Lente suja" },
  { padrao: /inoperante|\bparada desde\b|\bficou parada\b/i, nome: "Inoperante" },
];

export function extrairDefeito(texto: string): {
  nome: string;
  ambiguo: string | null;
} {
  for (const regra of REGRAS_DEFEITO) {
    if (regra.padrao.test(texto)) {
      return { nome: regra.nome, ambiguo: regra.ambiguo ?? null };
    }
  }
  return { nome: "Outros", ambiguo: "nenhum padrão de defeito reconhecido" };
}

// ---------- Local ----------
// A ordem importa (padrões mais específicos primeiro). "vista ao/para" indica
// direção da lente, não o local — as regras de ponto de instalação vêm antes.

const REGRAS_LOCAL: { padrao: RegExp; local: LocalExtraido }[] = [
  { padrao: /caii?xa\s*d.?[aá]gua/i, local: { nome: "Caixa d'água", tipoArea: "área externa", andar: null } },
  { padrao: /elevador\s+(?:do\s+)?p-?1\b|p-?1[\s,].*elevador/i, local: { nome: "Elevador P-1", tipoArea: "elevador", andar: null } },
  { padrao: /elevador\s+(?:do\s+)?p-?2\b|p-?2[\s,].*elevador/i, local: { nome: "Elevador P-2", tipoArea: "elevador", andar: null } },
  { padrao: /elevador\s+i-?32|i-?32\s+elevador/i, local: { nome: "Elevador I-32", tipoArea: "elevador", andar: null } },
  { padrao: /elevador\s+i-?3\b|i-?3\b.*elevador/i, local: { nome: "Elevador I-3", tipoArea: "elevador", andar: null } },
  { padrao: /elevador\s+i-?4\b|i-?4\b.*elevador/i, local: { nome: "Elevador I-4", tipoArea: "elevador", andar: null } },
  { padrao: /elevador\s+i-?7\b|i-?7\b.*elevador/i, local: { nome: "Elevador I-7", tipoArea: "elevador", andar: null } },
  { padrao: /estacionamento\s+d?os?\s+funcion[aá]rios|centro do estacionamento/i, local: { nome: "Estacionamento dos funcionários", tipoArea: "estacionamento", andar: null } },
  { padrao: /estacionamento\s+a-?4|no a-?4\b.*estacionamento|pelo estacionamento a-?4/i, local: { nome: "Estacionamento A4", tipoArea: "estacionamento", andar: null } },
  { padrao: /v[aã]o do estacionamento als/i, local: { nome: "Estacionamento dos deputados", tipoArea: "estacionamento", andar: null } },
  { padrao: /acesso de ve[ií]culos/i, local: { nome: "Acesso de veículos (estacionamento)", tipoArea: "estacionamento", andar: null } },
  { padrao: /terra[çc]o/i, local: { nome: "Terraço", tipoArea: "área externa", andar: null } },
  { padrao: /creche/i, local: { nome: "Creche", tipoArea: "área externa", andar: null } },
  { padrao: /corredor central do 1|corredor do 1[ºª°]|galeria jk\)|mesmo corredor da galeria/i, local: { nome: "Corredor 1º andar (galeria JK)", tipoArea: "corredor", andar: "1º" } },
  { padrao: /jardim de inverno/i, local: { nome: "Corredor 3º andar (jardim de inverno)", tipoArea: "corredor", andar: "3º" } },
  { padrao: /corredor do 4[ºª°]/i, local: { nome: "Corredor 4º andar", tipoArea: "corredor", andar: "4º" } },
  { padrao: /cn?e[nt]ro m[eé]dico/i, local: { nome: "Centro Médico (3º andar)", tipoArea: "corredor", andar: "3º" } },
  { padrao: /cmal/i, local: { nome: "Corredor CMal", tipoArea: "corredor", andar: null } },
  { padrao: /arcolimp/i, local: { nome: "Corredor Arcolimp", tipoArea: "corredor", andar: null } },
  { padrao: /galeria jk/i, local: { nome: "Galeria JK", tipoArea: "corredor", andar: null } },
  { padrao: /teot[oô]nio vilela/i, local: { nome: "Auditório Teotônio Vilela", tipoArea: "auditório", andar: null } },
  { padrao: /audit[oó]rio franco montoro/i, local: { nome: "Auditório Franco Montoro", tipoArea: "auditório", andar: null } },
  { padrao: /pra[çc]a franco montoro/i, local: { nome: "Praça Franco Montoro", tipoArea: "área externa", andar: null } },
  { padrao: /refeit[oó]rio/i, local: { nome: "Refeitório", tipoArea: "área interna", andar: null } },
  { padrao: /subsolo/i, local: { nome: "Subsolo (bancos)", tipoArea: "área interna", andar: "subsolo" } },
  { padrao: /garagem/i, local: { nome: "Garagem", tipoArea: "garagem", andar: null } },
  { padrao: /portaria a-?3/i, local: { nome: "Portaria A3", tipoArea: "portaria", andar: null } },
  { padrao: /pr[oó]xima ao a-?1\b/i, local: { nome: "Portaria A1 (laje)", tipoArea: "portaria", andar: null } },
  { padrao: /no a-?2\b/i, local: { nome: "Portaria A2", tipoArea: "portaria", andar: null } },
  { padrao: /port[aã]o a-?6|\(a-?6\)/i, local: { nome: "Portão A6", tipoArea: "portaria", andar: null } },
  { padrao: /lixeira/i, local: { nome: "Lixeira", tipoArea: "área externa", andar: null } },
  { padrao: /2[ºª°] andar.*presid[eê]ncia|mesma dire[çc][aã]o que a presid[eê]ncia/i, local: { nome: "2º andar (presidência)", tipoArea: "corredor", andar: "2º" } },
  { padrao: /esquina da kozel/i, local: { nome: "Esquina Kozel × Abílio", tipoArea: "área externa", andar: null } },
  { padrao: /lateral poupa\s?tempo/i, local: { nome: "Lateral Poupatempo", tipoArea: "área externa", andar: null } },
  { padrao: /3[ºª°°]?\s*andar/i, local: { nome: "3º andar", tipoArea: "corredor", andar: "3º" } },
];

// Câmeras com local conhecido por número (mais confiável que o texto,
// confirmado por múltiplas linhas da própria planilha)
const LOCAL_POR_CAMERA: Record<number, LocalExtraido> = {
  139: { nome: "Elevador P-1", tipoArea: "elevador", andar: null },
  140: { nome: "Elevador P-2", tipoArea: "elevador", andar: null },
};

export function extrairLocal(
  texto: string,
  camera: number | null
): LocalExtraido | null {
  if (camera !== null && LOCAL_POR_CAMERA[camera]) {
    return LOCAL_POR_CAMERA[camera];
  }
  for (const regra of REGRAS_LOCAL) {
    if (regra.padrao.test(texto)) return regra.local;
  }
  return null;
}

// ---------- Hora e data dentro do texto ----------

/** "16h58min04seg" | "15h12" | "06h" → {h, m, s} */
export function extrairHora(
  texto: string
): { h: number; m: number; s: number } | null {
  const m = texto.match(/\b(\d{1,2})h(?:(\d{2}))?(?:min)?(?:(\d{2})\s*seg)?/);
  if (!m) return null;
  const h = Number(m[1]);
  if (h > 23) return null;
  return { h, m: Number(m[2] ?? 0), s: Number(m[3] ?? 0) };
}

const MESES_ABREV: Record<string, number> = {
  JAN: 1, FEV: 2, MAR: 3, ABR: 4, MAI: 5, JUN: 6,
  JUL: 7, AGO: 8, SET: 9, OUT: 10, NOV: 11, DEZ: 12,
};

/** Data de início da falha citada no texto ("desde 23/12", "desde o dia
    01/04/2025", "02FEV25"). Retorna null quando não há padrão confiável. */
export function extrairDataNoTexto(
  texto: string,
  referencia: Date
): Date | null {
  // remove tokens de hora ("22h09min", "07h41") para não atrapalhar o padrão de data
  const semHora = texto.replace(/\b\d{1,2}h(?:\d{2})?(?:min)?(?:\d{2}\s*seg)?\b/gi, " ");
  // desde [às hh] [o dia] DD/MM[/AAAA]
  const m1 = semHora.match(
    /(?:desde|parada desde|a partir)\s*(?:[aà]s)?\s*(?:do dia|o dia)?\s*(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/i
  );
  if (m1) {
    const dia = Number(m1[1]);
    const mes = Number(m1[2]);
    if (mes >= 1 && mes <= 12 && dia >= 1 && dia <= 31) {
      let ano = m1[3]
        ? Number(m1[3].length === 2 ? `20${m1[3]}` : m1[3])
        : referencia.getFullYear();
      let d = new Date(Date.UTC(ano, mes - 1, dia));
      // sem ano no texto e data ficaria depois da coluna Data → é do ano anterior
      if (!m1[3] && d.getTime() > referencia.getTime() + 86400000) {
        d = new Date(Date.UTC(ano - 1, mes - 1, dia));
      }
      return d;
    }
  }
  // DDMMMAA (02FEV25)
  const m2 = texto.match(/\b(\d{1,2})(JAN|FEV|MAR|ABR|MAI|JUN|JUL|AGO|SET|OUT|NOV|DEZ)(\d{2})\b/i);
  if (m2) {
    return new Date(
      Date.UTC(2000 + Number(m2[3]), MESES_ABREV[m2[2].toUpperCase()] - 1, Number(m2[1]))
    );
  }
  return null;
}

// ---------- Impedimento ----------

const REGRAS_IMPEDIMENTO: { padrao: RegExp; texto: string }[] = [
  { padrao: /obra na laje/i, texto: "Aguardando término da obra na laje" },
  { padrao: /necessita de? andaime/i, texto: "Necessita andaime" },
  { padrao: /posse d[oa] (?:departamento de )?infraestrutura/i, texto: "Equipamento em posse da Infraestrutura" },
  { padrao: /troca das placas do teto/i, texto: "Aguardando troca das placas do teto" },
  { padrao: /obras? pelo pk/i, texto: "Obras do PK no local" },
  { padrao: /removida devido a obra/i, texto: "Aguardando fim da obra no local" },
];

export function extrairImpedimento(texto: string): string | null {
  for (const regra of REGRAS_IMPEDIMENTO) {
    if (regra.padrao.test(texto)) return regra.texto;
  }
  return null;
}

// ---------- Técnico e substituição ----------

export function extrairTecnico(texto: string): string | null {
  return /eduardo/i.test(texto) ? "Eduardo" : null;
}

export function extrairSubstituicao(texto: string): number | null {
  const m = texto.match(/substituida pela (\d+)/i);
  return m ? Number(m[1]) : null;
}

export function ehPtz(texto: string): boolean {
  return /\bptz\b/i.test(texto);
}
