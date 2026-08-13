"use client";

import { useState } from "react";
import { Loader2, MessageSquare } from "lucide-react";
import {
  useAdicionarComentarioHistorico,
  useHistoricoRelatorio,
} from "@/hooks/use-relatorio-historico";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";

const fmtDataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const ICONE_TIPO: Record<string, string> = {
  criacao: "🆕",
  adicao: "➕",
  edicao: "✏️",
  exclusao: "🗑️",
  comentario: "💬",
  edicao_analise: "✏️",
  adicao_linha_analise: "➕",
  exclusao_linha_analise: "🗑️",
  // legado: eventos gravados antes da trilha de auditoria
  mudanca_status: "✏️",
};

/** Ação exibida por tipo de evento. Os tipos `*_analise` vêm do grid da
    aba Análise; `mudanca_status` é legado e hoje entra como edição. */
const ACAO_LABEL: Record<string, string> = {
  criacao: "Criou o relatório",
  adicao: "Adicionou",
  edicao: "Editou",
  exclusao: "Excluiu",
  mudanca_status: "Editou",
  edicao_analise: "Editou Análise",
  adicao_linha_analise: "Adicionou linha na Análise",
  exclusao_linha_analise: "Excluiu linha da Análise",
};

/** Rótulos dos campos do relatório (colunas do banco) e das colunas do
    grid da aba Análise. Campo desconhecido cai no próprio nome. */
const CAMPO_LABEL: Record<string, string> = {
  numero_memorando: "Número do memorando",
  tipo_solicitacao_id: "Tipo de solicitação",
  solicitante_id: "Solicitante",
  departamento_id: "Departamento",
  data_solicitacao: "Data da solicitação",
  data_limite: "Data limite",
  status: "Status",
  prioridade: "Prioridade",
  operador_id: "Operador responsável",
  classificacao: "Classificação",
  data_fato: "Data do fato",
  hora_aproximada: "Hora aproximada",
  local_id: "Local",
  tipo_ocorrencia_id: "Tipo da ocorrência",
  descricao_fato: "Descrição do ocorrido",
  pessoas_envolvidas: "Pessoas envolvidas",
  observacoes_fato: "Observações",
  conclusao: "Conclusão",
  providencias_adotadas: "Providências adotadas",
  resumo_executivo: "Resumo executivo",
  encaminhamento: "Encaminhamento",
  data_conclusao: "Data da conclusão",
  concluido_por: "Responsável pela conclusão",
  anexo: "Anexo",
  // colunas do grid da aba Análise
  data: "Data",
  horarioInicial: "Horário inicial",
  horarioFinal: "Horário final",
  cameraTexto: "Câmera",
  localTexto: "Local",
  descricao: "Descrição do Evento",
  operadorTexto: "Operador",
  marcadorTexto: "Marcador",
  comentarioInterno: "Comentário interno",
};

/** Aba 7 — histórico automático, sempre em ordem cronológica reversa,
    nunca editável/excluível (append-only por design de RLS). */
export function SecaoHistorico({
  relatorioId,
  editavel,
}: {
  relatorioId: string;
  editavel: boolean;
}) {
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
        {editavel && (
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
        )}

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
                  <p className="font-medium">
                    {e.autor?.nome ?? "Sistema"} — {fmtDataHora.format(new Date(e.criado_em))}
                  </p>
                  {e.tipo === "comentario" ? (
                    <p className="whitespace-pre-wrap">{e.mensagem ?? ""}</p>
                  ) : (
                    <>
                      <p>{ACAO_LABEL[e.tipo] ?? e.tipo}</p>
                      {/* Só o nome do campo: a trilha nunca mostra valor
                          anterior nem novo, inclusive nos registros
                          antigos que ainda os têm gravados. */}
                      {e.campo && (
                        <p className="text-muted-foreground">
                          Campo: {CAMPO_LABEL[e.campo] ?? e.campo}
                        </p>
                      )}
                    </>
                  )}
                </div>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
