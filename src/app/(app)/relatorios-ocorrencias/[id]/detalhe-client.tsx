"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, FileDown, Loader2, Printer, Share2 } from "lucide-react";
import { useRelatorioOcorrencia, useAtualizarRelatorioOcorrencia } from "@/hooks/use-relatorios-ocorrencia";
import { useTimelineRelatorio } from "@/hooks/use-relatorio-timeline";
import { useExportacoesRelatorio } from "@/hooks/use-relatorio-exportacoes";
import { hooksLocais, hooksPredios } from "@/hooks/use-cadastros";
import { crudLocais } from "@/services/cadastros";
import { usePerfis } from "@/hooks/use-usuarios";
import {
  crudDepartamentos,
  crudSolicitantes,
  crudTiposOcorrenciaRelatorio,
  crudTiposSolicitacao,
} from "@/services/cadastros-relatorios-ocorrencia";
import {
  hooksDepartamentos,
  hooksSolicitantes,
  hooksTiposOcorrenciaRelatorio,
  hooksTiposSolicitacao,
} from "@/hooks/use-cadastros-relatorios-ocorrencia";
import {
  exportarRelatorioExcel,
  exportarTimelineExcel,
  gerarBlobRelatorioExcel,
} from "@/services/exportar-relatorios-ocorrencia";
import { compartilharArquivo } from "@/services/compartilhamento";
import { usePerfil } from "@/components/perfil-provider";
import {
  PRIORIDADE_LABEL,
  type Prioridade,
} from "@/types/domain";
import { RELATORIO_STATUS_LABEL, type RelatorioStatus } from "@/types/relatorios-ocorrencia";
import { podeEditarRelatorioOcorrencia } from "@/lib/autorizacao";
import { BadgeStatusRelatorio } from "@/components/relatorios-ocorrencia/badge-status-relatorio";
import { BadgePrioridade } from "@/components/dashboard/badges";
import { SecaoTimeline } from "@/components/relatorios-ocorrencia/secao-timeline";
import { SecaoExportacoes } from "@/components/relatorios-ocorrencia/secao-exportacoes";
import { SecaoResultado } from "@/components/relatorios-ocorrencia/secao-resultado";
import { SecaoAnexos } from "@/components/relatorios-ocorrencia/secao-anexos";
import { SecaoHistorico } from "@/components/relatorios-ocorrencia/secao-historico";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Form } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  CampoComboboxCriavel,
  CampoSelect,
  CampoTexto,
  CampoTextarea,
} from "@/components/cadastros/campos-formulario";

const fmtData = (v: string | null) =>
  v ? new Date(`${v}T00:00:00`).toLocaleDateString("pt-BR") : "—";

const OPCOES_PRIORIDADE = Object.entries(PRIORIDADE_LABEL).map(([valor, rotulo]) => ({
  valor,
  rotulo,
}));
const OPCOES_STATUS = Object.entries(RELATORIO_STATUS_LABEL).map(([valor, rotulo]) => ({
  valor,
  rotulo,
}));

const schemaSolicitacao = z.object({
  numero_memorando: z.string(),
  tipo_solicitacao_id: z.string(),
  solicitante_id: z.string(),
  departamento_id: z.string(),
  data_solicitacao: z.string().min(1),
  prioridade: z.string().min(1),
  operador_id: z.string(),
  data_limite: z.string(),
  status: z.string().min(1),
  classificacao: z.string(),
});
type FormSolicitacao = z.infer<typeof schemaSolicitacao>;

const schemaFato = z.object({
  data_fato: z.string(),
  hora_aproximada: z.string(),
  local_id: z.string(),
  descricao_fato: z.string().min(1, "Descreva o ocorrido"),
  tipo_ocorrencia_id: z.string(),
  pessoas_envolvidas: z.string(),
  observacoes_fato: z.string(),
});
type FormFato = z.infer<typeof schemaFato>;

