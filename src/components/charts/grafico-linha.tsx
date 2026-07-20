"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CORES, ChartTooltip, EIXO } from "./chart-config";

export interface SerieLinha {
  dataKey: string;
  nome: string;
  cor: string;
}

type Registro = Record<string, string | number>;

export function GraficoLinha({
  dados,
  eixoX,
  series,
}: {
  dados: Registro[];
  eixoX: string;
  series: SerieLinha[];
}) {
  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={dados} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
          <CartesianGrid stroke={CORES.grid} strokeWidth={1} vertical={false} />
          <XAxis dataKey={eixoX} {...EIXO} />
          <YAxis {...EIXO} allowDecimals={false} />
          <Tooltip
            content={<ChartTooltip />}
            cursor={{ stroke: CORES.texto, strokeWidth: 1 }}
          />
          {series.length > 1 && (
            <Legend
              iconType="plainline"
              formatter={(value: string) => (
                <span className="text-xs text-muted-foreground">{value}</span>
              )}
            />
          )}
          {series.map((s) => (
            <Line
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.nome}
              stroke={s.cor}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              dot={false}
              activeDot={{
                r: 4,
                fill: s.cor,
                stroke: CORES.surface,
                strokeWidth: 2,
              }}
              isAnimationActive
              animationDuration={600}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
