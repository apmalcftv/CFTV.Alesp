"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { TIPO_MODELO_OPCOES, type ModeloCamera } from "@/types/domain";
import { hooksFabricantes, hooksModelos } from "@/hooks/use-cadastros";
import { PaginaCrud, type ColunaCrud } from "@/components/cadastros/pagina-crud";
import { CampoSelect, CampoTexto } from "@/components/cadastros/campos-formulario";

const schema = z.object({
  fabricante_id: z.string().min(1, "Selecione o fabricante"),
  nome: z.string().min(1, "Informe o nome"),
  tipo: z.string(),
});
type Form = z.infer<typeof schema>;

const valoresPadrao: Form = { fabricante_id: "", nome: "", tipo: "" };

export function ModelosClient() {
  const { data: fabricantes } = hooksFabricantes.useListar();
  const opcoesFabricante = (fabricantes ?? []).map((f) => ({ valor: f.id, rotulo: f.nome }));
  const nomeFabricante = (id: string) =>
    fabricantes?.find((f) => f.id === id)?.nome ?? "—";

  const colunas: ColunaCrud<ModeloCamera>[] = [
    { chave: "nome", rotulo: "Modelo", render: (m) => m.nome },
    { chave: "fabricante", rotulo: "Fabricante", render: (m) => nomeFabricante(m.fabricante_id) },
    { chave: "tipo", rotulo: "Tipo", render: (m) => m.tipo ?? "—" },
  ];

  return (
    <PaginaCrud<ModeloCamera, Form>
      recurso="cameras_modelos"
      titulo="Modelos de câmera"
      descricao="Modelos de câmera por fabricante"
      hooks={hooksModelos}
      colunas={colunas}
      resolver={zodResolver(schema)}
      valoresPadrao={valoresPadrao}
      paraFormulario={(m) => ({
        fabricante_id: m.fabricante_id,
        nome: m.nome,
        tipo: m.tipo ?? "",
      })}
      normalizar={(v) => ({
        fabricante_id: v.fabricante_id,
        nome: v.nome,
        tipo: v.tipo || null,
      })}
      buscar={(m, termo) =>
        m.nome.toLowerCase().includes(termo) ||
        nomeFabricante(m.fabricante_id).toLowerCase().includes(termo)
      }
      rotuloItem={(m) => m.nome}
      campos={(form) => (
        <>
          <CampoSelect
            control={form.control}
            name="fabricante_id"
            label="Fabricante"
            placeholder="Selecione o fabricante"
            opcoes={opcoesFabricante}
          />
          <CampoTexto control={form.control} name="nome" label="Modelo" placeholder="Ex.: VIP 3230 B" />
          <CampoSelect
            control={form.control}
            name="tipo"
            label="Tipo (opcional)"
            placeholder="Selecione o tipo"
            opcoes={TIPO_MODELO_OPCOES.map((t) => ({ valor: t, rotulo: t }))}
          />
        </>
      )}
    />
  );
}
