"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Fabricante } from "@/types/domain";
import { hooksFabricantes } from "@/hooks/use-cadastros";
import { PaginaCrud, type ColunaCrud } from "@/components/cadastros/pagina-crud";
import { CampoTexto } from "@/components/cadastros/campos-formulario";

const schema = z.object({
  nome: z.string().min(1, "Informe o nome"),
});
type Form = z.infer<typeof schema>;

const valoresPadrao: Form = { nome: "" };

const colunas: ColunaCrud<Fabricante>[] = [
  { chave: "nome", rotulo: "Nome", render: (f) => f.nome },
];

export function FabricantesClient() {
  return (
    <PaginaCrud<Fabricante, Form>
      recurso="cameras_fabricantes"
      titulo="Fabricantes"
      descricao="Fabricantes das câmeras (Intelbras, Hikvision, etc.)"
      hooks={hooksFabricantes}
      colunas={colunas}
      resolver={zodResolver(schema)}
      valoresPadrao={valoresPadrao}
      paraFormulario={(f) => ({ nome: f.nome })}
      normalizar={(v) => ({ nome: v.nome })}
      buscar={(f, termo) => f.nome.toLowerCase().includes(termo)}
      rotuloItem={(f) => f.nome}
      campos={(form) => (
        <CampoTexto control={form.control} name="nome" label="Nome" placeholder="Ex.: Intelbras" />
      )}
    />
  );
}
