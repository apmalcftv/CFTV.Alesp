// Regras de negócio do dashboard: filtros e agregações.
// Funções puras sobre os dados já buscados — nenhuma chamada de rede aqui.

import type { CameraDash, OcorrenciaDash } from "@/services/dashboard";
import type { CameraStatus } from "@/types/domain";

// ---------- Filtros globais ----------

export type Periodo = "7d" | "30d" | "90d" | "12m" | "tudo";

export interface FiltrosDashboard {
  periodo: Periodo;
  predioId: string; // "todos" | uuid
  /** array vazio = todos os status */
  statusCamera: CameraStatus[];
  empresaId: string;
  fabricanteId: string;
  tipoDefeitoId: string;
}

export const FILTROS_INICIAIS: FiltrosDashboard = {
  periodo: "12m",
  predioId: "todos",
  statusCamera: [],
  empresaId: "todos",
  fabricanteId: "todos",
  tipoDefeitoId: "todos",
};

const DIA_MS = 24 * 60 * 60 * 1000;

export function inicioDoPeriodo(periodo: Periodo, agora = new Date()): Date | null {
  switch (periodo) {
    case "7d":
      return new Date(agora.getTime() - 7 * DIA_MS);
    case "30d":
      return new Date(agora.getTime() - 30 * DIA_MS);
    case "90d":
      return new Date(agora.getTime() - 90 * DIA_MS);
    case "12m": {
      const d = new Date(agora);
      d.setMonth(d.getMonth() - 12);
      return d;
    }
    case "tudo":
      return null;
  }
}

export interface DadosFiltrados {
  cameras: CameraDash[];
  /** ocorrências que passam nos filtros de dimensão E no período */
  ocorrencias: OcorrenciaDash[];
  /** ocorrências que passam nos filtros de dimensão, sem recorte de período
      (para KPIs de estado atual: OS abertas, SLA vencido, dias parada) */
  ocorrenciasAtuais: OcorrenciaDash[];
  /** janela anterior de mesmo tamanho (comparações de tendência) */
  ocorrenciasPeriodoAnterior: OcorrenciaDash[];
  inicioPeriodo: Date | null;
}

export function aplicarFiltros(
  cameras: CameraDash[],
  ocorrencias: OcorrenciaDash[],
  filtros: FiltrosDashboard,
  agora = new Date()
): DadosFiltrados {
  const porId = new Map(cameras.map((c) => [c.id, c]));

  const cameraPassa = (c: CameraDash) =>
    (filtros.predioId === "todos" ||
      c.local?.predio?.id === filtros.predioId) &&
    (filtros.statusCamera.length === 0 ||
      filtros.statusCamera.includes(c.status)) &&
    (filtros.fabricanteId === "todos" ||
      c.modelo?.fabricante?.id === filtros.fabricanteId);

  const camerasFiltradas = cameras.filter(cameraPassa);

  const ocorrenciaPassaDimensoes = (o: OcorrenciaDash) => {
    if (filtros.empresaId !== "todos" && o.empresa?.id !== filtros.empresaId)
      return false;
    if (
      filtros.tipoDefeitoId !== "todos" &&
      o.tipo_defeito?.id !== filtros.tipoDefeitoId
    )
      return false;
    // filtros de câmera (prédio/fabricante/status) valem para a OS da câmera;
    // OS de sistema (sem câmera) só passa quando esses filtros estão em "todos"
    const filtraCamera =
      filtros.predioId !== "todos" ||
      filtros.statusCamera.length > 0 ||
      filtros.fabricanteId !== "todos";
    if (!filtraCamera) return true;
    if (!o.camera_id) return false;
    const cam = porId.get(o.camera_id);
    return cam ? cameraPassa(cam) : false;
  };

  const dimensionadas = ocorrencias.filter(ocorrenciaPassaDimensoes);

  const inicio = inicioDoPeriodo(filtros.periodo, agora);
  const noPeriodo = inicio
    ? dimensionadas.filter((o) => new Date(o.aberta_em) >= inicio)
    : dimensionadas;

  let periodoAnterior: OcorrenciaDash[] = [];
  if (inicio) {
    const duracao = agora.getTime() - inicio.getTime();
    const inicioAnterior = new Date(inicio.getTime() - duracao);
    periodoAnterior = dimensionadas.filter((o) => {
      const d = new Date(o.aberta_em);
      return d >= inicioAnterior && d < inicio;
    });
  }

  return {
    cameras: camerasFiltradas,
    ocorrencias: noPeriodo,
    ocorrenciasAtuais: dimensionadas,
    ocorrenciasPeriodoAnterior: periodoAnterior,
    inicioPeriodo: inicio,
  };
}

// ---------- KPIs ----------

