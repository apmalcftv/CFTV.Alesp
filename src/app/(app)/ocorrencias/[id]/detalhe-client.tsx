"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  File as FileIcon,
  Image as ImageIcon,
  Loader2,
  MessageSquare,
  Paperclip,
  PlayCircle,
  RotateCcw,
  Trash2,
  Video,
} from "lucide-react";
import {
  useAdicionarComentario,
  useAnexos,
  useAtualizarOcorrencia,
  useEnviarAnexo,
  useEventos,
  useOcorrencia,
  useRemoverAnexo,
} from "@/hooks/use-ocorrencias";
import { useCamerasDashboard } from "@/hooks/use-dashboard";
import { hooksEmpresas, hooksTecnicos } from "@/hooks/use-cadastros";
import { crudTecnicos } from "@/services/cadastros";
import { crudCameras } from "@/services/cameras";
import { useTenant } from "@/components/tenant-branding";
import { usePerfil } from "@/components/perfil-provider";
import { urlAssinadaAnexo } from "@/services/ocorrencias";
import {
  CAMERA_STATUS_LABEL,
  OCORRENCIA_STATUS_LABEL,
  PRIORIDADE_LABEL,
  SLA_OPCOES,
  podeAtualizarOcorrencia,
  podeEditar,
  type Anexo,
  type CameraStatus,
  type OcorrenciaStatus,
  type Prioridade,
} from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Form } from "@/components/ui/form";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CampoComboboxCriavel,
  CampoSelect,
  CampoTexto,
} from "@/components/cadastros/campos-formulario";
import { BadgePrioridade, BadgeStatusOcorrencia } from "@/components/dashboard/badges";

const fmtDataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

const OPCOES_STATUS = Object.entries(OCORRENCIA_STATUS_LABEL).map(
  ([valor, rotulo]) => ({ valor, rotulo })
);
const OPCOES_PRIORIDADE = Object.entries(PRIORIDADE_LABEL).map(
  ([valor, rotulo]) => ({ valor, rotulo })
);
/** Radix Select não aceita value="" em SelectItem — "sem_sla" representa
    "Sem SLA" (sla_horas = null) no payload de atualização. */
const OPCOES_SLA = SLA_OPCOES.map((o) => ({
  valor: o.horas === null ? "sem_sla" : String(o.horas),
  rotulo: o.rotulo,
}));

function slaHorasDoForm(valor: string): number | null {
  return valor === "sem_sla" ? null : Number(valor);
}

const schemaEdicao = z.object({
  status: z.string().min(1),
  prioridade: z.string().min(1),
  empresa_id: z.string(),
  tecnico_id: z.string(),
  os_externa: z.string(),
  impedimento: z.string(),
  sla_horas: z.string(),
});
type FormEdicao = z.infer<typeof schemaEdicao>;

const ICONE_EVENTO: Record<string, string> = {
  abertura: "🆕",
  mudanca_status: "🔄",
  comentario: "💬",
  atribuicao: "👤",
  edicao: "✏️",
};

function textoEvento(e: {
  tipo: string;
  status_anterior: string | null;
  status_novo: string | null;
  campo: string | null;
  valor_anterior: string | null;
  valor_novo: string | null;
  mensagem: string | null;
}) {
  if (e.tipo === "abertura") return "Ocorrência aberta";
  if (e.tipo === "mudanca_status") {
    const de = e.status_anterior
      ? OCORRENCIA_STATUS_LABEL[e.status_anterior as keyof typeof OCORRENCIA_STATUS_LABEL]
      : "—";
    const para = e.status_novo
      ? OCORRENCIA_STATUS_LABEL[e.status_novo as keyof typeof OCORRENCIA_STATUS_LABEL]
      : "—";
    return `Status alterado de "${de}" para "${para}"`;
  }
  if (e.tipo === "comentario") return e.mensagem ?? "";
  if (e.tipo === "edicao") return `Campo "${e.campo}" alterado`;
  return e.mensagem ?? e.tipo;
}

function IconeAnexo({ tipo }: { tipo: Anexo["tipo"] }) {
  if (tipo === "foto") return <ImageIcon className="size-4" />;
  if (tipo === "video") return <Video className="size-4" />;
  return <FileIcon className="size-4" />;
}