export function DetalheRelatorioClient({ id }: { id: string }) {
  const router = useRouter();
  const perfil = usePerfil();
  const editavel = podeEditarRelatorioOcorrencia(perfil.papel);
  const { data: relatorio, isPending } = useRelatorioOcorrencia(id);
  const { data: timeline } = useTimelineRelatorio(id);
  const { data: exportacoes } = useExportacoesRelatorio(id);
  const atualizar = useAtualizarRelatorioOcorrencia(id);

  const { data: locais } = hooksLocais.useListar();
  const { data: predios } = hooksPredios.useListar();
  const { data: perfis } = usePerfis();
  const { data: tiposSolicitacao } = hooksTiposSolicitacao.useListar();
  const { data: solicitantes } = hooksSolicitantes.useListar();
  const { data: departamentos } = hooksDepartamentos.useListar();
  const { data: tiposOcorrencia } = hooksTiposOcorrenciaRelatorio.useListar();

  const [modoImpressao, setModoImpressao] = useState<"completo" | "timeline">("completo");

  const formSolicitacao = useForm<FormSolicitacao>({
    resolver: zodResolver(schemaSolicitacao),
    values: relatorio
      ? {
          numero_memorando: relatorio.numero_memorando ?? "",
          tipo_solicitacao_id: relatorio.tipo_solicitacao_id ?? "",
          solicitante_id: relatorio.solicitante_id ?? "",
          departamento_id: relatorio.departamento_id ?? "",
          data_solicitacao: relatorio.data_solicitacao,
          prioridade: relatorio.prioridade,
          operador_id: relatorio.operador_id ?? "",
          data_limite: relatorio.data_limite ?? "",
          status: relatorio.status,
          classificacao: relatorio.classificacao ?? "",
        }
      : undefined,
  });

  const formFato = useForm<FormFato>({
    resolver: zodResolver(schemaFato),
    values: relatorio
      ? {
          data_fato: relatorio.data_fato ?? "",
          hora_aproximada: relatorio.hora_aproximada ?? "",
          local_id: relatorio.local_id ?? "",
          descricao_fato: relatorio.descricao_fato,
          tipo_ocorrencia_id: relatorio.tipo_ocorrencia_id ?? "",
          pessoas_envolvidas: relatorio.pessoas_envolvidas ?? "",
          observacoes_fato: relatorio.observacoes_fato ?? "",
        }
      : undefined,
  });

  if (isPending || !relatorio) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  async function aoCriarLocal(nome: string): Promise<string | undefined> {
    const predioId = predios?.[0]?.id;
    if (!predioId) {
      toast.error("Cadastre um prédio antes de criar um local");
      return undefined;
    }
    const novo = await crudLocais.criar({ nome, predio_id: predioId });
    return novo.id;
  }

  const opcoesLocal = (locais ?? []).map((l) => ({ valor: l.id, rotulo: l.nome }));
  const opcoesOperador = (perfis ?? [])
    .filter((p) => p.status === "aprovado")
    .map((p) => ({ valor: p.id, rotulo: p.nome }));
  const opcoesTipoSolicitacao = (tiposSolicitacao ?? []).map((t) => ({ valor: t.id, rotulo: t.nome }));
  const opcoesSolicitante = (solicitantes ?? []).map((s) => ({ valor: s.id, rotulo: s.nome }));
  const opcoesDepartamento = (departamentos ?? []).map((d) => ({ valor: d.id, rotulo: d.nome }));
  const opcoesTipoOcorrencia = (tiposOcorrencia ?? []).map((t) => ({ valor: t.id, rotulo: t.nome }));

  function onSubmitSolicitacao(v: FormSolicitacao) {
    atualizar.mutate({
      numero_memorando: v.numero_memorando || null,
      tipo_solicitacao_id: v.tipo_solicitacao_id || null,
      solicitante_id: v.solicitante_id || null,
      departamento_id: v.departamento_id || null,
      data_solicitacao: v.data_solicitacao,
      prioridade: v.prioridade as Prioridade,
      operador_id: v.operador_id || null,
      data_limite: v.data_limite || null,
      status: v.status as RelatorioStatus,
      classificacao: v.classificacao || null,
    });
  }

  function onSubmitFato(v: FormFato) {
    atualizar.mutate({
      data_fato: v.data_fato || null,
      hora_aproximada: v.hora_aproximada || null,
      local_id: v.local_id || null,
      descricao_fato: v.descricao_fato,
      tipo_ocorrencia_id: v.tipo_ocorrencia_id || null,
      pessoas_envolvidas: v.pessoas_envolvidas || null,
      observacoes_fato: v.observacoes_fato || null,
    });
  }

  function imprimir(modo: "completo" | "timeline") {
    setModoImpressao(modo);
    requestAnimationFrame(() => window.print());
  }

  async function exportarExcel() {
    await exportarRelatorioExcel(relatorio!, timeline ?? [], exportacoes ?? []);
  }

  async function exportarExcelTimeline() {
    await exportarTimelineExcel(relatorio!, timeline ?? []);
  }

  async function compartilhar() {
    const blob = await gerarBlobRelatorioExcel(relatorio!, timeline ?? [], exportacoes ?? []);
    await compartilharArquivo(
      blob,
      `relatorio-ocorrencia-${relatorio!.numero}.xlsx`,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/relatorios-ocorrencias")}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Relatório #{relatorio.numero}
          </h1>
          <p className="text-sm text-muted-foreground">
            {relatorio.solicitante?.nome ?? "Sem solicitante"} · {fmtData(relatorio.data_solicitacao)}
          </p>
        </div>
        <BadgeStatusRelatorio status={relatorio.status} />
        <BadgePrioridade prioridade={relatorio.prioridade} />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportarExcel}>
            <FileDown className="size-4" />
            Excel
          </Button>
          <Button variant="outline" size="sm" onClick={() => imprimir("completo")}>
            <Printer className="size-4" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={compartilhar}>
            <Share2 className="size-4" />
            Compartilhar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="solicitacao">
        <TabsList className="h-auto w-full flex-wrap justify-start">
          <TabsTrigger value="solicitacao">Dados da Solicitação</TabsTrigger>
          <TabsTrigger value="fato">Dados do Fato</TabsTrigger>
          <TabsTrigger value="analise">Análise</TabsTrigger>
          <TabsTrigger value="exportacoes">Exportações</TabsTrigger>
          <TabsTrigger value="resultado">Resultado</TabsTrigger>
          <TabsTrigger value="anexos">Anexos</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="solicitacao">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Dados da Solicitação</CardTitle>
            </CardHeader>
            <CardContent>
              {editavel ? (
                <Form {...formSolicitacao}>
                  <form
                    onSubmit={formSolicitacao.handleSubmit(onSubmitSolicitacao)}
                    className="grid gap-4 sm:grid-cols-2"
                  >
                    <CampoTexto
                      control={formSolicitacao.control}
                      name="numero_memorando"
                      label="Número do memorando (opcional)"
                    />
                    <CampoComboboxCriavel
                      control={formSolicitacao.control}
                      name="tipo_solicitacao_id"
                      label="Tipo de solicitação (opcional)"
                      placeholder="Selecione ou crie"
                      opcoes={opcoesTipoSolicitacao}
                      aoCriar={async (n) => (await crudTiposSolicitacao.criar({ nome: n })).id}
                    />
                    <CampoComboboxCriavel
                      control={formSolicitacao.control}
                      name="solicitante_id"
                      label="Solicitante (opcional)"
                      placeholder="Selecione ou crie"
                      opcoes={opcoesSolicitante}
                      aoCriar={async (n) => (await crudSolicitantes.criar({ nome: n })).id}
                    />
                    <CampoComboboxCriavel
                      control={formSolicitacao.control}
                      name="departamento_id"
                      label="Departamento (opcional)"
                      placeholder="Selecione ou crie"
                      opcoes={opcoesDepartamento}
                      aoCriar={async (n) => (await crudDepartamentos.criar({ nome: n })).id}
                    />
                    <CampoTexto
                      control={formSolicitacao.control}
                      name="data_solicitacao"
                      label="Data da solicitação"
                      type="date"
                    />
                    <CampoSelect
                      control={formSolicitacao.control}
                      name="prioridade"
                      label="Prioridade"
                      placeholder="Selecione"
                      opcoes={OPCOES_PRIORIDADE}
                    />
                    <CampoSelect
                      control={formSolicitacao.control}
                      name="operador_id"
                      label="Operador responsável (opcional)"
                      placeholder="Selecione"
                      opcoes={opcoesOperador}
                    />
                    <CampoTexto
                      control={formSolicitacao.control}
                      name="data_limite"
                      label="Data limite (opcional)"
                      type="date"
                    />
                    <CampoSelect
                      control={formSolicitacao.control}
                      name="status"
                      label="Status"
                      placeholder="Selecione"
                      opcoes={OPCOES_STATUS}
                    />
                    <CampoTexto
                      control={formSolicitacao.control}
                      name="classificacao"
                      label="Classificação (opcional)"
                    />
                    <div className="sm:col-span-2">
                      <Button type="submit" disabled={atualizar.isPending}>
                        {atualizar.isPending && <Loader2 className="size-4 animate-spin" />}
                        Salvar
                      </Button>
                    </div>
                  </form>
                </Form>
              ) : (
                <dl className="grid gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-muted-foreground">Memorando</dt>
                    <dd>{relatorio.numero_memorando ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Tipo de solicitação</dt>
                    <dd>{relatorio.tipo_solicitacao?.nome ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Solicitante</dt>
                    <dd>{relatorio.solicitante?.nome ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Departamento</dt>
                    <dd>{relatorio.departamento?.nome ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Data limite</dt>
                    <dd>{fmtData(relatorio.data_limite)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Operador responsável</dt>
                    <dd>{relatorio.operador?.nome ?? "—"}</dd>
                  </div>
                </dl>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fato">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Dados do Fato</CardTitle>
            </CardHeader>
            <CardContent>
              {editavel ? (
                <Form {...formFato}>
                  <form
                    onSubmit={formFato.handleSubmit(onSubmitFato)}
                    className="grid gap-4 sm:grid-cols-2"
                  >
                    <CampoTexto control={formFato.control} name="data_fato" label="Data do fato (opcional)" type="date" />
                    <CampoTexto
                      control={formFato.control}
                      name="hora_aproximada"
                      label="Hora aproximada (opcional)"
                      type="time"
                    />
                    <CampoComboboxCriavel
                      control={formFato.control}
                      name="local_id"
                      label="Local (opcional)"
                      placeholder="Selecione ou crie"
                      opcoes={opcoesLocal}
                      aoCriar={aoCriarLocal}
                      rotuloCriar={(t) => `Criar local "${t}"`}
                    />
                    <CampoComboboxCriavel
                      control={formFato.control}
                      name="tipo_ocorrencia_id"
                      label="Tipo da ocorrência (opcional)"
                      placeholder="Selecione ou crie"
                      opcoes={opcoesTipoOcorrencia}
                      aoCriar={async (n) => (await crudTiposOcorrenciaRelatorio.criar({ nome: n })).id}
                    />
                    <div className="sm:col-span-2">
                      <CampoTextarea
                        control={formFato.control}
                        name="descricao_fato"
                        label="Descrição do ocorrido"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <CampoTextarea
                        control={formFato.control}
                        name="pessoas_envolvidas"
                        label="Pessoas envolvidas (opcional)"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <CampoTextarea
                        control={formFato.control}
                        name="observacoes_fato"
                        label="Observações (opcional)"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Button type="submit" disabled={atualizar.isPending}>
                        {atualizar.isPending && <Loader2 className="size-4 animate-spin" />}
                        Salvar
                      </Button>
                    </div>
                  </form>
                </Form>
              ) : (
                <dl className="grid gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-muted-foreground">Data do fato</dt>
                    <dd>{fmtData(relatorio.data_fato)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Local</dt>
                    <dd>{relatorio.local?.nome ?? "—"}</dd>
                  </div>
                  <div className="sm:col-span-2">
                    <dt className="text-xs text-muted-foreground">Descrição</dt>
                    <dd className="whitespace-pre-wrap">{relatorio.descricao_fato}</dd>
                  </div>
                </dl>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analise">
          <SecaoTimeline relatorio={relatorio} editavel={editavel} />
        </TabsContent>

        <TabsContent value="exportacoes">
          <div className="flex flex-col gap-3">
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={exportarExcelTimeline}>
                <FileDown className="size-4" />
                Excel (só a análise)
              </Button>
              <Button variant="outline" size="sm" onClick={() => imprimir("timeline")}>
                <Printer className="size-4" />
                PDF (só a análise)
              </Button>
            </div>
            <SecaoExportacoes relatorioId={id} editavel={editavel} />
          </div>
        </TabsContent>

        <TabsContent value="resultado">
          <SecaoResultado relatorio={relatorio} editavel={editavel} />
        </TabsContent>

        <TabsContent value="anexos">
          <SecaoAnexos relatorioId={id} editavel={editavel} />
        </TabsContent>

        <TabsContent value="historico">
          <SecaoHistorico relatorioId={id} editavel={editavel} />
        </TabsContent>
      </Tabs>

      {/* Área de impressão — só visível no diálogo de impressão do navegador
          (ver #area-impressao em globals.css). Mantida fora das Tabs (que
          desmontam conteúdo inativo) para que o PDF sempre traga tudo. */}
      <div id="area-impressao" className="hidden print:block">
        <h1 className="mb-1 text-xl font-semibold">Relatório de Ocorrência #{relatorio.numero}</h1>
        <p className="mb-4 text-sm text-muted-foreground">
          {RELATORIO_STATUS_LABEL[relatorio.status]} · {PRIORIDADE_LABEL[relatorio.prioridade]}
        </p>

        {modoImpressao === "completo" && (
          <div className="flex flex-col gap-4 text-sm">
            <section>
              <h2 className="font-semibold">Dados da Solicitação</h2>
              <p>Memorando: {relatorio.numero_memorando ?? "—"}</p>
              <p>Solicitante: {relatorio.solicitante?.nome ?? "—"}</p>
              <p>Departamento: {relatorio.departamento?.nome ?? "—"}</p>
              <p>Data da solicitação: {fmtData(relatorio.data_solicitacao)}</p>
              <p>Data limite: {fmtData(relatorio.data_limite)}</p>
              <p>Operador responsável: {relatorio.operador?.nome ?? "—"}</p>
            </section>
            <section>
              <h2 className="font-semibold">Dados do Fato</h2>
              <p>Data do fato: {fmtData(relatorio.data_fato)}</p>
              <p>Local: {relatorio.local?.nome ?? "—"}</p>
              <p className="whitespace-pre-wrap">{relatorio.descricao_fato}</p>
            </section>
            <section>
              <h2 className="font-semibold">Análise</h2>
              {(timeline ?? []).map((e) => (
                <p key={e.id}>
                  {fmtData(e.data)} {e.horario_inicial.slice(0, 5)}
                  {e.horario_final ? `–${e.horario_final.slice(0, 5)}` : ""}
                  {e.camera ? ` · Câmera ${e.camera.numero}` : ""} — {e.descricao}
                </p>
              ))}
            </section>
            <section>
              <h2 className="font-semibold">Resultado</h2>
              <p>Conclusão: {relatorio.conclusao ?? "—"}</p>
              <p>Providências adotadas: {relatorio.providencias_adotadas ?? "—"}</p>
              <p>Resumo executivo: {relatorio.resumo_executivo ?? "—"}</p>
            </section>
          </div>
        )}

        {modoImpressao === "timeline" && (
          <div className="flex flex-col gap-2 text-sm">
            <h2 className="font-semibold">Análise da Ocorrência</h2>
            {(timeline ?? []).map((e) => (
              <p key={e.id}>
                {fmtData(e.data)} {e.horario_inicial.slice(0, 5)}
                {e.horario_final ? `–${e.horario_final.slice(0, 5)}` : ""}
                {e.camera ? ` · Câmera ${e.camera.numero}` : ""} — {e.descricao}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
