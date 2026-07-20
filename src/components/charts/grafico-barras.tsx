"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PontoNomeValor } from "@/services/indicadores";
import { BARRA_MAX, CORES, ChartTooltip, EIXO } from "./chart-config";

/** Colunas verticais (layout="vertical" = barras horizontais).
    Série única nominal: todas as barras no slot-1 (identidade não é recolorida). */
export function GraficoBarras({
  dados,
  nomeSerie,
  horizontal = false,
  cor = CORES.serie1,
}: {
  dados: PontoNomeValor[];
  nomeSerie: string;
  horizontal?: boolean;
  cor?: string;
}) {
  const altura = horizontal ? Math.max(256, dados.length * 32) : 256;

  return (
    <div style={{ height: altura }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={dados}
          layout={horizontal ? "vertical" : "horizontal"}
          margin={{ top: 4, right: 8, bottom: 0, left: horizontal ? 8 : -16 }}
          barCategoryGap="25%"
        >
          <CartesianGrid
            stroke={CORES.grid}
            strokeWidth={1}
            horizontal={!horizontal}
            vertical={horizontal}
          />
          {horizontal ? (
            <>
              <XAxis type="number" {...EIXO} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="nome"
                {...EIXO}
                width={130}
                interval={0}
              />
            </>
          ) : (
            <>
              <XAxis
                dataKey="nome"
                {...EIXO}
                interval={0}
                angle={dados.length > 6 ? -30 : 0}
                textAnchor={dados.length > 6 ? "end" : "middle"}
                height={dados.length > 6 ? 60 : 30}
              />
              <YAxis {...EIXO} allowDecimals={false} />
            </>
          )}
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ fill: "var(--muted)", opacity: 0.4 }}
          />
          <Bar
            dataKey="valor"
            name={nomeSerie}
            fill={cor}
            maxBarSize={BARRA_MAX}
            radius={horizontal ? [0, 4, 4, 0] : [4, 4, 0, 0]}
            isAnimationActive
            animationDuration={600}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
