"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, FileDown, Loader2, Printer, Share2, Trash2 } from "lucide-react";
import {
  useRelatorioOcorrencia,
  useAtualizarRelatorioOcorrencia,
  useExcluirRelatorioOcorrencia,
} from "@/hooks/use-relatorios-ocorrencia";
import { useTimelineRelatorio } from "@/hooks/use-relatorio-timeline";
import { useExportacoesRelatorio } from "@/hooks/use-relatorio-exportacoes";
import { hooksPredios } from "@/hooks/use-cadastros";
import {
  idDoDepartamento,
  idDoLocal,
  idDoSolicitante,
  idDoTipoOcorrencia,
  idDoTipoSolicitacao,
} from "@/services/catalogo-por-nome";
import {
  exportarRelatorioExcel,
  exportarTimelineExcel,
  gerarBlobRelatorioExcel,
  localDoEvento,
} from "@/services/exportar-relatorios-ocorrencia";
import { compartilharArquivo } from "@/services/compartilhamento";
import { PRIORIDADE_LABEL } from "@/types/domain";
import { RELATORIO_STATUS_LABEL, type RelatorioStatus } from "@/types/relatorios-ocorrencia";
import { useMinhasPermissoes } from "@/hooks/use-permissoes";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CampoSelect,
  CampoTexto,
  CampoTextarea,
} from "@/components/cadastros/campos-formulario";

const fmtData = (v: string | null) =>
  v ? new Date(`${v}T00:00:00`).toLocaleDateString("pt-BR") : "—";

/** Mesmas duas opções fechadas da tela de criação — o operador não cria
    outros tipos de solicitação. */
const TIPOS_SOLICITACAO = ["Análise de Imagens", "Preservação de Imagens"] as const;

const OPCOES_STATUS = Object.entries(RELATORIO_STATUS_LABEL).map(([valor, rotulo]) => ({
  valor,
  rotulo,
}));

// Espelha a tela de criação: tudo texto livre, só o tipo de solicitação
// trava o envio. Data e hora seguem com os componentes nativos, e Status
// continua como seleção por ser enum do banco. O operador responsável
// saiu daqui: agora é pedido no momento de salvar a análise, que é quando
// se sabe de fato quem conduziu o trabalho.
const schemaSolicitacao = z.object({
  numero_memorando: z.string(),
  tipo_solicitacao: z
    .string()
    .refine((v) => (TIPOS_SOLICITACAO as readonly string[]).includes(v), {
      message: "Selecione o tipo de solicitação",
    }),
  solicitante: z.string(),
  departamento: z.string(),
  data_solicitacao: z.string(),
  data_limite: z.string(),
  status: z.string().min(1),
});
type FormSolicitacao = z.infer<typeof schemaSolicitacao>;

const schemaFato = z.object({
  data_fato: z.string(),
  hora_aproximada: z.string(),
  local: z.string(),
  descricao_fato: z.string(),
  tipo_ocorrencia: z.string(),
  pessoas_envolvidas: z.string(),
});
type FormFato = z.infer<typeof schemaFato>;

