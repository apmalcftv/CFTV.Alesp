"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Badge } from "@/components/ui/badge";
import type { Tecnico } from "@/types/domain";
import { hooksEmpresas, hooksTecnicos } from "@/hooks/use-cadastros";
import { PaginaCrud, type ColunaCrud } from "@/components/cadastros/pagina-crud";
import { CampoCheckbox, CampoSelect, CampoTexto } from "@/components/cadastros/campos-formulario";

const schema = z.object({
  empresa_id: z.string().min(1, "Selecione a empresa"),
  nome: z.string().min(1, "Informe o nome"),
  ativo: z.boolean(),
});
type Form = z.infer<typeof schema>;

const valoresPadrao: Form = { empresa_id: "", nome: "", ativo: true };

export function TecnicosClient() {
  const { data: empresas } = hooksEmpresas.useListar();
  const opcoesEmpresa = (empresas ?? []).map((e) => ({ valor: e.id, rotulo: e.nome }));
  const nomeEmpresa = (id: string) => empresas?.find((e) => e.id === id)?.nome ?? "—";

  const colunas: ColunaCrud<Tecnico>[] = [
    { chave: "nome", rotulo: "Nome", render: (t) => t.nome },
    { chave: "empresa", rotulo: "Empresa", render: (t) => nomeEmpresa(t.empresa_id) },
    {
      chave: "ativo",
      rotulo: "Status",
      render: (t) =>
        t.ativo ? (
          <Badge variant="outline" className="border-success/20 bg-success/10 text-success">
            Ativo
          </Badge>
        ) : (
          <Badge variant="outline" className="text-muted-foreground">
            Inativo
          </Badge>
        ),
    },
  ];

  return (
    <PaginaCrud<Tecnico, Form>
      recurso="cameras_tecnicos"
      titulo="Técnicos"
      descricao="Técnicos das empresas de manutenção"
      hooks={hooksTecnicos}
      colunas={colunas}
      resolver={zodResolver(schema)}
      valoresPadrao={valoresPadrao}
      paraFormulario={(t) => ({ empresa_id: t.empresa_id, nome: t.nome, ativo: t.ativo })}
      normalizar={(v) => ({ empresa_id: v.empresa_id, nome: v.nome, ativo: v.ativo })}
      buscar={(t, termo) =>
        t.nome.toLowerCase().includes(termo) ||
        nomeEmpresa(t.empresa_id).toLowerCase().includes(termo)
      }
      rotuloItem={(t) => t.nome}
      campos={(form) => (
        <>
          <CampoSelect
            control={form.control}
            name="empresa_id"
            label="Empresa"
            placeholder="Selecione a empresa"
            opcoes={opcoesEmpresa}
          />
          <CampoTexto control={form.control} name="nome" label="Nome" placeholder="Ex.: Eduardo" />
          <CampoCheckbox control={form.control} name="ativo" label="Técnico ativo" />
        </>
      )}
    />
  );
}
