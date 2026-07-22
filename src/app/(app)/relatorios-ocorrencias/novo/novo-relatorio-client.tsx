"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useCriarRelatorioOcorrencia } from "@/hooks/use-relatorios-ocorrencia";
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
import { PRIORIDADE_LABEL, type Prioridade } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import {
  CampoComboboxCriavel,
  CampoSelect,
  CampoTexto,
  CampoTextarea,
} from "@/components/cadastros/campos-formulario";

const schemaNovo = z.object({
  numero_memorando: z.string(),
  tipo_solicitacao_id: z.string(),
  solicitante_id: z.string(),
  departamento_id: z.string(),
  data_solicitacao: z.string().min(1, "Informe a data da solicitação"),
  prioridade: z.string().min(1),
  operador_id: z.string(),
  data_limite: z.string(),
  classificacao: z.string(),
  data_fato: z.string(),
  hora_aproximada: z.string(),
  local_id: z.string(),
  descricao_fato: z.string().min(1, "Descreva o ocorrido"),
  tipo_ocorrencia_id: z.string(),
  pessoas_envolvidas: z.string(),
  observacoes_fato: z.string(),
});
type FormNovo = z.infer<typeof schemaNovo>;

const valoresPadrao: FormNovo = {
  numero_memorando: "",
  tipo_solicitacao_id: "",
  solicitante_id: "",
  departamento_id: "",
  data_solicitacao: new Date().toISOString().slice(0, 10),
  prioridade: "media",
  operador_id: "",
  data_limite: "",
  classificacao: "",
  data_fato: "",
  hora_aproximada: "",
  local_id: "",
  descricao_fato: "",
  tipo_ocorrencia_id: "",
  pessoas_envolvidas: "",
  observacoes_fato: "",
};

const OPCOES_PRIORIDADE = Object.entries(PRIORIDADE_LABEL).map(([valor, rotulo]) => ({
  valor,
  rotulo,
}));

