"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  CAMERA_STATUS_LABEL,
  CATEGORIA_DEFEITO_OPCOES,
  type CameraStatus,
  type TipoDefeito,
} from "@/types/domain";
import { hooksTiposDefeito } from "@/hooks/use-cadastros";
import { PaginaCrud, type ColunaCrud } from "@/components/cadastros/pagina-crud";
import { CampoSelect, CampoTexto } from "@/components/cadastros/campos-formulario";
import { BadgeStatusCamera } from "@/components/dashboard/badges";

const schema = z.object({
  nome: z.string().min(1, "Informe o nome"),
  categoria: z.string(),
  status_camera: z.string().min(1, "Selecione o status"),
});
type Form = z.infer<typeof schema>;

const valoresPadrao: Form = {
  nome: "",
  categoria: "",
  status_camera: "degradada",
};

/** Câmera em manutenção/desligada permanentemente nunca é resultado da
    abertura de uma OS — são estados escolhidos manualmente. */
const STATUS_APLICAVEIS: CameraStatus[] = [
  "degradada",
  "inoperante",
  "desligada",
];

const colunas: ColunaCrud<TipoDefeito>[] = [
  { chave: "nome", rotulo: "Defeito", render: (d) => d.nome },
  { chave: "categoria", rotulo: "Categoria", render: (d) => d.categoria ?? "—" },
  {
    chave: "status_camera",
    rotulo: "Status da câmera",
    render: (d) => <BadgeStatusCamera status={d.status_camera} />,
  },
];

export function DefeitosClient() {
  return (
    <PaginaCrud<TipoDefeito, Form>
      titulo="Tipos de defeito"
      descricao="Categorias de defeito usadas na abertura de ocorrências. O status da câmera é aplicado automaticamente enquanto a OS estiver aberta."
      hooks={hooksTiposDefeito}
      colunas={colunas}
      resolver={zodResolver(schema)}
      valoresPadrao={valoresPadrao}
      paraFormulario={(d) => ({
        nome: d.nome,
        categoria: d.categoria ?? "",
        status_camera: d.status_camera,
      })}
      normalizar={(v) => ({
        nome: v.nome,
        categoria: v.categoria || null,
        status_camera: v.status_camera as CameraStatus,
      })}
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
          <CampoSelect
            control={form.control}
            name="status_camera"
            label="Status da câmera ao abrir a ocorrência"
            placeholder="Selecione o status"
            opcoes={STATUS_APLICAVEIS.map((s) => ({
              valor: s,
              rotulo: CAMERA_STATUS_LABEL[s],
            }))}
          />
        </>
      )}
    />
  );
}
