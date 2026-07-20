"use client";

import {
  AlertTriangle,
  Cctv,
  Clock,
  MapPin,
  ShieldAlert,
  ShieldQuestion,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Alertas } from "@/services/indicadores";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const fmtDataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

function Secao({
  icone: Icone,
  titulo,
  quantidade,
  tom,
  children,
}: {
  icone: LucideIcon;
  titulo: string;
  quantidade: number;
  tom: "perigo" | "alerta" | "info";
  children: React.ReactNode;
}) {
  const cor =
    tom === "perigo"
      ? "text-destructive"
      : tom === "alerta"
        ? "text-warning"
        : "text-[var(--chart-1)]";
  return (
    <div>
      <div className="flex items-center gap-2">
        <Icone className={cn("size-4", cor)} aria-hidden />
        <span className="text-xs font-medium">{titulo}</span>
        <span
          className={cn(
            "ml-auto rounded-full px-2 py-0.5 text-xs font-semibold tabular-nums",
            quantidade > 0 ? cn(cor, "bg-current/10") : "text-muted-foreground bg-muted"
          )}
        >
          {quantidade}
        </span>
      </div>
      <div className="mt-2 space-y-1.5">{children}</div>
    </div>
  );
}

function Vazio({ texto }: { texto: string }) {
  return <p className="text-xs text-muted-foreground">{texto}</p>;
}

export function PainelAlertas({
  alertas,
  atualizando,
}: {
  alertas: Alertas;
  atualizando?: boolean;
}) {
  return (
    <Card
      className={cn(
        "transition-opacity duration-300",
        atualizando && "opacity-50"
      )}
    >
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <ShieldAlert className="size-4 text-warning" aria-hidden />
          Alertas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Secao
          icone={AlertTriangle}
          titulo="OS com SLA vencido"
          quantidade={alertas.osVencidas.length}
          tom="perigo"
        >
          {alertas.osVencidas.length === 0 ? (
            <Vazio texto="Nenhuma OS vencida" />
          ) : (
            alertas.osVencidas.slice(0, 5).map((o) => (
              <div key={o.id} className="flex items-baseline gap-2 text-xs">
                <span className="font-medium">
                  OS {o.numero} · {o.camera ? `Câmera ${o.camera.numero}` : "Sistema"}
                </span>
                <span className="ml-auto whitespace-nowrap text-destructive">
                  venceu {fmtDataHora.format(new Date(o.sla_vence_em!))}
                </span>
              </div>
            ))
          )}
        </Secao>

        <Separator />

        <Secao
          icone={Clock}
          titulo="SLA vence em 48h"
          quantidade={alertas.slaProximo.length}
          tom="alerta"
        >
          {alertas.slaProximo.length === 0 ? (
            <Vazio texto="Nada próximo do vencimento" />
          ) : (
            alertas.slaProximo.slice(0, 5).map((o) => (
              <div key={o.id} className="flex items-baseline gap-2 text-xs">
                <span className="font-medium">
                  OS {o.numero} · {o.camera ? `Câmera ${o.camera.numero}` : "Sistema"}
                </span>
                <span className="ml-auto whitespace-nowrap text-warning">
                  {fmtDataHora.format(new Date(o.sla_vence_em!))}
                </span>
              </div>
            ))
          )}
        </Secao>

        <Separator />

        <Secao
          icone={ShieldQuestion}
          titulo="OS aguardando aceite"
          quantidade={alertas.aguardandoAceite.length}
          tom="alerta"
        >
          {alertas.aguardandoAceite.length === 0 ? (
            <Vazio texto="Nenhuma OS aguardando aceite" />
          ) : (
            alertas.aguardandoAceite.slice(0, 5).map((o) => (
              <div key={o.id} className="flex items-baseline gap-2 text-xs">
                <span className="font-medium">
                  OS {o.numero} · {o.camera ? `Câmera ${o.camera.numero}` : "Sistema"}
                </span>
                <span className="ml-auto whitespace-nowrap text-muted-foreground">
                  {o.empresa?.nome ?? "—"}
                </span>
              </div>
            ))
          )}
        </Secao>

        <Separator />

        <Secao
          icone={Cctv}
          titulo="Câmeras críticas (3+ falhas em 12m)"
          quantidade={alertas.camerasCriticas.length}
          tom="perigo"
        >
          {alertas.camerasCriticas.length === 0 ? (
            <Vazio texto="Nenhuma câmera reincidente" />
          ) : (
            alertas.camerasCriticas.map((c) => (
              <div key={c.nome} className="flex items-baseline gap-2 text-xs">
                <span className="font-medium">{c.nome}</span>
                <span className="ml-auto tabular-nums text-muted-foreground">
                  {c.valor} ocorrências
                </span>
              </div>
            ))
          )}
        </Secao>

        <Separator />

        <Secao
          icone={MapPin}
          titulo="Locais com mais defeitos (12m)"
          quantidade={alertas.locaisCriticos.length}
          tom="info"
        >
          {alertas.locaisCriticos.length === 0 ? (
            <Vazio texto="Sem dados de locais" />
          ) : (
            alertas.locaisCriticos.map((l) => (
              <div key={l.nome} className="flex items-baseline gap-2 text-xs">
                <span className="truncate font-medium" title={l.nome}>
                  {l.nome}
                </span>
                <span className="ml-auto tabular-nums text-muted-foreground">
                  {l.valor}
                </span>
              </div>
            ))
          )}
        </Secao>
      </CardContent>
    </Card>
  );
}