function SecaoAnexos({
  ocorrenciaId,
  editavel,
}: {
  ocorrenciaId: string;
  editavel: boolean;
}) {
  const tenant = useTenant();
  const { data: anexos, isPending } = useAnexos(ocorrenciaId);
  const enviar = useEnviarAnexo(ocorrenciaId);
  const remover = useRemoverAnexo(ocorrenciaId);
  const inputRef = useRef<HTMLInputElement>(null);

  async function abrirAnexo(anexo: Anexo) {
    const url = await urlAssinadaAnexo(anexo.storage_path);
    window.open(url, "_blank");
  }

  function selecionarArquivo(e: React.ChangeEvent<HTMLInputElement>) {
    const arquivo = e.target.files?.[0];
    if (!arquivo || !tenant) return;
    enviar.mutate({ tenantId: tenant.id, arquivo });
    e.target.value = "";
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm">Anexos</CardTitle>
        {editavel && (
          <>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              onChange={selecionarArquivo}
              accept="image/*,video/*,application/pdf"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => inputRef.current?.click()}
              disabled={enviar.isPending}
            >
              {enviar.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Paperclip className="size-4" />
              )}
              Anexar
            </Button>
          </>
        )}
      </CardHeader>
      <CardContent>
        {isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : !anexos || anexos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum anexo</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {anexos.map((a) => (
              <li
                key={a.id}
                className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
              >
                <IconeAnexo tipo={a.tipo} />
                <button
                  type="button"
                  onClick={() => abrirAnexo(a)}
                  className="flex-1 truncate text-left hover:underline"
                >
                  {a.storage_path.split("/").pop()}
                </button>
                {editavel && (
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-muted-foreground"
                    onClick={() => remover.mutate(a)}
                    aria-label="Remover anexo"
                  >
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function SecaoTimeline({
  ocorrenciaId,
  editavel,
}: {
  ocorrenciaId: string;
  editavel: boolean;
}) {
  const { data: eventos, isPending } = useEventos(ocorrenciaId);
  const comentar = useAdicionarComentario(ocorrenciaId);
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
            <Button
              onClick={enviarComentario}
              disabled={comentar.isPending || !mensagem.trim()}
            >
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
        ) : !eventos || eventos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem eventos registrados</p>
        ) : (
          <ol className="flex flex-col gap-3">
            {[...eventos].reverse().map((e) => (
              <li key={e.id} className="flex gap-3 text-sm">
                <span className="shrink-0">{ICONE_EVENTO[e.tipo] ?? "•"}</span>
                <div className="min-w-0 flex-1">
                  <p className="whitespace-pre-wrap">{textoEvento(e)}</p>
                  <p className="text-xs text-muted-foreground">
                    {e.autor?.nome ?? "Equipe"} · {fmtDataHora.format(new Date(e.criado_em))}
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

export function DetalheOcorrenciaClient({ id }: { id: string }) {
  const router = useRouter();
  const perfil = usePerfil();
  const queryClient = useQueryClient();
  const { data: ocorrencia, isPending } = useOcorrencia(id);
  const { data: empresas } = hooksEmpresas.useListar();
  const { data: tecnicos } = hooksTecnicos.useListar();
  const { data: camerasDash } = useCamerasDashboard();
  const atualizar = useAtualizarOcorrencia(id);
  const comentar = useAdicionarComentario(id);
  const [cancelarAberto, setCancelarAberto] = useState(false);
  const [motivoCancelamento, setMotivoCancelamento] = useState("");
  const [cancelarManutencaoAberto, setCancelarManutencaoAberto] = useState(false);
  const [motivoCancelamentoManutencao, setMotivoCancelamentoManutencao] = useState("");
  const [aceitarAberto, setAceitarAberto] = useState(false);
  const [statusCameraModal, setStatusCameraModal] = useState<CameraStatus>("operante");
  const [salvandoCamera, setSalvandoCamera] = useState(false);

  const form = useForm<FormEdicao>({
    resolver: zodResolver(schemaEdicao),
    values: ocorrencia
      ? {
          status: ocorrencia.status,
          prioridade: ocorrencia.prioridade,
          empresa_id: ocorrencia.empresa_id ?? "",
          tecnico_id: ocorrencia.tecnico_id ?? "",
          os_externa: ocorrencia.os_externa ?? "",
          impedimento: ocorrencia.impedimento ?? "",
          sla_horas:
            ocorrencia.sla_horas === null ? "sem_sla" : String(ocorrencia.sla_horas),
        }
      : undefined,
  });
  const empresaSelecionada = form.watch("empresa_id");

  if (isPending || !ocorrencia) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const editavel = podeAtualizarOcorrencia(perfil, ocorrencia.empresa_id);

  const opcoesEmpresa = (empresas ?? []).map((e) => ({ valor: e.id, rotulo: e.nome }));
  const opcoesTecnico = (tecnicos ?? [])
    .filter((t) => !empresaSelecionada || t.empresa_id === empresaSelecionada)
    .map((t) => ({ valor: t.id, rotulo: t.nome }));

  async function aoCriarTecnico(nome: string): Promise<string | undefined> {
    if (!empresaSelecionada) {
      toast.error("Selecione a empresa antes de cadastrar o técnico");
      return undefined;
    }
    try {
      const novo = await crudTecnicos.criar({ nome, empresa_id: empresaSelecionada });
      queryClient.invalidateQueries({ queryKey: ["tecnicos"] });
      toast.success(`Técnico "${nome}" cadastrado`);
      return novo.id;
    } catch (e) {
      toast.error("Não foi possível cadastrar o técnico", {
        description: (e as Error).message,
      });
      return undefined;
    }
  }

  const ehEmpresaContratada = perfil.papel === "empresa_contratada";

  const podeCancelar =
    editavel &&
    !ehEmpresaContratada &&
    ocorrencia.status !== "concluida" &&
    ocorrencia.status !== "cancelada";
  const podeCancelarManutencao =
    ehEmpresaContratada &&
    editavel &&
    (ocorrencia.status === "em_andamento" || ocorrencia.status === "aguardando_aceite");

  const podeAssumir = ehEmpresaContratada && ocorrencia.status === "aberta";
  const podeAceitarOuReprovar = podeEditar(perfil.papel) && ocorrencia.status === "aguardando_aceite";
  const opcoesStatusForm = ehEmpresaContratada
    ? OPCOES_STATUS.filter((o) => o.valor === "em_andamento" || o.valor === "aguardando_aceite")
    : OPCOES_STATUS;

  const cameraId = ocorrencia.camera_id;
  const cameraAtual = cameraId
    ? camerasDash?.find((c) => c.id === cameraId)
    : undefined;

  function assumirAtendimento() {
    atualizar.mutate({ status: "em_andamento" });
  }

  /** O status da câmera nunca muda sozinho ao concluir a OS — o Operador
      CFTC decide explicitamente o novo status neste modal antes de confirmar. */
  function abrirAceitar() {
    if (!cameraId) {
      atualizar.mutate({ status: "concluida" });
      return;
    }
    setStatusCameraModal(cameraAtual?.status ?? "operante");
    setAceitarAberto(true);
  }

  async function confirmarAceitar() {
    if (!cameraId) return;
    const statusAnterior = cameraAtual?.status;
    setSalvandoCamera(true);
    try {
      await crudCameras.atualizar(cameraId, { status: statusCameraModal });
      queryClient.invalidateQueries({ queryKey: ["cameras"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard", "cameras"] });
      queryClient.invalidateQueries({
        queryKey: ["cameras", cameraId, "eventos"],
      });
    } catch (e) {
      toast.error("Não foi possível atualizar o status da câmera", {
        description: (e as Error).message,
      });
      setSalvandoCamera(false);
      return;
    }
    atualizar.mutate(
      { status: "concluida" },
      {
        onSuccess: () => {
          if (statusAnterior && statusAnterior !== statusCameraModal) {
            comentar.mutate(
              `Câmera atualizada de "${CAMERA_STATUS_LABEL[statusAnterior]}" para "${CAMERA_STATUS_LABEL[statusCameraModal]}"`
            );
          }
          setSalvandoCamera(false);
          setAceitarAberto(false);
        },
      }
    );
  }

  function reprovarOs() {
    atualizar.mutate(
      { status: "em_andamento" },
      {
        onSuccess: () =>
          comentar.mutate("Retornada para manutenção pelo Operador do CFTC"),
      }
    );
  }

  function confirmarCancelamento() {
    const motivo = motivoCancelamento.trim();
    if (!motivo) return;
    atualizar.mutate(
      { status: "cancelada" },
      {
        onSuccess: () => {
          comentar.mutate(`Ocorrência cancelada: ${motivo}`);
          setCancelarAberto(false);
          setMotivoCancelamento("");
        },
      }
    );
  }

  /** Empresa contratada desiste/não consegue atender — devolve a OS para
      "aberta" (sem excluir nem cancelar a ocorrência) para o CFTC decidir. */
  function confirmarCancelamentoManutencao() {
    const motivo = motivoCancelamentoManutencao.trim();
    if (!motivo) return;
    atualizar.mutate(
      { status: "aberta" },
      {
        onSuccess: () => {
          comentar.mutate(`Manutenção cancelada pela empresa contratada: ${motivo}`);
          setCancelarManutencaoAberto(false);
          setMotivoCancelamentoManutencao("");
        },
      }
    );
  }

  const slaVencido =
    ocorrencia.sla_vence_em &&
    !ocorrencia.encerrada_em &&
    new Date(ocorrencia.sla_vence_em) < new Date();

  function onSubmit(v: FormEdicao) {
    atualizar.mutate({
      status: v.status as OcorrenciaStatus,
      prioridade: v.prioridade as Prioridade,
      empresa_id: v.empresa_id || null,
      tecnico_id: v.tecnico_id || null,
      os_externa: v.os_externa || null,
      impedimento: v.impedimento || null,
      sla_horas: slaHorasDoForm(v.sla_horas),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.push("/ocorrencias")}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            OS #{ocorrencia.numero}
          </h1>
          <p className="text-sm text-muted-foreground">
            {ocorrencia.camera
              ? `Câmera ${ocorrencia.camera.numero} — ${ocorrencia.camera.local?.nome ?? "—"}`
              : "Ocorrência de sistema (sem câmera)"}
          </p>
        </div>
        <BadgeStatusOcorrencia status={ocorrencia.status} />
        <BadgePrioridade prioridade={ocorrencia.prioridade} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Descrição</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <p className="whitespace-pre-wrap">{ocorrencia.descricao}</p>
              <dl className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-muted-foreground">Tipo de defeito</dt>
                  <dd>{ocorrencia.tipo_defeito?.nome ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Aberta em</dt>
                  <dd>{fmtDataHora.format(new Date(ocorrencia.aberta_em))}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">SLA</dt>
                  <dd className={slaVencido ? "font-semibold text-destructive" : undefined}>
                    {ocorrencia.sla_vence_em
                      ? fmtDataHora.format(new Date(ocorrencia.sla_vence_em))
                      : "—"}
                    {slaVencido ? " (vencido)" : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Encerrada em</dt>
                  <dd>
                    {ocorrencia.encerrada_em
                      ? fmtDataHora.format(new Date(ocorrencia.encerrada_em))
                      : "—"}
                  </dd>
                </div>
                {ocorrencia.os_externa && (
                  <div>
                    <dt className="text-muted-foreground">OS externa</dt>
                    <dd>{ocorrencia.os_externa}</dd>
                  </div>
                )}
                {ocorrencia.impedimento && (
                  <div>
                    <dt className="text-muted-foreground">Impedimento</dt>
                    <dd>{ocorrencia.impedimento}</dd>
                  </div>
                )}
              </dl>
            </CardContent>
          </Card>

          <SecaoTimeline ocorrenciaId={id} editavel={editavel} />
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Atendimento</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {podeAceitarOuReprovar && (
                <div className="flex flex-col gap-2 rounded-lg border border-warning/30 bg-warning/5 p-3">
                  <p className="text-xs text-muted-foreground">
                    A empresa contratada informou que o serviço foi concluído.
                    Confirme se a câmera voltou a funcionar.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="success"
                      className="flex-1"
                      disabled={atualizar.isPending}
                      onClick={abrirAceitar}
                    >
                      <CheckCircle2 className="size-4" />
                      Aceitar
                    </Button>
                    <Button
                      variant="alerta"
                      className="flex-1"
                      disabled={atualizar.isPending}
                      onClick={reprovarOs}
                    >
                      <RotateCcw className="size-4" />
                      Reprovar
                    </Button>
                  </div>
                </div>
              )}

              {podeAssumir ? (
                <Button onClick={assumirAtendimento} disabled={atualizar.isPending}>
                  {atualizar.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <PlayCircle className="size-4" />
                  )}
                  Assumir atendimento
                </Button>
              ) : editavel ? (
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="flex flex-col gap-4"
                  >
                    <CampoSelect
                      control={form.control}
                      name="status"
                      label="Status"
                      placeholder="Selecione"
                      opcoes={opcoesStatusForm}
                    />
                    <CampoSelect
                      control={form.control}
                      name="prioridade"
                      label="Prioridade"
                      placeholder="Selecione"
                      opcoes={OPCOES_PRIORIDADE}
                      disabled={ehEmpresaContratada}
                    />
                    <CampoSelect
                      control={form.control}
                      name="empresa_id"
                      label="Empresa (opcional)"
                      placeholder="Selecione"
                      opcoes={opcoesEmpresa}
                    />
                    <CampoComboboxCriavel
                      control={form.control}
                      name="tecnico_id"
                      label="Técnico (opcional)"
                      placeholder="Selecione ou crie o técnico"
                      opcoes={opcoesTecnico}
                      aoCriar={aoCriarTecnico}
                      rotuloCriar={(termo) => `Cadastrar "${termo}" como novo técnico`}
                    />
                    <CampoTexto
                      control={form.control}
                      name="os_externa"
                      label="OS externa (opcional)"
                    />
                    <CampoTexto
                      control={form.control}
                      name="impedimento"
                      label="Impedimento (opcional)"
                    />
                    <CampoSelect
                      control={form.control}
                      name="sla_horas"
                      label="Prazo (SLA)"
                      placeholder="Selecione"
                      opcoes={OPCOES_SLA}
                    />
                    <Button type="submit" disabled={atualizar.isPending}>
                      {atualizar.isPending && (
                        <Loader2 className="size-4 animate-spin" />
                      )}
                      Salvar
                    </Button>
                    {podeCancelar && (
                      <Button
                        type="button"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setCancelarAberto(true)}
                      >
                        <Ban className="size-4" />
                        Cancelar ocorrência
                      </Button>
                    )}
                    {podeCancelarManutencao && (
                      <Button
                        type="button"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setCancelarManutencaoAberto(true)}
                      >
                        <Ban className="size-4" />
                        Cancelar manutenção
                      </Button>
                    )}
                  </form>
                </Form>
              ) : (
                <dl className="flex flex-col gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Empresa</dt>
                    <dd>{ocorrencia.empresa?.nome ?? "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Técnico</dt>
                    <dd>{ocorrencia.tecnico?.nome ?? "—"}</dd>
                  </div>
                </dl>
              )}
            </CardContent>
          </Card>

          <SecaoAnexos ocorrenciaId={id} editavel={editavel} />
        </div>
      </div>

      <Dialog open={aceitarAberto} onOpenChange={setAceitarAberto}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atualizar status da câmera</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            A OS será concluída. O status operacional da câmera é independente
            do status da OS — confirme qual deve ficar registrado a partir de
            agora.
          </p>
          <Select
            value={statusCameraModal}
            onValueChange={(v) => setStatusCameraModal(v as CameraStatus)}
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(CAMERA_STATUS_LABEL) as CameraStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {CAMERA_STATUS_LABEL[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAceitarAberto(false)}
              disabled={salvandoCamera || atualizar.isPending}
            >
              Cancelar
            </Button>
            <Button
              onClick={confirmarAceitar}
              disabled={salvandoCamera || atualizar.isPending}
            >
              {(salvandoCamera || atualizar.isPending) && (
                <Loader2 className="size-4 animate-spin" />
              )}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={cancelarAberto} onOpenChange={setCancelarAberto}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar esta ocorrência?</AlertDialogTitle>
            <AlertDialogDescription>
              A ocorrência não é excluída — o status vira &quot;Cancelada&quot; e o
              motivo fica registrado no histórico, mantendo tudo auditável.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="motivo-cancelamento">
              Motivo do cancelamento
            </label>
            <Textarea
              id="motivo-cancelamento"
              value={motivoCancelamento}
              onChange={(e) => setMotivoCancelamento(e.target.value)}
              placeholder="Ex.: ocorrência aberta por engano"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              disabled={!motivoCancelamento.trim() || atualizar.isPending}
              onClick={confirmarCancelamento}
            >
              Confirmar cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={cancelarManutencaoAberto}
        onOpenChange={setCancelarManutencaoAberto}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar manutenção?</AlertDialogTitle>
            <AlertDialogDescription>
              A ocorrência não é cancelada — ela volta para &quot;Aberta&quot; para
              que o CFTC decida os próximos passos, e o motivo fica registrado no
              histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium" htmlFor="motivo-cancelamento-manutencao">
              Motivo do cancelamento
            </label>
            <Textarea
              id="motivo-cancelamento-manutencao"
              value={motivoCancelamentoManutencao}
              onChange={(e) => setMotivoCancelamentoManutencao(e.target.value)}
              placeholder="Ex.: equipe sem disponibilidade para atender"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              disabled={!motivoCancelamentoManutencao.trim() || atualizar.isPending}
              onClick={confirmarCancelamentoManutencao}
            >
              Confirmar cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
