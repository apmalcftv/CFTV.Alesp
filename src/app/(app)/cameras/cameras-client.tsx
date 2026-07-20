"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useWatch, type Control } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Upload } from "lucide-react";
import {
  CAMERA_STATUS_LABEL,
  type Camera,
  type CameraStatus,
} from "@/types/domain";
import { hooksCameras, useEventosCamera } from "@/hooks/use-cameras";
import {
  hooksEmpresas,
  hooksFabricantes,
  hooksLocais,
  hooksModelos,
  hooksNvrs,
  hooksPredios,
} from "@/hooks/use-cadastros";
import { crudLocais } from "@/services/cadastros";
import { PaginaCrud, type ColunaCrud } from "@/components/cadastros/pagina-crud";
import {
  CampoComboboxCriavel,
  CampoSelect,
  CampoTexto,
  CampoTextarea,
} from "@/components/cadastros/campos-formulario";
import { BadgeStatusCamera } from "@/components/dashboard/badges";
import { Ajuda } from "@/components/ui/ajuda";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { SelectMultiplo } from "@/components/ui/select-multiplo";
import { DialogoImportar } from "@/components/cameras/dialogo-importar";
import { BarraSelecaoCameras } from "@/components/cameras/barra-selecao-cameras";

const STATUS_OPCOES = (
  Object.keys(CAMERA_STATUS_LABEL) as CameraStatus[]
).map((s) => ({ valor: s, rotulo: CAMERA_STATUS_LABEL[s] }));

const fmtDataHora = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

/** Histórico próprio da câmera — totalmente separado do histórico da OS,
    só populado pela trigger `on_camera_status_change` quando alguém muda
    o status (edição direta aqui ou o modal de aceite de uma OS). */