export function NovoRelatorioClient() {
  const router = useRouter();
  const criar = useCriarRelatorioOcorrencia();

  const { data: locais } = hooksLocais.useListar();
  const { data: predios } = hooksPredios.useListar();
  const { data: perfis } = usePerfis();
  const { data: tiposSolicitacao } = hooksTiposSolicitacao.useListar();
  const { data: solicitantes } = hooksSolicitantes.useListar();
  const { data: departamentos } = hooksDepartamentos.useListar();
  const { data: tiposOcorrencia } = hooksTiposOcorrenciaRelatorio.useListar();

  const form = useForm<FormNovo>({
    resolver: zodResolver(schemaNovo),
    defaultValues: valoresPadrao,
  });

  const opcoesLocal = (locais ?? []).map((l) => ({ valor: l.id, rotulo: l.nome }));
  const opcoesOperador = (perfis ?? [])
    .filter((p) => p.status === "aprovado")
    .map((p) => ({ valor: p.id, rotulo: p.nome }));
  const opcoesTipoSolicitacao = (tiposSolicitacao ?? []).map((t) => ({
    valor: t.id,
    rotulo: t.nome,
  }));
  const opcoesSolicitante = (solicitantes ?? []).map((s) => ({ valor: s.id, rotulo: s.nome }));
  const opcoesDepartamento = (departamentos ?? []).map((d) => ({ valor: d.id, rotulo: d.nome }));
  const opcoesTipoOcorrencia = (tiposOcorrencia ?? []).map((t) => ({
    valor: t.id,
    rotulo: t.nome,
  }));

  async function aoCriarLocal(nome: string): Promise<string | undefined> {
    const predioId = predios?.[0]?.id;
    if (!predioId) {
      toast.error("Cadastre um prédio antes de criar um local");
      return undefined;
    }
    const novo = await crudLocais.criar({ nome, predio_id: predioId });
    return novo.id;
  }
  async function aoCriarTipoSolicitacao(nome: string) {
    const novo = await crudTiposSolicitacao.criar({ nome });
    return novo.id;
  }
  async function aoCriarSolicitante(nome: string) {
    const novo = await crudSolicitantes.criar({ nome });
    return novo.id;
  }
  async function aoCriarDepartamento(nome: string) {
    const novo = await crudDepartamentos.criar({ nome });
    return novo.id;
  }
  async function aoCriarTipoOcorrencia(nome: string) {
    const novo = await crudTiposOcorrenciaRelatorio.criar({ nome });
    return novo.id;
  }

  function onSubmit(v: FormNovo) {
    criar.mutate(
      {
        numero_memorando: v.numero_memorando || null,
        tipo_solicitacao_id: v.tipo_solicitacao_id || null,
        solicitante_id: v.solicitante_id || null,
        departamento_id: v.departamento_id || null,
        data_solicitacao: v.data_solicitacao,
        prioridade: v.prioridade as Prioridade,
        operador_id: v.operador_id || null,
        data_limite: v.data_limite || null,
        classificacao: v.classificacao || null,
        data_fato: v.data_fato || null,
        hora_aproximada: v.hora_aproximada || null,
        local_id: v.local_id || null,
        descricao_fato: v.descricao_fato,
        tipo_ocorrencia_id: v.tipo_ocorrencia_id || null,
        pessoas_envolvidas: v.pessoas_envolvidas || null,
        observacoes_fato: v.observacoes_fato || null,
      },
      {
        onSuccess: (relatorio) => {
          router.push(`/relatorios-ocorrencias/${relatorio.id}`);
        },
      }
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/relatorios-ocorrencias")}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Novo relatório</h1>
          <p className="text-sm text-muted-foreground">
            Dados da solicitação e do fato — a análise, exportações, resultado e anexos são
            preenchidos depois de criado.
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Dados da solicitação</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <CampoTexto control={form.control} name="numero_memorando" label="Número do memorando (opcional)" />
              <CampoComboboxCriavel
                control={form.control}
                name="tipo_solicitacao_id"
                label="Tipo de solicitação (opcional)"
                placeholder="Selecione ou crie"
                opcoes={opcoesTipoSolicitacao}
                aoCriar={aoCriarTipoSolicitacao}
                rotuloCriar={(t) => `Criar "${t}"`}
              />
              <CampoComboboxCriavel
                control={form.control}
                name="solicitante_id"
                label="Solicitante (opcional)"
                placeholder="Selecione ou crie"
                opcoes={opcoesSolicitante}
                aoCriar={aoCriarSolicitante}
                rotuloCriar={(t) => `Criar "${t}"`}
              />
              <CampoComboboxCriavel
                control={form.control}
                name="departamento_id"
                label="Departamento (opcional)"
                placeholder="Selecione ou crie"
                opcoes={opcoesDepartamento}
                aoCriar={aoCriarDepartamento}
                rotuloCriar={(t) => `Criar "${t}"`}
              />
              <CampoTexto
                control={form.control}
                name="data_solicitacao"
                label="Data da solicitação"
                type="date"
              />
              <CampoSelect
                control={form.control}
                name="prioridade"
                label="Prioridade"
                placeholder="Selecione"
                opcoes={OPCOES_PRIORIDADE}
              />
              <CampoSelect
                control={form.control}
                name="operador_id"
                label="Operador responsável (opcional)"
                placeholder="Selecione"
                opcoes={opcoesOperador}
              />
              <CampoTexto
                control={form.control}
                name="data_limite"
                label="Data limite (opcional)"
                type="date"
              />
              <CampoTexto
                control={form.control}
                name="classificacao"
                label="Classificação (opcional)"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Dados do fato</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <CampoTexto control={form.control} name="data_fato" label="Data do fato (opcional)" type="date" />
              <CampoTexto
                control={form.control}
                name="hora_aproximada"
                label="Hora aproximada (opcional)"
                type="time"
              />
              <CampoComboboxCriavel
                control={form.control}
                name="local_id"
                label="Local (opcional)"
                placeholder="Selecione ou crie"
                opcoes={opcoesLocal}
                aoCriar={aoCriarLocal}
                rotuloCriar={(t) => `Criar local "${t}"`}
              />
              <CampoComboboxCriavel
                control={form.control}
                name="tipo_ocorrencia_id"
                label="Tipo da ocorrência (opcional)"
                placeholder="Selecione ou crie"
                opcoes={opcoesTipoOcorrencia}
                aoCriar={aoCriarTipoOcorrencia}
                rotuloCriar={(t) => `Criar "${t}"`}
              />
              <div className="sm:col-span-2">
                <CampoTextarea
                  control={form.control}
                  name="descricao_fato"
                  label="Descrição do ocorrido"
                  placeholder="Descreva o que ocorreu"
                />
              </div>
              <div className="sm:col-span-2">
                <CampoTextarea
                  control={form.control}
                  name="pessoas_envolvidas"
                  label="Pessoas envolvidas (opcional)"
                />
              </div>
              <div className="sm:col-span-2">
                <CampoTextarea
                  control={form.control}
                  name="observacoes_fato"
                  label="Observações (opcional)"
                />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" disabled={criar.isPending} className="self-start">
            {criar.isPending && <Loader2 className="size-4 animate-spin" />}
            Criar relatório
          </Button>
        </form>
      </Form>
    </div>
  );
}
