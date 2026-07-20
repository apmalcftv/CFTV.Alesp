"use client";

import Link from "next/link";
import { ArrowDownRight, ArrowUpRight, Minus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export type TomKpi = "neutro" | "sucesso" | "perigo" | "alerta" | "info";

const TOM_ICONE: Record<TomKpi, string> = {
  neutro: "bg-muted text-foreground",
  sucesso: "bg-success/10 text-success",
  perigo: "bg-destructive/10 text-destructive",
  alerta: "bg-warning/10 text-warning",
  info: "bg-[var(--chart-1)]/10 text-[var(--chart-1)]",
};

const TOM_PONTO: Record<TomKpi, string> = {
  neutro: "bg-muted-foreground",
  sucesso: "bg-success shadow-[0_0_6px_var(--success)]",
  perigo: "bg-destructive shadow-[0_0_6px_var(--destructive)]",
  alerta: "bg-warning shadow-[0_0_6px_var(--warning)]",
  info: "bg-[var(--chart-1)] shadow-[0_0_6px_var(--chart-1)]",
};

const TOM_BORDA: Record<TomKpi, string> = {
  neutro: "before:bg-border",
  sucesso: "before:bg-success",
  perigo: "before:bg-destructive",
  alerta: "before:bg-warning",
  info: "before:bg-[var(--chart-1)]",
};

const TOM_GLOW: Record<TomKpi, string> = {
  neutro: "shadow-[0_0_20px_-6px_var(--muted-foreground)]",
  sucesso: "shadow-[0_0_20px_-6px_var(--success)]",
  perigo: "shadow-[0_0_20px_-6px_var(--destructive)]",
  alerta: "shadow-[0_0_20px_-6px_var(--warning)]",
  info: "shadow-[0_0_20px_-6px_var(--chart-1)]",
};

export interface DeltaKpi {
  atual: number;
  anterior: number | null;
  /** true quando subir é bom (ex.: recuperadas); false quando subir é ruim (falhas) */
  subirEBom: boolean;
}

function DeltaBadge({ delta }: { delta: DeltaKpi }) {
  if (delta.anterior === null || delta.anterior === 0) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
        <Minus className="size-3" aria-hidden />
        sem base anterior
      </span>
    );
  }
  const variacao = ((delta.atual - delta.anterior) / delta.anterior) * 100;
  const subiu = variacao > 0.5;
  const caiu = variacao < -0.5;
  const bom = (subiu && delta.subirEBom) || (caiu && !delta.subirEBom);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-xs font-medium",
        subiu || caiu
          ? bom
            ? "text-success"
            : "text-destructive"
          : "text-muted-foreground"
      )}
    >
      {subiu ? (
        <ArrowUpRight className="size-3" aria-hidden />
      ) : caiu ? (
        <ArrowDownRight className="size-3" aria-hidden />
      ) : (
        <Minus className="size-3" aria-hidden />
      )}
      {Math.abs(variacao).toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%
      <span className="font-normal text-muted-foreground">vs anterior</span>
    </span>
  );
}

export function KpiCard({
  titulo,
  valor,
  icone: Icone,
  tom = "neutro",
  percentual,
  delta,
  rodape,
  atualizando,
  href,
  ajuda,
  destaque = false,
}: {
  titulo: string;
  valor: string;
  icone: LucideIcon;
  tom?: TomKpi;
  /** participação no total, ex.: "92% do parque" */
  percentual?: string;
  delta?: DeltaKpi;
  rodape?: string;
  atualizando?: boolean;
  /** se informado, o card inteiro vira um link (ex.: para a lista filtrada) */
  href?: string;
  /** texto explicativo exibido no hover */
  ajuda?: string;
  /** cards "hero" da primeira linha — número maior, mais respiro */
  destaque?: boolean;
}) {
  const conteudo = (
    <Card
      className={cn(
        "relative h-full overflow-hidden transition-all duration-300 before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:content-[''] hover:-translate-y-0.5 hover:shadow-lg",
        TOM_BORDA[tom],
        destaque &&
          "bg-gradient-to-b from-white/[0.04] to-transparent dark:from-white/[0.04]",
        atualizando && "opacity-60"
      )}
    >
      <CardContent
        className={cn(
          "flex flex-col gap-2.5",
          destaque ? "p-5" : "p-4"
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="rotulo-mono flex items-center gap-1.5 text-muted-foreground">
            <span
              aria-hidden
              className={cn("size-1.5 shrink-0 rounded-full", TOM_PONTO[tom])}
            />
            {titulo}
          </span>
          <div
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full border border-current/20",
              destaque ? "size-9" : "size-7",
              TOM_ICONE[tom],
              destaque && TOM_GLOW[tom]
            )}
          >
            <Icone className={destaque ? "size-4.5" : "size-3.5"} aria-hidden />
          </div>
        </div>
        <p
          className={cn(
            "font-mono leading-none font-semibold tabular-nums",
            destaque ? "text-6xl" : "text-2xl"
          )}
        >
          {valor}
        </p>
        <div className="flex flex-col gap-0.5">
          {percentual && (
            <span className="text-xs text-muted-foreground">{percentual}</span>
          )}
          {delta && <DeltaBadge delta={delta} />}
          {rodape && (
            <span className="text-xs text-muted-foreground">{rodape}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );

  const envolto = href ? (
    <Link href={href} className="block h-full">
      {conteudo}
    </Link>
  ) : (
    conteudo
  );

  if (!ajuda) return envolto;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{envolto}</TooltipTrigger>
      <TooltipContent>{ajuda}</TooltipContent>
    </Tooltip>
  );
}

export function KpiCardSkeleton({ destaque = false }: { destaque?: boolean }) {
  return (
    <Card>
      <CardContent className={cn("flex flex-col gap-3", destaque ? "p-5" : "p-4")}>
        <div className="flex items-center justify-between">
          <Skeleton className="h-3 w-24" />
          <Skeleton className={destaque ? "size-8 rounded-md" : "size-7 rounded-md"} />
        </div>
        <Skeleton className={destaque ? "h-9 w-24" : "h-7 w-16"} />
        <Skeleton className="h-3 w-28" />
      </CardContent>
    </Card>
  );
}
