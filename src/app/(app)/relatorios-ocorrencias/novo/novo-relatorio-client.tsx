"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useCriarRelatorioOcorrencia } from "@/hooks/use-relatorios-ocorrencia";
import { hooksPredios } from "@/hooks/use-cadastros";
import {
  idDoDepartamento,
  idDoLocal,
  idDoSolicitante,
  idDoTipoOcorrencia,
  idDoTipoSolicitacao,
} from "@/services/catalogo-por-nome";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import {
  CampoSelect,
  CampoTexto,
  CampoTextarea,
} from "@/components/cadastros/campos-formulario";

/** Único campo com opções fechadas do formulário. O operador não cria
    outros tipos — a CMAL trabalha só com estes dois. */
const TIPOS_SOLICITACAO = ["Análise de Imagens", "Preservação de Imagens"] as const;

const OPCOES_TIPO_SOLICITACAO = TIPOS_SOLICITACAO.map((t) => ({ valor: t, rotulo: t }));

// Só o tipo de solicitação trava o envio. Todo o resto é texto livre e pode
// ficar em branco: o operador da CMAL abre o relatório com o que tem na mão
// e completa durante a investigação.
const schemaNovo = z.object({
  // começa vazio de propósito: é a única escolha que o operador precisa
  // fazer conscientemente ao abrir o relatório
  tipo_solicitacao: z
    .string()
    .refine((v) => (TIPOS_SOLICITACAO as readonly string[]).includes(v), {
      message: "Selecione o tipo de solicitação",
    }),
  numero_memorando: z.string(),
  solicitante: z.string(),
  departamento: z.string(),
  data_solicitacao: z.string(),
  data_limite: z.string(),
  data_fato: z.string(),
  hora_aproximada: z.string(),
  local: z.string(),
  tipo_ocorrencia: z.string(),
  descricao_fato: z.string(),
  pessoas_envolvidas: z.string(),
});
type FormNovo = z.infer<typeof schemaNovo>;

const hoje = () => new Date().toISOString().slice(0, 10);

const valoresPadrao: FormNovo = {
  tipo_solicitacao: "",
  numero_memorando: "",
  solicitante: "",
  departamento: "",
  data_solicitacao: hoje(),
  data_limite: "",
  data_fato: "",
  hora_aproximada: "",
  local: "",
  tipo_ocorrencia: "",
  descricao_fato: "",
  pessoas_envolvidas: "",
};

export function NovoRelatorioClient() {
  const router = useRouter();
  const criar = useCriarRelatorioOcorrencia();
  const { data: predios } = hooksPredios.useListar();
  // cobre as duas etapas do envio: resolver os catálogos e gravar o relatório
  const [salvando, setSalvando] = useState(false);

  const form = useForm<FormNovo>({
    resolver: zodResolver(schemaNovo),
    defaultValues: valoresPadrao,
  });

  async function onSubmit(v: FormNovo) {
    setSalvando(true);
    try {
      // Texto digitado -> id de catálogo (reaproveita ou cria). Em paralelo:
      // são cinco consultas independentes entre si.
      const [tipoSolicitacaoId, solicitanteId, departamentoId, localId, tipoOcorrenciaId] =
        await Promise.all([
          idDoTipoSolicitacao(v.tipo_solicitacao),
          idDoSolicitante(v.solicitante),
          idDoDepartamento(v.departamento),
          idDoLocal(v.local, predios?.[0]?.id),
          idDoTipoOcorrencia(v.tipo_ocorrencia),
        ]);

      const relatorio = await criar.mutateAsync({
        tipo_solicitacao_id: tipoSolicitacaoId,
        solicitante_id: solicitanteId,
        departamento_id: departamentoId,
        local_id: localId,
        tipo_ocorrencia_id: tipoOcorrenciaId,
        numero_memorando: v.numero_memorando.trim() || null,
        // colunas NOT NULL: caem no padrão em vez de bloquear o envio
        data_solicitacao: v.data_solicitacao || hoje(),
        descricao_fato: v.descricao_fato,
        data_limite: v.data_limite || null,
        data_fato: v.data_fato || null,
        hora_aproximada: v.hora_aproximada || null,
        pessoas_envolvidas: v.pessoas_envolvidas.trim() || null,
      });

      router.push(`/relatorios-ocorrencias/${relatorio.id}`);
    } catch (e) {
      // erro de gravação já vira toast no hook; aqui cobre a resolução dos catálogos
      if (!criar.isError) {
        toast.error("Não foi possível criar o relatório", {
          description: (e as Error).message,
        });
      }
      setSalvando(false);
    }
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
            Registre o que já se sabe — os demais dados podem ser completados durante a
            investigação.
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
              <CampoTexto
                control={form.control}
                name="numero_memorando"
                label="Número do memorando"
              />
              <CampoSelect
                control={form.control}
                name="tipo_solicitacao"
                label="Tipo de solicitação"
                placeholder="Selecione"
                opcoes={OPCOES_TIPO_SOLICITACAO}
              />
              <CampoTexto control={form.control} name="solicitante" label="Solicitante" />
              <CampoTexto control={form.control} name="departamento" label="Departamento" />
              <CampoTexto
                control={form.control}
                name="data_solicitacao"
                label="Data da solicitação"
                type="date"
              />
              <CampoTexto
                control={form.control}
                name="data_limite"
                label="Data limite"
                type="date"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Dados do fato</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <CampoTexto
                control={form.control}
                name="data_fato"
                label="Data do fato"
                type="date"
              />
              <CampoTexto
                control={form.control}
                name="hora_aproximada"
                label="Hora aproximada"
                type="time"
              />
              <CampoTexto control={form.control} name="local" label="Local" />
              <CampoTexto
                control={form.control}
                name="tipo_ocorrencia"
                label="Tipo da ocorrência"
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
                  label="Pessoas envolvidas"
                />
              </div>
            </CardContent>
          </Card>

          <Button type="submit" disabled={salvando} className="self-start">
            {salvando && <Loader2 className="size-4 animate-spin" />}
            Criar relatório
          </Button>
        </form>
      </Form>
    </div>
  );
}
