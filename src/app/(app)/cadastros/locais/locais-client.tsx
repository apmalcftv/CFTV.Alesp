"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { TIPO_AREA_OPCOES, type Local } from "@/types/domain";
import { hooksLocais, hooksPredios } from "@/hooks/use-cadastros";
import { PaginaCrud, type ColunaCrud } from "@/components/cadastros/pagina-crud";
import { CampoSelect, CampoTexto } from "@/components/cadastros/campos-formulario";

const schema = z.object({
  predio_id: z.string().min(1, "Selecione o prédio"),
  nome: z.string().min(1, "Informe o nome"),
  andar: z.string(),
  tipo_area: z.string(),
});
type Form = z.infer<typeof schema>;

const valoresPadrao: Form = { predio_id: "", nome: "", andar: "", tipo_area: "" };

export function LocaisClient() {
  const { data: predios } = hooksPredios.useListar();
  const opcoesPredio = (predios ?? []).map((p) => ({ valor: p.id, rotulo: p.nome }));
  const nomePredio = (id: string) => predios?.find((p) => p.id === id)?.nome ?? "—";

  const colunas: ColunaCrud<Local>[] = [
    { chave: "nome", rotulo: "Nome", render: (l) => l.nome },
    { chave: "predio", rotulo: "Prédio", render: (l) => nomePredio(l.predio_id) },
    { chave: "andar", rotulo: "Andar", render: (l) => l.andar ?? "—" },
    { chave: "tipo_area", rotulo: "Tipo de área", render: (l) => l.tipo_area ?? "—" },
  ];

  return (
    <PaginaCrud<Local, Form>
      recurso="cameras_locais"
      titulo="Locais"
      descricao="Locais dentro de cada prédio onde as câmeras estão instaladas"
      hooks={hooksLocais}
      colunas={colunas}
      resolver={zodResolver(schema)}
      valoresPadrao={valoresPadrao}
      paraFormulario={(l) => ({
        predio_id: l.predio_id,
        nome: l.nome,
        andar: l.andar ?? "",
        tipo_area: l.tipo_area ?? "",
      })}
      normalizar={(v) => ({
        predio_id: v.predio_id,
        nome: v.nome,
        andar: v.andar || null,
        tipo_area: v.tipo_area || null,
      })}
      buscar={(l, termo) =>
        l.nome.toLowerCase().includes(termo) ||
        nomePredio(l.predio_id).toLowerCase().includes(termo)
      }
      rotuloItem={(l) => l.nome}
      campos={(form) => (
        <>
          <CampoSelect
            control={form.control}
            name="predio_id"
            label="Prédio"
            placeholder="Selecione o prédio"
            opcoes={opcoesPredio}
          />
          <CampoTexto control={form.control} name="nome" label="Nome" placeholder="Ex.: Corredor 3º andar" />
          <CampoTexto control={form.control} name="andar" label="Andar (opcional)" placeholder="Ex.: 3º" />
          <CampoSelect
            control={form.control}
            name="tipo_area"
            label="Tipo de área (opcional)"
            placeholder="Selecione o tipo"
            opcoes={TIPO_AREA_OPCOES.map((t) => ({ valor: t, rotulo: t }))}
          />
        </>
      )}
    />
  );
}
