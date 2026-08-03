"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { useQueryClient } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { z } from "zod";
import { Loader2, Plus, Search } from "lucide-react";
import {
  useCamerasDashboard,
  useCatalogos,
  useOcorrenciasDashboard,
} from "@/hooks/use-dashboard";
import { useCriarOcorrencia } from "@/hooks/use-ocorrencias";
import { hooksTecnicos } from "@/hooks/use-cadastros";
import { crudTecnicos } from "@/services/cadastros";
import { diasParada, estaAberta } from "@/services/indicadores";
import { useOrdenacao } from "@/hooks/use-ordenacao";
import { usePerfil } from "@/components/perfil-provider";
import {
  CAMERA_STATUS_LABEL,
  OCORRENCIA_STATUS_LABEL,
  PRIORIDADE_LABEL,
  SLA_OPCOES,
  STATUS_CAMERA_SEM_DEFEITO,
  podeEditar,
  type Prioridade,
} from "@/types/domain";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import {
  CampoComboboxCriavel,
  CampoSelect,
  CampoTexto,
  CampoTextarea,
} from "@/components/cadastros/campos-formulario";
import { CabecalhoOrdenavel } from "@/components/ui/cabecalho-ordenavel";
import { Ajuda } from "@/components/ui/ajuda";
import { BadgePrioridade, BadgeStatusOcorrencia } from "@/components/dashboard/badges";

const fmtData = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
});

const schemaNova = z.object({
  camera_id: z.string(),
  tipo_defeito_id: z.string(),
  descricao: z.string().min(1, "Descreva o problema"),
  prioridade: z.string().min(1),
  empresa_id: z.string(),
  tecnico_id: z.string(),
  os_externa: z.string(),
  impedimento: z.string(),
  sla_horas: z.string(),
});
type FormNova = z.infer<typeof schemaNova>;

const valoresPadraoNova: FormNova = {
  camera_id: "",
  tipo_defeito_id: "",
  descricao: "",
  prioridade: "media",
  empresa_id: "",
  tecnico_id: "",
  os_externa: "",
  impedimento: "",
  sla_horas: "sem_sla",
};

const OPCOES_PRIORIDADE = Object.entries(PRIORIDADE_LABEL).map(
  ([valor, rotulo]) => ({ valor, rotulo })
);

/** Radix Select não aceita value="" em SelectItem — "sem_sla" representa
    "Sem SLA" (sla_horas = null) no payload de criação/atualização. */
const OPCOES_SLA = SLA_OPCOES.map((o) => ({
  valor: o.horas === null ? "sem_sla" : String(o.horas),
  rotulo: o.rotulo,
}));

function slaHorasDoForm(valor: string): number | null {
  return valor === "sem_sla" ? null : Number(valor);
}