const ABERTAS: string[] = ["aberta", "em_andamento", "aguardando_aceite"];

export function estaAberta(o: OcorrenciaDash) {
  return ABERTAS.includes(o.status);
}

function mediaDias(valores: number[]): number | null {
  if (valores.length === 0) return null;
  return valores.reduce((a, b) => a + b, 0) / valores.length / DIA_MS;
}

function mediaHoras(valores: number[]): number | null {
  const dias = mediaDias(valores);
  return dias === null ? null : dias * 24;
}

export interface KpisDashboard {
  totalCameras: number;
  operantes: number;
  inoperantes: number;
  emManutencao: number;
  osAbertas: number;
  osVencidas: number;
  osAguardandoAceite: number;
  disponibilidadePct: number | null;
  mttrDias: number | null;
  mttrDiasAnterior: number | null;
  tmaHoras: number | null;
  tmaHorasAnterior: number | null;
  novasFalhas: number;
  novasFalhasAnterior: number;
  recuperadas: number;
  recuperadasAnterior: number;
}

export function calcularKpis(dados: DadosFiltrados, agora = new Date()): KpisDashboard {
  // câmeras desligada_permanentemente ficam fora do parque ativo — não
  // entram em nenhum indicador do Dashboard/Executivo
  const cameras = dados.cameras.filter(
    (c) => c.status !== "desligada_permanentemente"
  );
  const operantes = cameras.filter((c) => c.status === "operante").length;
  const inoperantes = cameras.filter(
    (c) => c.status === "inoperante" || c.status === "desligada"
  ).length;
  const emManutencao = cameras.filter(
    (c) => c.status === "em_manutencao"
  ).length;

  const abertas = dados.ocorrenciasAtuais.filter(estaAberta);
  const vencidas = abertas.filter(
    (o) => o.sla_vence_em && new Date(o.sla_vence_em) < agora
  );
  const aguardandoAceite = dados.ocorrenciasAtuais.filter(
    (o) => o.status === "aguardando_aceite"
  );

  const concluidasNoPeriodo = dados.ocorrencias.filter(
    (o) => o.status === "concluida" && o.encerrada_em
  );
  const mttr = mediaDias(
    concluidasNoPeriodo.map(
      (o) =>
        new Date(o.encerrada_em!).getTime() - new Date(o.aberta_em).getTime()
    )
  );
  const tma = mediaHoras(
    dados.ocorrencias
      .filter((o) => o.primeira_resposta_em)
      .map(
        (o) =>
          new Date(o.primeira_resposta_em!).getTime() -
          new Date(o.aberta_em).getTime()
      )
  );

  const anteriores = dados.ocorrenciasPeriodoAnterior;
  const concluidasAnt = anteriores.filter(
    (o) => o.status === "concluida" && o.encerrada_em
  );

  return {
    totalCameras: cameras.length,
    operantes,
    inoperantes,
    emManutencao,
    osAbertas: abertas.length,
    osVencidas: vencidas.length,
    osAguardandoAceite: aguardandoAceite.length,
    disponibilidadePct:
      cameras.length > 0 ? (operantes / cameras.length) * 100 : null,
    mttrDias: mttr,
    mttrDiasAnterior: mediaDias(
      concluidasAnt.map(
        (o) =>
          new Date(o.encerrada_em!).getTime() - new Date(o.aberta_em).getTime()
      )
    ),
    tmaHoras: tma,
    tmaHorasAnterior: mediaHoras(
      anteriores
        .filter((o) => o.primeira_resposta_em)
        .map(
          (o) =>
            new Date(o.primeira_resposta_em!).getTime() -
            new Date(o.aberta_em).getTime()
        )
    ),
    novasFalhas: dados.ocorrencias.length,
    novasFalhasAnterior: anteriores.length,
    recuperadas: concluidasNoPeriodo.length,
    recuperadasAnterior: concluidasAnt.length,
  };
}

// ---------- Agregações para gráficos ----------

export interface PontoNomeValor {
  nome: string;
  valor: number;
}

