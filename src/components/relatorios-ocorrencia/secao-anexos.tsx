"use client";

import { useRef } from "react";
import {
  File as FileIcon,
  Image as ImageIcon,
  Loader2,
  Paperclip,
  Trash2,
  Video,
} from "lucide-react";
import {
  useAnexosRelatorio,
  useEnviarAnexoRelatorio,
  useRemoverAnexoRelatorio,
} from "@/hooks/use-relatorio-anexos";
import { urlAssinadaAnexoRelatorio } from "@/services/relatorio-anexos";
import { useTenant } from "@/components/tenant-branding";
import type { RelatorioAnexo } from "@/types/relatorios-ocorrencia";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

function IconeAnexo({ tipo }: { tipo: RelatorioAnexo["tipo"] }) {
  if (tipo === "foto") return <ImageIcon className="size-4" />;
  if (tipo === "video") return <Video className="size-4" />;
  return <FileIcon className="size-4" />;
}

export function SecaoAnexos({
  relatorioId,
  editavel,
  podeExcluir,
}: {
  relatorioId: string;
  /** Permissão `editar`: anexar e substituir. Não dá direito de apagar. */
  editavel: boolean;
  /** Permissão `excluir`, independente de `editar` na matriz. Espelha as
      policies de `relatorio_anexos` e do bucket `anexos-relatorios`. */
  podeExcluir: boolean;
}) {
  const tenant = useTenant();
  const { data: anexos, isPending } = useAnexosRelatorio(relatorioId);
  const enviar = useEnviarAnexoRelatorio(relatorioId);
  const remover = useRemoverAnexoRelatorio(relatorioId);
  const inputRef = useRef<HTMLInputElement>(null);

  async function abrirAnexo(anexo: RelatorioAnexo) {
    const url = await urlAssinadaAnexoRelatorio(anexo.storage_path);
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
              accept="image/*,video/*,application/pdf,.doc,.docx,.txt"
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
                {podeExcluir && (
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
