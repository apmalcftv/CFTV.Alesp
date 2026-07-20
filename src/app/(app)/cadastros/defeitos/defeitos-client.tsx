"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { CATEGORIA_DEFEITO_OPCOES, type TipoDefeito } from "@/types/domain";
import { hooksTiposDefeito } from "@/hooks/use-cadastros";
import { PaginaCrud, type ColunaCrud } from "@/components/cadastros/pagina-crud";
import { CampoSelect, CampoTexto } from "@/components/cadastros/campos-formulario";

const schema = z.object({
  nome: z.string().min(1, "Informe o nome"),
  categoria: z.string(),
});
type Form = z.infer<typeof schema>;

const valoresPadrao: Form = { nome: "", categoria: "" };

const colunas: ColunaCrud<TipoDefeito>[] = [
  { chave: "nome", rotulo: "Defeito", render: (d) => d.nome },
  { chave: "categoria", rotulo: "Categoria", render: (d) => d.categoria ?? "—" },
];

export function DefeitosClient() {
  return (
    <PaginaCrud<TipoDefeito, Form>
      titulo="Tipos de defeito"
      descricao="Categorias de defeito usadas na abertura de ocorrências"
      hooks={hooksTiposDefeito}
      colunas={colunas}
      resolver={zodResolver(schema)}
      valoresPadrao={valoresPadrao}
      paraFormulario={(d) => ({ nome: d.nome, categoria: d.categoria ?? "" })}
      normalizar={(v) => ({ nome: v.nome, categoria: v.categoria || null })}
      buscar={(d, termo) => d.nome.toLowerCase().includes(termo)}
      rotuloItem={(d) => d.nome}
      campos={(form) => (
        <>
          <CampoTexto control={form.control} name="nome" label="Nome do defeito" placeholder="Ex.: Sem imagem" />
          <CampoSelect
            control={form.control}
            name="categoria"
            label="Categoria (opcional)"
            placeholder="Selecione a categoria"
            opcoes={CATEGORIA_DEFEITO_OPCOES.map((c) => ({ valor: c, rotulo: c }))}
          />
        </>
      )}
    />
  );
}