export function DetalheRelatorioClient({ id }: { id: string }) {
  const router = useRouter();
  // Espelho da matriz configurável: quem decide de verdade é a RLS.
  const { pode } = useMinhasPermissoes();
  const editavel = pode("cmal_relatorios", "editar");
  const podeExcluir = pode("cmal_relatorios", "excluir");
  const { data: relatorio, isPending } = useRelatorioOcorrencia(id);
  const { data: timeline } = useTimelineRelatorio(id);
  const { data: exportacoes } = useExportacoesRelatorio(id);
  const atualizar = useAtualizarRelatorioOcorrencia(id);
  const excluir = useExcluirRelatorioOcorrencia();

  const { data: predios } = hooksPredios.useListar();

  const [modoImpressao, setModoImpressao] = useState<"completo" | "timeline">("completo");
  const [salvando, setSalvando] = useState(false);
  const [confirmarExclusao, setConfirmarExclusao] = useState(false);

  const formSolicitacao = useForm<FormSolicitacao>({
    resolver: zodResolver(schemaSolicitacao),
    // os campos de catálogo carregam o NOME (via join), não o id — é o
    // texto que o operador edita; a conversão de volta para id acontece
    // no envio
    values: relatorio
      ? {
          numero_memorando: relatorio.numero_memorando ?? "",
          tipo_solicitacao: relatorio.tipo_solicitacao?.nome ?? "",
          solicitante: relatorio.solicitante?.nome ?? "",
          departamento: relatorio.departamento?.nome ?? "",
          data_solicitacao: relatorio.data_solicitacao,
          data_limite: relatorio.data_limite ?? "",
          status: relatorio.status,
        }
      : undefined,
  });

  const formFato = useForm<FormFato>({
    resolver: zodResolver(schemaFato),
    values: relatorio
      ? {
          data_fato: relatorio.data_fato ?? "",
          hora_aproximada: relatorio.hora_aproximada ?? "",
          local: relatorio.local?.nome ?? "",
          descricao_fato: relatorio.descricao_fato,
          tipo_ocorrencia: relatorio.tipo_ocorrencia?.nome ?? "",
          pessoas_envolvidas: relatorio.pessoas_envolvidas ?? "",
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

  /** As duas opções fixas. Relatórios antigos (importados, por exemplo)
      podem apontar para um tipo fora dessa lista — nesse caso ele entra
      como opção só para não sumir da tela; continua impossível criar
      um tipo novo. */
  const tipoAtual = relatorio.tipo_solicitacao?.nome;
  const opcoesTipoSolicitacao = [
    ...(tipoAtual && !(TIPOS_SOLICITACAO as readonly string[]).includes(tipoAtual)
      ? [tipoAtual]
      : []),
    ...TIPOS_SOLICITACAO,
  ].map((t) => ({ valor: t, rotulo: t }));

  async function onSubmitSolicitacao(v: FormSolicitacao) {
    setSalvando(true);
    try {
      const [tipoSolicitacaoId, solicitanteId, departamentoId] = await Promise.all([
        idDoTipoSolicitacao(v.tipo_solicitacao),
        idDoSolicitante(v.solicitante),
        idDoDepartamento(v.departamento),
      ]);
      await atualizar.mutateAsync({
        numero_memorando: v.numero_memorando.trim() || null,
        tipo_solicitacao_id: tipoSolicitacaoId,
        solicitante_id: solicitanteId,
        departamento_id: departamentoId,
        // coluna NOT NULL: cai no valor atual em vez de bloquear o envio
        data_solicitacao: v.data_solicitacao || relatorio!.data_solicitacao,
        data_limite: v.data_limite || null,
        status: v.status as RelatorioStatus,
      });
    } catch (e) {
      if (!atualizar.isError) {
        toast.error("Não foi possível salvar", { description: (e as Error).message });
      }
    } finally {
      setSalvando(false);
    }
  }

  async function onSubmitFato(v: FormFato) {
    setSalvando(true);
    try {
      const [localId, tipoOcorrenciaId] = await Promise.all([
        idDoLocal(v.local, predios?.[0]?.id),
        idDoTipoOcorrencia(v.tipo_ocorrencia),
      ]);
      await atualizar.mutateAsync({
        data_fato: v.data_fato || null,
        hora_aproximada: v.hora_aproximada || null,
        local_id: localId,
        descricao_fato: v.descricao_fato,
        tipo_ocorrencia_id: tipoOcorrenciaId,
        pessoas_envolvidas: v.pessoas_envolvidas.trim() || null,
      });
    } catch (e) {
      if (!atualizar.isError) {
        toast.error("Não foi possível salvar", { description: (e as Error).message });
      }
    } finally {
      setSalvando(false);
    }
  }

  async function confirmarExcluir() {
    try {
      await excluir.mutateAsync(id);
      setConfirmarExclusao(false);
      router.push("/relatorios-ocorrencias");
    } catch {
      // o toast de erro já vem do hook; o diálogo fica aberto para retentar
    }
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
          {podeExcluir && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setConfirmarExclusao(true)}
              disabled={excluir.isPending}
            >
              <Trash2 className="size-4" />
              Excluir
            </Button>
          )}
        </div>
      </div>

      <AlertDialog open={confirmarExclusao} onOpenChange={setConfirmarExclusao}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir relatório?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação excluirá permanentemente o relatório #{relatorio.numero} e seus
              dados relacionados — análise, anexos, exportações e histórico. Essa
              operação não poderá ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={excluir.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                // sem isto o AlertDialog fecha sozinho antes da mutação
                // terminar, e o estado de "excluindo" nunca aparece
                e.preventDefault();
                confirmarExcluir();
              }}
              disabled={excluir.isPending}
              className="bg-destructive text-white hover:bg-destructive/90"
            >
              {excluir.isPending && <Loader2 className="size-4 animate-spin" />}
              Excluir permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
                      label="Número do memorando"
                    />
                    <CampoSelect
                      control={formSolicitacao.control}
                      name="tipo_solicitacao"
                      label="Tipo de solicitação"
                      placeholder="Selecione"
                      opcoes={opcoesTipoSolicitacao}
                    />
                    <CampoTexto
                      control={formSolicitacao.control}
                      name="solicitante"
                      label="Solicitante"
                    />
                    <CampoTexto
                      control={formSolicitacao.control}
                      name="departamento"
                      label="Departamento"
                    />
                    <CampoTexto
                      control={formSolicitacao.control}
                      name="data_solicitacao"
                      label="Data da solicitação"
                      type="date"
                    />
                    <CampoTexto
                      control={formSolicitacao.control}
                      name="data_limite"
                      label="Data limite"
                      type="date"
                    />
                    <CampoSelect
                      control={formSolicitacao.control}
                      name="status"
                      label="Status"
                      placeholder="Selecione"
                      opcoes={OPCOES_STATUS}
                    />
                    <div className="sm:col-span-2">
                      <Button type="submit" disabled={salvando}>
                        {salvando && <Loader2 className="size-4 animate-spin" />}
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
                    <CampoTexto control={formFato.control} name="data_fato" label="Data do fato" type="date" />
                    <CampoTexto
                      control={formFato.control}
                      name="hora_aproximada"
                      label="Hora aproximada"
                      type="time"
                    />
                    <CampoTexto control={formFato.control} name="local" label="Local" />
                    <CampoTexto
                      control={formFato.control}
                      name="tipo_ocorrencia"
                      label="Tipo da ocorrência"
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
                        label="Pessoas envolvidas"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <Button type="submit" disabled={salvando}>
                        {salvando && <Loader2 className="size-4 animate-spin" />}
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
            <SecaoExportacoes relatorioId={id} editavel={editavel} podeExcluir={podeExcluir} />
          </div>
        </TabsContent>

        <TabsContent value="resultado">
          <SecaoResultado relatorio={relatorio} editavel={editavel} />
        </TabsContent>

        <TabsContent value="anexos">
          <SecaoAnexos relatorioId={id} editavel={editavel} podeExcluir={podeExcluir} />
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
                  {e.camera ? ` · Câmera ${e.camera.numero}` : ""}
                  {localDoEvento(e) ? ` · ${localDoEvento(e)}` : ""} — {e.descricao}
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
                {e.camera ? ` · Câmera ${e.camera.numero}` : ""}
                {localDoEvento(e) ? ` · ${localDoEvento(e)}` : ""} — {e.descricao}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
