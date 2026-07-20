"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Nvr } from "@/types/domain";
import { hooksLocais, hooksNvrs } from "@/hooks/use-cadastros";
import { PaginaCrud, type ColunaCrud } from "@/components/cadastros/pagina-crud";
import { CampoSelect, CampoTexto } from "@/components/cadastros/campos-formulario";

const schema = z.object({
  nome: z.string().min(1, "Informe o nome"),
  ip: z.string(),
  local_id: z.string(),
  canais: z.string(),
});
type Form = z.infer<typeof schema>;

const valoresPadrao: Form = { nome: "", ip: "", local_id: "", canais: "" };

export function NvrsClient() {
  const { data: locais } = hooksLocais.useListar();
  const opcoesLocal = (locais ?? []).map((l) => ({ valor: l.id, rotulo: l.nome }));
  const nomeLocal = (id: string | null) =>
    id ? (locais?.find((l) => l.id === id)?.nome ?? "—") : "—";

  const colunas: ColunaCrud<Nvr>[] = [
    { chave: "nome", rotulo: "Nome", render: (n) => n.nome },
    { chave: "ip", rotulo: "IP", render: (n) => n.ip ?? "—" },
    { chave: "local", rotulo: "Local", render: (n) => nomeLocal(n.local_id) },
    { chave: "canais", rotulo: "Canais", render: (n) => n.canais ?? "—", className: "text-right" },
  ];

  return (
    <PaginaCrud<Nvr, Form>
      titulo="NVRs"
      descricao="Gravadores de vídeo em rede (NVRs) do circuito"
      hooks={hooksNvrs}
      colunas={colunas}
      resolver={zodResolver(schema)}
      valoresPadrao={valoresPadrao}
      paraFormulario={(n) => ({
        nome: n.nome,
        ip: n.ip ?? "",
        local_id: n.local_id ?? "",
        canais: n.canais != null ? String(n.canais) : "",
      })}
      normalizar={(v) => ({
        nome: v.nome,
        ip: v.ip || null,
        local_id: v.local_id || null,
        canais: v.canais ? Number(v.canais) : null,
      })}
      buscar={(n, termo) =>
        n.nome.toLowerCase().includes(termo) ||
        (n.ip ?? "").toLowerCase().includes(termo)
      }
      rotuloItem={(n) => n.nome}
      campos={(form) => (
        <>
          <CampoTexto control={form.control} name="nome" label="Nome" placeholder="Ex.: NVR Anexo I" />
          <CampoTexto control={form.control} name="ip" label="IP (opcional)" placeholder="192.168.0.10" />
          <CampoSelect
            control={form.control}
            name="local_id"
            label="Local (opcional)"
            placeholder="Selecione o local"
            opcoes={opcoesLocal}
          />
          <CampoTexto control={form.control} name="canais" label="Canais (opcional)" type="number" />
        </>
      )}
    />
  );
}
