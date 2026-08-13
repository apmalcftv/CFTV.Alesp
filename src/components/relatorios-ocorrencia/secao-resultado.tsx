"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";
import { useAtualizarRelatorioOcorrencia } from "@/hooks/use-relatorios-ocorrencia";
import type { RelatorioOcorrenciaDetalhe } from "@/services/relatorios-ocorrencia";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form } from "@/components/ui/form";
import { CampoTexto, CampoTextarea } from "@/components/cadastros/campos-formulario";

const schemaResultado = z.object({
  conclusao: z.string(),
  providencias_adotadas: z.string(),
  data_conclusao: z.string(),
});
type FormResultado = z.infer<typeof schemaResultado>;

export function SecaoResultado({
  relatorio,
  editavel,
}: {
  relatorio: RelatorioOcorrenciaDetalhe;
  editavel: boolean;
}) {
  const atualizar = useAtualizarRelatorioOcorrencia(relatorio.id);

  const form = useForm<FormResultado>({
    resolver: zodResolver(schemaResultado),
    values: {
      conclusao: relatorio.conclusao ?? "",
      providencias_adotadas: relatorio.providencias_adotadas ?? "",
      data_conclusao: relatorio.data_conclusao ?? "",
    },
  });

  function onSubmit(v: FormResultado) {
    atualizar.mutate({
      conclusao: v.conclusao || null,
      providencias_adotadas: v.providencias_adotadas || null,
      data_conclusao: v.data_conclusao || null,
    });
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm">Resultado</CardTitle>
      </CardHeader>
      <CardContent>
        {editavel ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
              <CampoTextarea control={form.control} name="conclusao" label="Conclusão" />
              <CampoTextarea
                control={form.control}
                name="providencias_adotadas"
                label="Providências adotadas"
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <CampoTexto
                  control={form.control}
                  name="data_conclusao"
                  label="Data da conclusão (opcional)"
                  type="date"
                />
              </div>
              <Button type="submit" disabled={atualizar.isPending} className="self-start">
                {atualizar.isPending && <Loader2 className="size-4 animate-spin" />}
                Salvar
              </Button>
            </form>
          </Form>
        ) : (
          <dl className="flex flex-col gap-4 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Conclusão</dt>
              <dd className="whitespace-pre-wrap">{relatorio.conclusao || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Providências adotadas</dt>
              <dd className="whitespace-pre-wrap">{relatorio.providencias_adotadas || "—"}</dd>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs text-muted-foreground">Data da conclusão</dt>
                <dd>
                  {relatorio.data_conclusao
                    ? new Date(`${relatorio.data_conclusao}T00:00:00`).toLocaleDateString("pt-BR")
                    : "—"}
                </dd>
              </div>
            </div>
          </dl>
        )}
      </CardContent>
    </Card>
  );
}