function SecaoHistoricoCamera({ cameraId }: { cameraId: string }) {
  const { data: eventos, isPending } = useEventosCamera(cameraId);
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Histórico da câmera</CardTitle>
      </CardHeader>
      <CardContent>
        {isPending ? (
          <Skeleton className="h-16 w-full" />
        ) : !eventos || eventos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sem eventos registrados</p>
        ) : (
          <ol className="flex flex-col gap-2">
            {eventos.map((e) => (
              <li key={e.id} className="text-sm">
                <p>
                  {e.status_anterior ? CAMERA_STATUS_LABEL[e.status_anterior] : "—"}
                  {" → "}
                  {e.status_novo ? CAMERA_STATUS_LABEL[e.status_novo] : "—"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {e.autor?.nome ?? "Sistema"} · {fmtDataHora.format(new Date(e.criado_em))}
                </p>
              </li>
            ))}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}

const octetos = (ip: string) => ip.trim().split(".");

const schemaIp = z
  .string()
  .min(1, "Informe o IP")
  .refine((v) => {
    const partes = octetos(v);
    if (partes.length !== 4) return false;
    return partes.every((p) => /^\d{1,3}$/.test(p) && Number(p) <= 255);
  }, "IP inválido — use o formato 0.0.0.0");

const schema = z.object({
  ip: schemaIp,
  patrimonio: z.string(),
  canal: z.string(),
  modelo_id: z.string(),
  local_id: z.string().min(1, "Selecione o local"),
  nvr_id: z.string(),
  empresa_id: z.string(),
  status: z.string().min(1),
  instalada_em: z.string(),
  observacoes: z.string(),
});
type Form = z.infer<typeof schema>;

const valoresPadrao: Form = {
  ip: "",
  patrimonio: "",
  canal: "",
  modelo_id: "",
  local_id: "",
  nvr_id: "",
  empresa_id: "",
  status: "operante",
  instalada_em: "",
  observacoes: "",
};

function numeroDoIp(ip: string): number | null {
  const partes = octetos(ip);
  if (partes.length !== 4) return null;
  const ultimo = Number(partes[3]);
  return Number.isFinite(ultimo) ? ultimo : null;
}

function CampoCameraCalculada({ control }: { control: Control<Form> }) {
  const ip = useWatch({ control, name: "ip" });
  const numero = numeroDoIp(ip ?? "");
  return (
    <div className="space-y-2">
      <label className="text-sm leading-none font-medium">Câmera</label>
      <div className="flex h-8 items-center rounded-lg border border-dashed bg-muted/50 px-2.5 text-sm text-muted-foreground">
        {numero !== null ? `Câmera ${numero}` : "Preencha o IP"}
      </div>
    </div>
  );
}

export function CamerasClient() {
  const searchParams = useSearchParams();
  const statusUrl = searchParams.get("status");
  const [statusFiltro, setStatusFiltro] = useState<CameraStatus[]>(() =>
    statusUrl ? (statusUrl.split(",") as CameraStatus[]) : []
  );
  const [importarAberto, setImportarAberto] = useState(false);
  const queryClient = useQueryClient();

  const { data: locais } = hooksLocais.useListar();
  const { data: modelos } = hooksModelos.useListar();
  const { data: nvrs } = hooksNvrs.useListar();
  const { data: fabricantes } = hooksFabricantes.useListar();
  const { data: predios } = hooksPredios.useListar();
  const { data: empresas } = hooksEmpresas.useListar();

  const opcoesLocal = (locais ?? []).map((l) => ({
    valor: l.id,
    rotulo: l.nome,
  }));
  const opcoesModelo = (modelos ?? []).map((m) => ({
    valor: m.id,
    rotulo: m.nome,
  }));
  const opcoesNvr = (nvrs ?? []).map((n) => ({ valor: n.id, rotulo: n.nome }));
  const opcoesEmpresa = (empresas ?? []).map((e) => ({
    valor: e.id,
    rotulo: e.nome,
  }));

  const nomeLocal = (id: string | null) =>
    id ? (locais?.find((l) => l.id === id)?.nome ?? "—") : "—";
  const nomeModelo = (id: string | null) =>
    id ? (modelos?.find((m) => m.id === id)?.nome ?? "—") : "—";
  const nomeFabricante = (modeloId: string | null) => {
    const fabricanteId = modelos?.find((m) => m.id === modeloId)?.fabricante_id;
    return fabricanteId
      ? (fabricantes?.find((f) => f.id === fabricanteId)?.nome ?? "")
      : "";
  };
  const nomeEmpresa = (id: string | null) =>
    id ? (empresas?.find((e) => e.id === id)?.nome ?? "—") : "—";

  async function aoCriarLocal(nome: string): Promise<string | undefined> {
    const predioId = predios?.[0]?.id;
    if (!predioId) {
      toast.error("Cadastre um prédio antes de criar um local");
      return undefined;
    }
    try {
      const novo = await crudLocais.criar({ nome, predio_id: predioId });
      queryClient.invalidateQueries({ queryKey: ["locais"] });
      toast.success(`Local "${nome}" criado`);
      return novo.id;
    } catch (e) {
      toast.error("Não foi possível criar o local", {
        description: (e as Error).message,
      });
      return undefined;
    }
  }

  const colunas: ColunaCrud<Camera>[] = [
    {
      chave: "numero",
      rotulo: "Câmera",
      render: (c) => <span className="font-medium">Câmera {c.numero}</span>,
      ordenar: (c) => c.numero,
    },
    {
      chave: "status",
      rotulo: "Status",
      render: (c) => <BadgeStatusCamera status={c.status} />,
      ordenar: (c) => c.status,
    },
    {
      chave: "local",
      rotulo: "Local",
      render: (c) => nomeLocal(c.local_id),
      ordenar: (c) => nomeLocal(c.local_id),
    },
    { chave: "modelo", rotulo: "Modelo", render: (c) => nomeModelo(c.modelo_id) },
    { chave: "empresa", rotulo: "Empresa", render: (c) => nomeEmpresa(c.empresa_id) },
    { chave: "patrimonio", rotulo: "Patrimônio", render: (c) => c.patrimonio ?? "—" },
    { chave: "ip", rotulo: "IP", render: (c) => c.ip ?? "—" },
  ];

  return (
    <>
      <PaginaCrud<Camera, Form>
        titulo="Câmeras"
        descricao="Inventário completo das câmeras do circuito"
        hooks={hooksCameras}
        colunas={colunas}
        resolver={zodResolver(schema)}
        valoresPadrao={valoresPadrao}
        filtrosExtras={
          <SelectMultiplo
            value={statusFiltro}
            onChange={(v) => setStatusFiltro(v as CameraStatus[])}
            opcoes={STATUS_OPCOES}
            placeholder="Status: todos"
          />
        }
        filtroExtra={(c) =>
          statusFiltro.length === 0 || statusFiltro.includes(c.status)
        }
        acoesExtras={
          <Ajuda texto="Cadastrar várias câmeras de uma vez a partir de uma planilha">
            <Button variant="outline" onClick={() => setImportarAberto(true)}>
              <Upload className="size-4" />
              Importar inventário
            </Button>
          </Ajuda>
        }
        resumo={(total, exibindo) => (
          <p className="text-sm text-muted-foreground">
            Total de câmeras: {total} · Exibindo: {exibindo} câmera(s)
          </p>
        )}
        selecaoMassa={{
          barra: (selecionadas, limpar) => (
            <BarraSelecaoCameras
              selecionadas={selecionadas}
              limpar={limpar}
              opcoesStatus={STATUS_OPCOES}
              opcoesEmpresa={opcoesEmpresa}
              opcoesModelo={opcoesModelo}
              opcoesLocal={opcoesLocal}
            />
          ),
        }}
        paraFormulario={(c) => ({
          ip: c.ip ?? "",
          patrimonio: c.patrimonio ?? "",
          canal: c.canal != null ? String(c.canal) : "",
          modelo_id: c.modelo_id ?? "",
          local_id: c.local_id ?? "",
          nvr_id: c.nvr_id ?? "",
          empresa_id: c.empresa_id ?? "",
          status: c.status,
          instalada_em: c.instalada_em ?? "",
          observacoes: c.observacoes ?? "",
        })}
        normalizar={(v) => ({
          numero: numeroDoIp(v.ip) ?? 0,
          ip: v.ip,
          patrimonio: v.patrimonio || null,
          canal: v.canal ? Number(v.canal) : null,
          modelo_id: v.modelo_id || null,
          local_id: v.local_id,
          nvr_id: v.nvr_id || null,
          empresa_id: v.empresa_id || null,
          status: v.status as CameraStatus,
          instalada_em: v.instalada_em || null,
          observacoes: v.observacoes || null,
        })}
        buscar={(c, termo) =>
          String(c.numero).includes(termo) ||
          (c.ip ?? "").toLowerCase().includes(termo) ||
          (c.patrimonio ?? "").toLowerCase().includes(termo) ||
          nomeLocal(c.local_id).toLowerCase().includes(termo) ||
          nomeModelo(c.modelo_id).toLowerCase().includes(termo) ||
          nomeFabricante(c.modelo_id).toLowerCase().includes(termo) ||
          nomeEmpresa(c.empresa_id).toLowerCase().includes(termo)
        }
        rotuloItem={(c) => `Câmera ${c.numero}`}
        campos={(form, editando) => (
          <>
            <div className="grid grid-cols-2 gap-4">
              <CampoTexto control={form.control} name="ip" label="IP" placeholder="10.20.30.170" />
              <CampoCameraCalculada control={form.control} />
            </div>
            <CampoSelect
              control={form.control}
              name="status"
              label="Status"
              placeholder="Selecione"
              opcoes={STATUS_OPCOES}
            />
            <CampoComboboxCriavel
              control={form.control}
              name="local_id"
              label="Local"
              placeholder="Selecione ou crie o local"
              opcoes={opcoesLocal}
              aoCriar={aoCriarLocal}
              rotuloCriar={(termo) => `Criar local "${termo}"`}
            />
            <div className="grid grid-cols-2 gap-4">
              <CampoSelect
                control={form.control}
                name="modelo_id"
                label="Modelo (opcional)"
                placeholder="Selecione o modelo"
                opcoes={opcoesModelo}
              />
              <CampoSelect
                control={form.control}
                name="nvr_id"
                label="NVR (opcional)"
                placeholder="Selecione o NVR"
                opcoes={opcoesNvr}
              />
            </div>
            <CampoSelect
              control={form.control}
              name="empresa_id"
              label="Empresa responsável (opcional)"
              placeholder="Selecione a empresa"
              opcoes={opcoesEmpresa}
            />
            <div className="grid grid-cols-2 gap-4">
              <CampoTexto control={form.control} name="patrimonio" label="Patrimônio (opcional)" />
              <CampoTexto control={form.control} name="canal" label="Canal (opcional)" type="number" />
            </div>
            <CampoTexto control={form.control} name="instalada_em" label="Instalada em (opcional)" type="date" />
            <CampoTextarea control={form.control} name="observacoes" label="Observações (opcional)" />
            {editando && <SecaoHistoricoCamera cameraId={editando.id} />}
          </>
        )}
      />
      <DialogoImportar open={importarAberto} onOpenChange={setImportarAberto} />
    </>
  );
}
