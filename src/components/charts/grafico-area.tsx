"use client";

import { useId } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CORES, ChartTooltip, EIXO } from "./chart-config";

type Registro = Record<string, string | number>;

export function GraficoArea({
  dados,
  eixoX,
  dataKey,
  nome,
  cor = CORES.serie1,
  formatador,
  dominioY,
}: {
  dados: Registro[];
  eixoX: string;
  dataKey: string;
  nome: string;
  cor?: string;
  formatador?: (v: number) => string;
  dominioY?: [number, number];
}) {
  const gradientId = `grafico-area-${useId()}`;

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={dados} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={cor} stopOpacity={0.32} />
              <stop offset="100%" stopColor={cor} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke={CORES.grid} strokeWidth={1} vertical={false} />
          <XAxis dataKey={eixoX} {...EIXO} />
          <YAxis
            {...EIXO}
            domain={dominioY}
            tickFormatter={formatador}
            width={48}
          />
          <Tooltip
            content={<ChartTooltip formatador={formatador} />}
            cursor={{ stroke: CORES.texto, strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey={dataKey}
            name={nome}
            stroke={cor}
            strokeWidth={2}
            fill={`url(#${gradientId})`}
            dot={false}
            activeDot={{ r: 4, fill: cor, stroke: CORES.surface, strokeWidth: 2 }}
            isAnimationActive
            animationDuration={600}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
