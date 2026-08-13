"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  useCriarExportacao,
  useExcluirExportacao,
  useExportacoesRelatorio,
} from "@/hooks/use-relatorio-exportacoes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Form } from "@/components/ui/form";
import { CampoTexto, CampoTextarea } from "@/components/cadastros/campos-formulario";

const fmtData = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" });

const schemaExportacao = z.object({
  data_exportacao: z.string().min(1, "Informe a data"),
  hora_exportacao: z.string(),
  cameras_exportadas: z.string(),
  formato: z.string(),
  tamanho: z.string(),
  destino: z.string(),
  hash: z.string(),
  observacoes: z.string(),
});
type FormExportacao = z.infer<typeof schemaExportacao>;

const valoresPadrao: FormExportacao = {
  data_exportacao: new Date().toISOString().slice(0, 10),
  hora_exportacao: "",
  cameras_exportadas: "",
  formato: "",
  tamanho: "",
  destino: "",
  hash: "",
  observacoes: "",
};

export function SecaoExportacoes({
  relatorioId,
  editavel,
  podeExcluir,
}: {
  relatorioId: string;
  /** Permissão `editar`: registrar uma exportação nova. Não dá direito de
      apagar registro existente. */
  editavel: boolean;
  /** Permissão `excluir`, independente de `editar` na matriz. Espelha a
      policy `t_exclusao` de `relatorio_exportacoes`. */
  podeExcluir: boolean;
}) {
  const { data: exportacoes, isPending } = useExportacoesRelatorio(relatorioId);
  const criar = useCriarExportacao(relatorioId);
  const excluir = useExcluirExportacao(relatorioId);
  const [aberto, setAberto] = useState(false);

  const form = useForm<FormExportacao>({
    resolver: zodResolver(schemaExportacao),
    defaultValues: valoresPadrao,
  });

  function onSubmit(v: FormExportacao) {
    criar.mutate(
      {
        relatorio_id: relatorioId,
        data_exportacao: v.data_exportacao,
        hora_exportacao: v.hora_exportacao || null,
        operador_id: null,
        cameras_exportadas: v.cameras_exportadas || null,
        periodo_inicio: null,
        periodo_fim: null,
        formato: v.formato || null,
        tamanho: v.tamanho || null,
        destino: v.destino || null,
        hash: v.hash || null,
        observacoes: v.observacoes || null,
      },
      {
        onSuccess: () => {
          setAberto(false);
          form.reset(valoresPadrao);
        },
      }
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm">Exportações de imagens</CardTitle>
        {editavel && (
          <Dialog open={aberto} onOpenChange={setAberto}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="size-4" />
                Nova exportação
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
                  <DialogHeader>
                    <DialogTitle>Registrar exportação</DialogTitle>
                  </DialogHeader>
                  <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto pr-1">
                    <div className="grid grid-cols-2 gap-4">
                      <CampoTexto
                        control={form.control}
                        name="data_exportacao"
                        label="Data"
                        type="date"
                      />
                      <CampoTexto
                        control={form.control}
                        name="hora_exportacao"
                        label="Hora (opcional)"
                        type="time"
                      />
                    </div>
                    <CampoTexto
                      control={form.control}
                      name="cameras_exportadas"
                      label="Câmeras exportadas"
                      placeholder="Ex.: 34, 108, 149"
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <CampoTexto control={form.control} name="formato" label="Formato" placeholder="Ex.: MP4" />
                      <CampoTexto control={form.control} name="tamanho" label="Tamanho" placeholder="Ex.: 2 GB" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <CampoTexto
                        control={form.control}
                        name="destino"
                        label="Destino"
                        placeholder="Ex.: HD externo, CD/DVD"
                      />
                      <CampoTexto
                        control={form.control}
                        name="hash"
                        label="Hash (opcional)"
                      />
                    </div>
                    <CampoTextarea control={form.control} name="observacoes" label="Observações" />
                  </div>
                  <DialogFooter>
                    <Button type="submit" disabled={criar.isPending}>
                      {criar.isPending && <Loader2 className="size-4 animate-spin" />}
                      Salvar
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {isPending ? (
          <div className="p-4">
            <Skeleton className="h-16 w-full" />
          </div>
        ) : !exportacoes || exportacoes.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">Nenhuma exportação registrada</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Câmeras</TableHead>
                  <TableHead>Formato</TableHead>
                  <TableHead>Destino</TableHead>
                  {/* A coluna de ações só tem o botão de excluir — segue
                      a permissão dele, não a de editar. */}
                  {podeExcluir && <TableHead aria-label="Ações" />}
                </TableRow>
              </TableHeader>
              <TableBody>
                {exportacoes.map((ex) => (
                  <TableRow key={ex.id}>
                    <TableCell className="whitespace-nowrap tabular-nums">
                      {fmtData.format(new Date(`${ex.data_exportacao}T00:00:00`))}
                      {ex.hora_exportacao ? ` ${ex.hora_exportacao.slice(0, 5)}` : ""}
                    </TableCell>
                    <TableCell>{ex.cameras_exportadas ?? "—"}</TableCell>
                    <TableCell>{ex.formato ?? "—"}</TableCell>
                    <TableCell>{ex.destino ?? "—"}</TableCell>
                    {podeExcluir && (
                      <TableCell className="w-10">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Excluir exportação"
                          onClick={() => excluir.mutate(ex.id)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