function NovaOcorrenciaDialog() {
  const [aberto, setAberto] = useState(false);
  const queryClient = useQueryClient();
  const { data: cameras } = useCamerasDashboard();
  const { data: catalogos } = useCatalogos();
  const { data: tecnicos } = hooksTecnicos.useListar();
  const criar = useCriarOcorrencia();

  const form = useForm<FormNova>({
    resolver: zodResolver(schemaNova),
    defaultValues: valoresPadraoNova,
  });
  const empresaId = form.watch("empresa_id");
  const cameraId = form.watch("camera_id");
  const tipoDefeitoId = form.watch("tipo_defeito_id");

  /** Prévia da regra aplicada pela trigger ao salvar: o defeito escolhido
      define para qual status a câmera vinculada vai enquanto a OS estiver
      aberta (ver `sincronizar_status_camera_por_ocorrencia`). */
  const statusCameraPrevisto = cameraId
    ? (catalogos?.tiposDefeito.find((t) => t.id === tipoDefeitoId)
        ?.status_camera ?? STATUS_CAMERA_SEM_DEFEITO)
    : null;

  const opcoesCamera = (cameras ?? []).map((c) => ({
    valor: c.id,
    rotulo: `Câmera ${c.numero}${c.local ? ` — ${c.local.nome}` : ""}`,
  }));
  const opcoesDefeito = (catalogos?.tiposDefeito ?? []).map((t) => ({
    valor: t.id,
    rotulo: t.nome,
  }));
  const opcoesEmpresa = (catalogos?.empresas ?? []).map((e) => ({
    valor: e.id,
    rotulo: e.nome,
  }));
  const opcoesTecnico = (tecnicos ?? [])
    .filter((t) => !empresaId || t.empresa_id === empresaId)
    .map((t) => ({ valor: t.id, rotulo: t.nome }));

  async function aoCriarTecnico(nome: string): Promise<string | undefined> {
    if (!empresaId) {
      toast.error("Selecione a empresa antes de cadastrar o técnico");
      return undefined;
    }
    try {
      const novo = await crudTecnicos.criar({ nome, empresa_id: empresaId });
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

  function onSubmit(v: FormNova) {
    criar.mutate(
      {
        camera_id: v.camera_id || null,
        tipo_defeito_id: v.tipo_defeito_id || null,
        descricao: v.descricao,
        prioridade: v.prioridade as Prioridade,
        empresa_id: v.empresa_id || null,
        tecnico_id: v.tecnico_id || null,
        os_externa: v.os_externa || null,
        impedimento: v.impedimento || null,
        sla_horas: slaHorasDoForm(v.sla_horas),
      },
      {
        onSuccess: () => {
          setAberto(false);
          form.reset(valoresPadraoNova);
        },
      }
    );
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <Ajuda texto="Abrir uma nova ordem de serviço">
        <DialogTrigger asChild>
          <Button>
            <Plus className="size-4" />
            Nova ocorrência
          </Button>
        </DialogTrigger>
      </Ajuda>
      <DialogContent className="sm:max-w-lg">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex flex-col gap-4"
          >
            <DialogHeader>
              <DialogTitle>Nova ocorrência</DialogTitle>
            </DialogHeader>
            <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
              <CampoSelect
                control={form.control}
                name="camera_id"
                label="Câmera (opcional)"
                placeholder="Sistema (sem câmera)"
                opcoes={opcoesCamera}
              />
              <div className="grid grid-cols-2 gap-4">
                <CampoSelect
                  control={form.control}
                  name="tipo_defeito_id"
                  label="Tipo de defeito (opcional)"
                  placeholder="Selecione"
                  opcoes={opcoesDefeito}
                />
                <CampoSelect
                  control={form.control}
                  name="prioridade"
                  label="Prioridade"
                  placeholder="Selecione"
                  opcoes={OPCOES_PRIORIDADE}
                />
              </div>
              {statusCameraPrevisto && (
                <p className="-mt-2 text-xs text-muted-foreground">
                  Ao abrir, a câmera passa para{" "}
                  <span className="font-medium text-foreground">
                    {CAMERA_STATUS_LABEL[statusCameraPrevisto]}
                  </span>{" "}
                  e volta ao status atual quando a OS for concluída ou
                  cancelada.
                </p>
              )}
              <CampoTextarea
                control={form.control}
                name="descricao"
                label="Descrição"
                placeholder="Descreva o problema"
              />
              <div className="grid grid-cols-2 gap-4">
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
              </div>
              <div className="grid grid-cols-2 gap-4">
                <CampoTexto control={form.control} name="os_externa" label="OS externa (opcional)" />
                <CampoTexto
                  control={form.control}
                  name="impedimento"
                  label="Impedimento (opcional)"
                  placeholder="Ex.: aguardando obra"
                />
              </div>
              <CampoSelect
                control={form.control}
                name="sla_horas"
                label="Prazo (SLA)"
                placeholder="Selecione"
                opcoes={OPCOES_SLA}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={criar.isPending}>
                {criar.isPending && <Loader2 className="size-4 animate-spin" />}
                Abrir ocorrência
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const TODOS = "todos";

export function OcorrenciasClient() {
  const router = useRouter();
  const perfil = usePerfil();
  const searchParams = useSearchParams();
  const { data: ocorrencias, isPending } = useOcorrenciasDashboard();
  const { data: catalogos } = useCatalogos();
  const { ordenacao, alternar: alternarOrdenacao, ordenar } = useOrdenacao();

  const [termo, setTermo] = useState("");
  const [status, setStatus] = useState<string>(searchParams.get("status") ?? TODOS);
  const [prioridade, setPrioridade] = useState<string>(TODOS);
  const [empresaId, setEmpresaId] = useState<string>(TODOS);
  const somenteAbertas = searchParams.get("aberta") === "1";
  const somenteVencidas = searchParams.get("vencidas") === "1";

  const filtradas = useMemo(() => {
    const alvo = termo.trim().toLowerCase();
    const lista = (ocorrencias ?? []).filter((o) => {
      if (somenteAbertas && !estaAberta(o)) return false;
      if (somenteVencidas && (!o.sla_vence_em || new Date(o.sla_vence_em) >= new Date())) return false;
      if (status !== TODOS && o.status !== status) return false;
      if (prioridade !== TODOS && o.prioridade !== prioridade) return false;
      if (empresaId !== TODOS && o.empresa?.id !== empresaId) return false;
      if (!alvo) return true;
      return (
        o.descricao.toLowerCase().includes(alvo) ||
        String(o.numero).includes(alvo) ||
        (o.camera ? String(o.camera.numero).includes(alvo) : false) ||
        (o.camera?.local?.nome ?? "").toLowerCase().includes(alvo) ||
        (o.tipo_defeito?.nome ?? "").toLowerCase().includes(alvo)
      );
    });
    return ordenar(lista, {
      numero: (o) => o.numero,
      camera: (o) => o.camera?.numero ?? 0,
      defeito: (o) => o.tipo_defeito?.nome ?? "",
      empresa: (o) => o.empresa?.nome ?? "",
      status: (o) => o.status,
      prioridade: (o) => o.prioridade,
      aberta_em: (o) => o.aberta_em,
      dias: (o) => diasParada(o),
    });
  }, [ocorrencias, termo, status, prioridade, empresaId, somenteAbertas, somenteVencidas, ordenar]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Ocorrências
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestão de ordens de serviço do circuito de câmeras
          </p>
        </div>
        {podeEditar(perfil.papel) && <NovaOcorrenciaDialog />}
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={termo}
            onChange={(e) => setTermo(e.target.value)}
            placeholder="Buscar..."
            className="pl-8"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todos os status</SelectItem>
            {Object.entries(OCORRENCIA_STATUS_LABEL).map(([v, r]) => (
              <SelectItem key={v} value={v}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={prioridade} onValueChange={setPrioridade}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todas as prioridades</SelectItem>
            {OPCOES_PRIORIDADE.map((o) => (
              <SelectItem key={o.valor} value={o.valor}>
                {o.rotulo}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={empresaId} onValueChange={setEmpresaId}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Empresa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS}>Todas as empresas</SelectItem>
            {(catalogos?.empresas ?? []).map((e) => (
              <SelectItem key={e.id} value={e.id}>
                {e.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isPending ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-9 w-full" />
              ))}
            </div>
          ) : filtradas.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              Nenhuma ocorrência encontrada
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <CabecalhoOrdenavel chave="numero" rotulo="Nº" ordenacao={ordenacao} onClick={alternarOrdenacao} />
                    </TableHead>
                    <TableHead>
                      <CabecalhoOrdenavel chave="camera" rotulo="Câmera / Local" ordenacao={ordenacao} onClick={alternarOrdenacao} />
                    </TableHead>
                    <TableHead>
                      <CabecalhoOrdenavel chave="defeito" rotulo="Defeito" ordenacao={ordenacao} onClick={alternarOrdenacao} />
                    </TableHead>
                    <TableHead>
                      <CabecalhoOrdenavel chave="empresa" rotulo="Empresa" ordenacao={ordenacao} onClick={alternarOrdenacao} />
                    </TableHead>
                    <TableHead>
                      <CabecalhoOrdenavel chave="status" rotulo="Status" ordenacao={ordenacao} onClick={alternarOrdenacao} />
                    </TableHead>
                    <TableHead>
                      <CabecalhoOrdenavel chave="prioridade" rotulo="Prioridade" ordenacao={ordenacao} onClick={alternarOrdenacao} />
                    </TableHead>
                    <TableHead>
                      <CabecalhoOrdenavel chave="aberta_em" rotulo="Aberta em" ordenacao={ordenacao} onClick={alternarOrdenacao} />
                    </TableHead>
                    <TableHead className="text-right">
                      <CabecalhoOrdenavel chave="dias" rotulo="Dias parada" ordenacao={ordenacao} onClick={alternarOrdenacao} />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtradas.map((o) => {
                    const dias = diasParada(o);
                    return (
                      <TableRow
                        key={o.id}
                        className="cursor-pointer"
                        onClick={() => router.push(`/ocorrencias/${o.id}`)}
                      >
                        <TableCell className="font-medium">#{o.numero}</TableCell>
                        <TableCell>
                          {o.camera
                            ? `Câmera ${o.camera.numero} — ${o.camera.local?.nome ?? "—"}`
                            : "Sistema"}
                        </TableCell>
                        <TableCell>{o.tipo_defeito?.nome ?? "—"}</TableCell>
                        <TableCell>{o.empresa?.nome ?? "—"}</TableCell>
                        <TableCell>
                          <BadgeStatusOcorrencia status={o.status} />
                        </TableCell>
                        <TableCell>
                          <BadgePrioridade prioridade={o.prioridade} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap tabular-nums">
                          {fmtData.format(new Date(o.aberta_em))}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "text-right tabular-nums",
                            estaAberta(o) && dias >= 7 && "font-semibold text-destructive"
                          )}
                        >
                          {dias}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