function contarPor<T>(
  itens: T[],
  chave: (item: T) => string | null | undefined
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

export function statusCamerasPizza(cameras: CameraDash[]) {
  const ativas = cameras.filter(
    (c) => c.status !== "desligada_permanentemente"
  );
  return {
    operantes: ativas.filter((c) => c.status === "operante").length,
    inoperantes: ativas.filter(
      (c) => c.status === "inoperante" || c.status === "desligada"
    ).length,
    manutencao: ativas.filter((c) => c.status === "em_manutencao").length,
  };
}

export function ocorrenciasPorPredio(ocorrencias: OcorrenciaDash[]) {
  return contarPor(ocorrencias, (o) => o.camera?.local?.predio?.nome);
}

export function topLocais(ocorrencias: OcorrenciaDash[], limite = 10) {
  return contarPor(ocorrencias, (o) => o.camera?.local?.nome).slice(0, limite);
}

export function rankingDefeitos(ocorrencias: OcorrenciaDash[], limite = 10) {
  return contarPor(ocorrencias, (o) => o.tipo_defeito?.nome).slice(0, limite);
}

export function rankingEmpresas(ocorrencias: OcorrenciaDash[]) {
  return contarPor(ocorrencias, (o) => o.empresa?.nome);
}

export interface RankingEmpresaSla {
  nome: string;
  total: number;
  concluidas: number;
  pctDentroSla: number | null;
}

/** % das OS concluídas de cada empresa que fecharam antes do vencimento do SLA. */
export function rankingEmpresasSla(ocorrencias: OcorrenciaDash[]): RankingEmpresaSla[] {
  const mapa = new Map<string, OcorrenciaDash[]>();
  for (const o of ocorrencias) {
    const nome = o.empresa?.nome;
    if (!nome) continue;
    const lista = mapa.get(nome) ?? [];
    lista.push(o);
    mapa.set(nome, lista);
  }
  return [...mapa.entries()]
    .map(([nome, lista]) => {
      const concluidas = lista.filter((o) => o.status === "concluida" && o.encerrada_em);
      const dentroSla = concluidas.filter(
        (o) => !o.sla_vence_em || new Date(o.encerrada_em!) <= new Date(o.sla_vence_em)
      );
      return {
        nome,
        total: lista.length,
        concluidas: concluidas.length,
        pctDentroSla:
          concluidas.length > 0 ? (dentroSla.length / concluidas.length) * 100 : null,
      };
    })
    .sort((a, b) => b.total - a.total);
}

export function rankingFabricantes(
  ocorrencias: OcorrenciaDash[],
  cameras: CameraDash[]
) {
  const porId = new Map(cameras.map((c) => [c.id, c]));
  return contarPor(ocorrencias, (o) =>
    o.camera_id ? porId.get(o.camera_id)?.modelo?.fabricante?.nome : null
  );
}

export function rankingCameras(ocorrencias: OcorrenciaDash[], limite = 10) {
  return contarPor(ocorrencias, (o) =>
    o.camera ? `Câmera ${o.camera.numero}` : null
  ).slice(0, limite);
}

// ---------- Séries mensais ----------

// type (não interface): garante compatibilidade estrutural com
// Record<string, string | number> exigido pelos wrappers de gráfico
export type PontoMensal = {
  mes: string; // "2026-03"
  rotulo: string; // "mar/26"
  falhas: number;
  concluidas: number;
};

function chaveMes(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function rotuloMes(chave: string) {
  const [ano, mes] = chave.split("-").map(Number);
  const nomes = [
    "jan", "fev", "mar", "abr", "mai", "jun",
    "jul", "ago", "set", "out", "nov", "dez",
  ];
  return `${nomes[mes - 1]}/${String(ano).slice(2)}`;
}

function mesesDoIntervalo(inicio: Date, fim: Date): string[] {
  const meses: string[] = [];
  const d = new Date(inicio.getFullYear(), inicio.getMonth(), 1);
  while (d <= fim) {
    meses.push(chaveMes(d));
    d.setMonth(d.getMonth() + 1);
  }
  return meses;
}

export function evolucaoMensal(
  dados: DadosFiltrados,
  agora = new Date()
): PontoMensal[] {
  const { ocorrencias, inicioPeriodo } = dados;
  if (ocorrencias.length === 0 && !inicioPeriodo) return [];

  const primeira = ocorrencias.length
    ? new Date(
        Math.min(...ocorrencias.map((o) => new Date(o.aberta_em).getTime()))
      )
    : agora;
  const inicio = inicioPeriodo ?? primeira;

  return mesesDoIntervalo(inicio, agora).map((mes) => ({
    mes,
    rotulo: rotuloMes(mes),
    falhas: ocorrencias.filter((o) => chaveMes(new Date(o.aberta_em)) === mes)
      .length,
    concluidas: ocorrencias.filter(
      (o) => o.encerrada_em && chaveMes(new Date(o.encerrada_em)) === mes
    ).length,
  }));
}

export type PontoDisponibilidade = {
  mes: string;
  rotulo: string;
  disponibilidade: number; // 0–100
};

/** Disponibilidade mensal aproximada: 100% − (câmera-dias parados ÷ câmera-dias totais).
    Usa o intervalo aberta→encerrada de cada OS de câmera. */
export function disponibilidadeMensal(
  dados: DadosFiltrados,
  agora = new Date()
): PontoDisponibilidade[] {
  const totalCameras = dados.cameras.length;
  if (totalCameras === 0) return [];

  const serie = evolucaoMensal(dados, agora);
  const comCamera = dados.ocorrencias.filter((o) => o.camera_id);

  return serie.map(({ mes, rotulo }) => {
    const [ano, m] = mes.split("-").map(Number);
    const inicioMes = new Date(ano, m - 1, 1);
    const fimMes = new Date(
      Math.min(new Date(ano, m, 1).getTime(), agora.getTime())
    );
    const diasMes = (fimMes.getTime() - inicioMes.getTime()) / DIA_MS;
    if (diasMes <= 0) return { mes, rotulo, disponibilidade: 100 };

    let diasParados = 0;
    for (const o of comCamera) {
      const ini = new Date(o.aberta_em);
      const fim = o.encerrada_em ? new Date(o.encerrada_em) : agora;
      const overlap =
        Math.min(fim.getTime(), fimMes.getTime()) -
        Math.max(ini.getTime(), inicioMes.getTime());
      if (overlap > 0) diasParados += overlap / DIA_MS;
    }

    const pct = 100 - (diasParados / (totalCameras * diasMes)) * 100;
    return { mes, rotulo, disponibilidade: Math.max(0, Math.min(100, pct)) };
  });
}

// ---------- Mapa de calor por local ----------

export interface BlocoLocal {
  nome: string;
  total: number;
  operantes: number;
  inoperantes: number;
  disponibilidade: number; // 0–100
}

export function camerasPorGrupo(cameras: CameraDash[]): BlocoLocal[] {
  const grupos = new Map<string, CameraDash[]>();
  for (const c of cameras) {
    if (c.status === "desligada_permanentemente") continue;
    const nome = c.local?.predio?.nome ?? c.local?.nome ?? "Sem local definido";
    const lista = grupos.get(nome) ?? [];
    lista.push(c);
    grupos.set(nome, lista);
  }
  return [...grupos.entries()]
    .map(([nome, lista]) => {
      const operantes = lista.filter((c) => c.status === "operante").length;
      const inoperantes = lista.filter((c) => c.status === "inoperante").length;
      return {
        nome,
        total: lista.length,
        operantes,
        inoperantes,
        disponibilidade: (operantes / lista.length) * 100,
      };
    })
    .sort((a, b) => b.total - a.total);
}

// ---------- Alertas ----------

export interface Alertas {
  osVencidas: OcorrenciaDash[];
  slaProximo: OcorrenciaDash[]; // vence nas próximas 48h
  aguardandoAceite: OcorrenciaDash[]; // esperando conferência do Operador CFTC
  camerasCriticas: PontoNomeValor[]; // ≥3 ocorrências em 12 meses
  locaisCriticos: PontoNomeValor[];
}

export function calcularAlertas(
  dados: DadosFiltrados,
  agora = new Date()
): Alertas {
  const abertas = dados.ocorrenciasAtuais.filter(estaAberta);
  const em48h = new Date(agora.getTime() + 48 * 60 * 60 * 1000);
  const aguardandoAceite = dados.ocorrenciasAtuais
    .filter((o) => o.status === "aguardando_aceite")
    .sort((a, b) => new Date(a.aberta_em).getTime() - new Date(b.aberta_em).getTime());

  const doze = new Date(agora);
  doze.setMonth(doze.getMonth() - 12);
  const ultimos12m = dados.ocorrenciasAtuais.filter(
    (o) => new Date(o.aberta_em) >= doze
  );

  return {
    osVencidas: abertas
      .filter((o) => o.sla_vence_em && new Date(o.sla_vence_em) < agora)
      .sort(
        (a, b) =>
          new Date(a.sla_vence_em!).getTime() -
          new Date(b.sla_vence_em!).getTime()
      ),
    slaProximo: abertas
      .filter((o) => {
        if (!o.sla_vence_em) return false;
        const v = new Date(o.sla_vence_em);
        return v >= agora && v <= em48h;
      })
      .sort(
        (a, b) =>
          new Date(a.sla_vence_em!).getTime() -
          new Date(b.sla_vence_em!).getTime()
      ),
    aguardandoAceite,
    camerasCriticas: rankingCameras(ultimos12m, 5).filter((c) => c.valor >= 3),
    locaisCriticos: topLocais(ultimos12m, 3),
  };
}

// ---------- Dias parada ----------

export function diasParada(o: OcorrenciaDash, agora = new Date()): number {
  const fim = o.encerrada_em ? new Date(o.encerrada_em) : agora;
  return Math.max(
    0,
    Math.floor((fim.getTime() - new Date(o.aberta_em).getTime()) / DIA_MS)
  );
}
