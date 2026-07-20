"use client";

import type {
  PontoDisponibilidade,
  PontoMensal,
  PontoNomeValor,
} from "@/services/indicadores";
import { CORES, fmtPct } from "@/components/charts/chart-config";
import { GraficoArea } from "@/components/charts/grafico-area";
import { GraficoBarras } from "@/components/charts/grafico-barras";
import { GraficoLinha } from "@/components/charts/grafico-linha";
import { GraficoPizzaStatus } from "@/components/charts/grafico-pizza-status";
import { ChartCard } from "./chart-card";
import { PainelAlertas } from "./painel-alertas";
import type { Alertas } from "@/services/indicadores";

export interface DadosGraficos {
  statusPizza: { operantes: number; inoperantes: number; manutencao: number };
  porPredio: PontoNomeValor[];
  topLocais: PontoNomeValor[];
  evolucao: PontoMensal[];
  disponibilidade: PontoDisponibilidade[];
  fabricantes: PontoNomeValor[];
  empresas: PontoNomeValor[];
  alertas: Alertas;
}

function tabelaNomeValor(itens: PontoNomeValor[], coluna: string) {
  return {
    colunas: [coluna, "Ocorrências"],
    linhas: itens.map((i) => [i.nome, i.valor]),
  };
}

export function SecaoGraficos({
  dados,
  atualizando,
}: {
  dados: DadosGraficos;
  atualizando?: boolean;
}) {
  const { statusPizza } = dados;
  const totalPizza =
    statusPizza.operantes + statusPizza.inoperantes + statusPizza.manutencao;

  return (
    <>
      {/* Linha principal: 4 gráficos + painel de alertas lateral */}
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="grid gap-4 sm:grid-cols-2 xl:col-span-2">
          <ChartCard
            titulo="Status das câmeras"
            subtitulo="Parque atual, conforme filtros"
            vazio={totalPizza === 0}
            atualizando={atualizando}
            tabela={{
              colunas: ["Status", "Câmeras"],
              linhas: [
                ["Operantes", statusPizza.operantes],
                ["Inoperantes", statusPizza.inoperantes],
                ["Manutenção", statusPizza.manutencao],
              ],
            }}
          >
            <GraficoPizzaStatus {...statusPizza} />
          </ChartCard>

          <ChartCard
            titulo="Ocorrências por prédio"
            vazio={dados.porPredio.length === 0}
            atualizando={atualizando}
            tabela={tabelaNomeValor(dados.porPredio, "Prédio")}
          >
            <GraficoBarras dados={dados.porPredio} nomeSerie="Ocorrências" />
          </ChartCard>

          <ChartCard
            titulo="Evolução mensal das falhas"
            subtitulo="Novas ocorrências abertas por mês"
            vazio={dados.evolucao.every((p) => p.falhas === 0)}
            atualizando={atualizando}
            tabela={{
              colunas: ["Mês", "Falhas"],
              linhas: dados.evolucao.map((p) => [p.rotulo, p.falhas]),
            }}
          >
            <GraficoLinha
              dados={dados.evolucao}
              eixoX="rotulo"
              series={[
                { dataKey: "falhas", nome: "Falhas", cor: CORES.serie1 },
              ]}
            />
          </ChartCard>

          <ChartCard
            titulo="Evolução das manutenções"
            subtitulo="Ocorrências concluídas por mês"
            vazio={dados.evolucao.every((p) => p.concluidas === 0)}
            atualizando={atualizando}
            tabela={{
              colunas: ["Mês", "Concluídas"],
              linhas: dados.evolucao.map((p) => [p.rotulo, p.concluidas]),
            }}
          >
            <GraficoLinha
              dados={dados.evolucao}
              eixoX="rotulo"
              series={[
                {
                  dataKey: "concluidas",
                  nome: "Concluídas",
                  cor: CORES.serie3,
                },
              ]}
            />
          </ChartCard>
        </div>

        <PainelAlertas alertas={dados.alertas} atualizando={atualizando} />
      </div>

      {/* Top locais + fabricantes/empresas */}
      <div className="grid gap-4 xl:grid-cols-2">
        <ChartCard
          titulo="Top 10 locais com mais falhas"
          vazio={dados.topLocais.length === 0}
          atualizando={atualizando}
          tabela={tabelaNomeValor(dados.topLocais, "Local")}
        >
          <GraficoBarras
            dados={dados.topLocais}
            nomeSerie="Ocorrências"
            horizontal
          />
        </ChartCard>

        <div className="grid gap-4">
          <ChartCard
            titulo="Fabricantes com maior índice de defeitos"
            vazio={dados.fabricantes.length === 0}
            atualizando={atualizando}
            tabela={tabelaNomeValor(dados.fabricantes, "Fabricante")}
          >
            <GraficoBarras dados={dados.fabricantes} nomeSerie="Ocorrências" />
          </ChartCard>

          <ChartCard
            titulo="Ocorrências por empresa responsável"
            vazio={dados.empresas.length === 0}
            atualizando={atualizando}
            tabela={tabelaNomeValor(dados.empresas, "Empresa")}
          >
            <GraficoBarras dados={dados.empresas} nomeSerie="Ocorrências" />
          </ChartCard>
        </div>
      </div>

      {/* Disponibilidade mensal */}
      <ChartCard
        titulo="Disponibilidade mensal"
        subtitulo="100% − câmera-dias parados ÷ câmera-dias totais (aproximação pelas OS)"
        vazio={dados.disponibilidade.length === 0}
        atualizando={atualizando}
        tabela={{
          colunas: ["Mês", "Disponibilidade"],
          linhas: dados.disponibilidade.map((p) => [
            p.rotulo,
            fmtPct(p.disponibilidade),
          ]),
        }}
      >
        <GraficoArea
          dados={dados.disponibilidade}
          eixoX="rotulo"
          dataKey="disponibilidade"
          nome="Disponibilidade"
          formatador={(v) => fmtPct(v, 0)}
          dominioY={[
            Math.max(
              0,
              Math.floor(
                Math.min(
                  100,
                  ...dados.disponibilidade.map((p) => p.disponibilidade)
                ) - 5
              )
            ),
            100,
          ]}
        />
      </ChartCard>
    </>
  );
}
