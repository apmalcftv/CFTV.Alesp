"use client";

import { useState } from "react";
import { Loader2, MessageSquare } from "lucide-react";
import {
  useAdicionarComentarioHistorico,
  useHistoricoRelatorio,
} from "@/hooks/use-relatorio-historico";
import { RELATORIO_STATUS_LABEL, type RelatorioStatus } from "@/types/relatorios-ocorrencia";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

const fmtDataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const ICONE_TIPO: Record<string, string> = {
  criacao: "🆕",
  mudanca_status: "🔄",
  edicao: "✏️",
  comentario: "💬",
};

const CAMPO_LABEL: Record<string, string> = {
  status: "Status",
  prioridade: "Prioridade",
  operador_id: "Operador responsável",
  departamento_id: "Departamento",
  data_limite: "Data limite",
};

function textoHistorico(e: {
  tipo: string;
  campo: string | null;
  valor_anterior: string | null;
  valor_novo: string | null;
  mensagem: string | null;
}) {
  if (e.tipo === "criacao") return e.mensagem ?? "Relatório criado";
  if (e.tipo === "comentario") return e.mensagem ?? "";
  if (e.campo === "status") {
    const de = e.valor_anterior
      ? (RELATORIO_STATUS_LABEL[e.valor_anterior as RelatorioStatus] ?? e.valor_anterior)
      : "—";
    const para = e.valor_novo
      ? (RELATORIO_STATUS_LABEL[e.valor_novo as RelatorioStatus] ?? e.valor_novo)
      : "—";
    return `Status alterado de "${de}" para "${para}"`;
  }
  const rotulo = e.campo ? (CAMPO_LABEL[e.campo] ?? e.campo) : "Campo";
  return `${rotulo} alterado`;
}

/** Aba 7 — histórico automático, sempre em ordem cronológica reversa,
    nunca editável/excluível (append-only por design de RLS). */
export function SecaoHistorico({ relatorioId }: { relatorioId: string }) {
  const { data: historico, isPending } = useHistoricoRelatorio(relatorioId);
  const comentar = useAdicionarComentarioHistorico(relatorioId);
  const [mensagem, setMensagem] = useState("");

  function enviarComentario() {
    const texto = mensagem.trim();
    if (!texto) return;
    comentar.mutate(texto, { onSuccess: () => setMensagem("") });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Histórico</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex gap-2">
          <Textarea
            value={mensagem}
            onChange={(e) => setMensagem(e.target.value)}
            placeholder="Adicionar comentário..."
            className="min-h-9"
          />
          <Button onClick={enviarComentario} disabled={comentar.isPending || !mensagem.trim()}>
            {comentar.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <MessageSquare className="size-4" />
            )}
          </Button>
        </div>

        {isPending ? (
          <Skeleton className="h-24 w-full" />
        ) : !historico || historico.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem eventos registrados</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {historico.map((e) => (
              <li key={e.id} className="flex gap-3 text-sm">
                <span className="shrink-0">{ICONE_TIPO[e.tipo] ?? "•"}</span>
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-wrap">{textoHistorico(e)}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.autor?.nome ?? "Sistema"} · {fmtDataHora.format(new Date(e.criado_em))}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
