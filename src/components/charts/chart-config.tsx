// Especificações compartilhadas dos gráficos (padrão do painel):
// marcas finas, grid hairline sólido e recessivo, texto em tokens de texto.

export const CORES = {
  serie1: "var(--chart-1)",
  serie2: "var(--chart-2)",
  serie3: "var(--chart-3)",
  serie4: "var(--chart-4)",
  serie5: "var(--chart-5)",
  operante: "var(--success)",
  degradada: "var(--warning)",
  inoperante: "var(--destructive)",
  // chart-1 (azul) para não colidir com o âmbar de "degradada" — mesma cor
  // do badge de "Em manutenção"
  manutencao: "var(--chart-1)",
  grid: "var(--border)",
  texto: "var(--muted-foreground)",
  surface: "var(--card)",
} as const;

export const EIXO = {
  tick: {
    fill: "var(--muted-foreground)",
    fontSize: 11,
    fontFamily: "var(--font-mono)",
  },
  axisLine: false,
  tickLine: false,
} as const;

export const BARRA_MAX = 24; // px — barras nunca preenchem o slot inteiro

export const fmtNumero = new Intl.NumberFormat("pt-BR");

export function fmtPct(v: number, casas = 1) {
  return `${v.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })}%`;
}

// ---------- Tooltip padrão ----------

interface ItemTooltip {
  name?: string | number;
  value?: number | string;
  color?: string;
}

export function ChartTooltip({
  active,
  payload,
  label,
  formatador,
}: {
  active?: boolean;
  payload?: ItemTooltip[];
  label?: string | number;
  formatador?: (v: number) => string;
}) {
  if (!active || !payload?.length) return null;
  const corDestaque = payload[0]?.color;
  return (
    <div
      className="rounded-lg border bg-popover px-3 py-2 text-xs shadow-md"
      style={
        corDestaque
          ? {
              boxShadow: `0 0 0 1px color-mix(in oklch, ${corDestaque} 35%, transparent), 0 8px 20px -6px color-mix(in oklch, ${corDestaque} 45%, transparent)`,
            }
          : undefined
      }
    >
      {label !== undefined && (
        <div className="mb-1 font-medium text-foreground">{label}</div>
      )}
      <div className="space-y-1">
        {payload.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <span
              aria-hidden
              className="h-0.5 w-3 shrink-0 rounded-full"
              style={{ background: item.color }}
            />
            <span className="font-semibold text-foreground">
              {typeof item.value === "number" && formatador
                ? formatador(item.value)
                : typeof item.value === "number"
                  ? fmtNumero.format(item.value)
                  : item.value}
            </span>
            <span className="text-muted-foreground">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
