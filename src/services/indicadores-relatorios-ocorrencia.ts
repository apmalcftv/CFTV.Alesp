// Regras de negócio do dashboard do módulo "Relatórios de Ocorrências":
// funções puras sobre os dados já buscados — nenhuma chamada de rede aqui.

import type { RelatorioOcorrenciaDetalhe } from "@/services/relatorios-ocorrencia";
import type { PontoNomeValor } from "@/services/indicadores";

const DIA_MS = 24 * 60 * 60 * 1000;

function contarPor(
  itens: RelatorioOcorrenciaDetalhe[],
  chave: (item: RelatorioOcorrenciaDetalhe) => string | null | undefined
): PontoNomeValor[] {
  const mapa = new Map<string, number>();
  for (const item of itens) {
    const k = chave(item);
    if (!k) continue;
    mapa.set(k, (mapa.get(k) ?? 0) + 1);
  }
  return [...mapa.entries()]
    .map(([nome, valor]) => ({ nome, valor }))
    .sort((a, b) => b.valor - a.valor);
}

export interface KpisRelatorioOcorrencia {
  recebidos: number;
  emAnalise: number;
  aguardandoInformacoes: number;
  concluidos: number;
  arquivados: number;
  tempoMedioConclusaoDias: number | null;
  exportacoesRealizadas: number;
}

export function calcularKpisRelatorio(
  lista: RelatorioOcorrenciaDetalhe[],
  exportacoesRealizadas: number
): KpisRelatorioOcorrencia {
  const concluidosComData = lista.filter(
    (r) => r.status === "concluida" && r.data_conclusao
  );
  const tempos = concluidosComData.map(
    (r) =>
      (new Date(r.data_conclusao!).getTime() - new Date(r.data_solicitacao).getTime()) /
      DIA_MS
  );
  const tempoMedio =
    tempos.length > 0 ? tempos.reduce((a, b) => a + b, 0) / tempos.length : null;

  return {
    recebidos: lista.filter((r) => r.status === "recebida").length,
    emAnalise: lista.filter((r) => r.status === "em_analise").length,
    aguardandoInformacoes: lista.filter((r) => r.status === "aguardando_informacoes")
      .length,
    concluidos: lista.filter((r) => r.status === "concluida").length,
    arquivados: lista.filter((r) => r.status === "arquivada").length,
    tempoMedioConclusaoDias: tempoMedio,
    exportacoesRealizadas,
  };
}

export function porMes(lista: RelatorioOcorrenciaDetalhe[], meses = 12): PontoNomeValor[] {
  const nomes = [
    "jan", "fev", "mar", "abr", "mai", "jun",
    "jul", "ago", "set", "out", "nov", "dez",
  ];
  const agora = new Date();
  const chaves: string[] = [];
  const rotulos = new Map<string, string>();
  for (let i = meses - 1; i >= 0; i--) {
    const d = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    chaves.push(chave);
    rotulos.set(chave, `${nomes[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`);
  }
  const contagem = new Map<string, number>();
  for (const r of lista) {
    const d = new Date(r.data_solicitacao);
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    if (rotulos.has(chave)) contagem.set(chave, (contagem.get(chave) ?? 0) + 1);
  }
  return chaves.map((c) => ({ nome: rotulos.get(c)!, valor: contagem.get(c) ?? 0 }));
}

export function porLocal(lista: RelatorioOcorrenciaDetalhe[], limite = 8): PontoNomeValor[] {
  return contarPor(lista, (r) => r.local?.nome).slice(0, limite);
}

export function porDepartamento(
  lista: RelatorioOcorrenciaDetalhe[],
  limite = 8
): PontoNomeValor[] {
  return contarPor(lista, (r) => r.departamento?.nome).slice(0, limite);
}

export function porOperador(
  lista: RelatorioOcorrenciaDetalhe[],
  limite = 8
): PontoNomeValor[] {
  return contarPor(lista, (r) => r.operador?.nome).slice(0, limite);
}

const ABERTOS: string[] = ["recebida", "em_analise", "aguardando_informacoes"];

export interface AlertasRelatorio {
  prazoVencido: RelatorioOcorrenciaDetalhe[];
  prazoProximo: RelatorioOcorrenciaDetalhe[]; // vence nos próximos 3 dias
}

export function calcularAlertasRelatorio(
  lista: RelatorioOcorrenciaDetalhe[],
  agora = new Date()
): AlertasRelatorio {
  const abertos = lista.filter((r) => ABERTOS.includes(r.status) && r.data_limite);
  const em3dias = new Date(agora.getTime() + 3 * DIA_MS);

  return {
    prazoVencido: abertos
      .filter((r) => new Date(r.data_limite!) < agora)
      .sort((a, b) => new Date(a.data_limite!).getTime() - new Date(b.data_limite!).getTime()),
    prazoProximo: abertos
      .filter((r) => {
        const d = new Date(r.data_limite!);
        return d >= agora && d <= em3dias;
      })
      .sort((a, b) => new Date(a.data_limite!).getTime() - new Date(b.data_limite!).getTime()),
  };
}
