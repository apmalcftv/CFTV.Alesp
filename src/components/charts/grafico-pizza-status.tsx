"use client";

import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CORES, ChartTooltip, fmtNumero } from "./chart-config";

export function GraficoPizzaStatus({
  operantes,
  degradadas,
  inoperantes,
  manutencao,
}: {
  operantes: number;
  degradadas: number;
  inoperantes: number;
  manutencao: number;
}) {
  const dados = [
    { name: "Operantes", value: operantes, cor: CORES.operante },
    { name: "Degradadas", value: degradadas, cor: CORES.degradada },
    { name: "Inoperantes", value: inoperantes, cor: CORES.inoperante },
    { name: "Manutenção", value: manutencao, cor: CORES.manutencao },
  ].filter((d) => d.value > 0);

  const total = operantes + degradadas + inoperantes + manutencao;

  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={dados}
            dataKey="value"
            nameKey="name"
            innerRadius="55%"
            outerRadius="80%"
            paddingAngle={2}
            stroke="var(--card)"
            strokeWidth={2}
            label={({ value }) =>
              total > 0 ? `${Math.round(((value as number) / total) * 100)}%` : ""
            }
            labelLine={false}
            fontSize={11}
            fill="var(--muted-foreground)"
          >
            {dados.map((d) => (
              <Cell key={d.name} fill={d.cor} />
            ))}
          </Pie>
          <Tooltip content={<ChartTooltip />} />
          <Legend
            iconType="circle"
            iconSize={8}
            formatter={(value: string) => (
              <span className="text-xs text-muted-foreground">
                {value}{" "}
                <span className="font-medium text-foreground">
                  {fmtNumero.format(
                    dados.find((d) => d.name === value)?.value ?? 0
                  )}
                </span>
              </span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
