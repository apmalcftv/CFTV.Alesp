"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Badge } from "@/components/ui/badge";
import type { Empresa } from "@/types/domain";
import { hooksEmpresas } from "@/hooks/use-cadastros";
import { PaginaCrud, type ColunaCrud } from "@/components/cadastros/pagina-crud";
import { CampoCheckbox, CampoTexto } from "@/components/cadastros/campos-formulario";

const schema = z.object({
  nome: z.string().min(1, "Informe o nome"),
  cnpj: z.string(),
  contato: z.string(),
  ativa: z.boolean(),
});
type Form = z.infer<typeof schema>;

const valoresPadrao: Form = { nome: "", cnpj: "", contato: "", ativa: true };

const colunas: ColunaCrud<Empresa>[] = [
  { chave: "nome", rotulo: "Nome", render: (e) => e.nome },
  { chave: "cnpj", rotulo: "CNPJ", render: (e) => e.cnpj ?? "—" },
  { chave: "contato", rotulo: "Contato", render: (e) => e.contato ?? "—" },
  {
    chave: "ativa",
    rotulo: "Status",
    render: (e) =>
      e.ativa ? (
        <Badge variant="outline" className="border-success/20 bg-success/10 text-success">
          Ativa
        </Badge>
      ) : (
        <Badge variant="outline" className="text-muted-foreground">
          Inativa
        </Badge>
      ),
  },
];

export function EmpresasClient() {
  return (
    <PaginaCrud<Empresa, Form>
      titulo="Empresas"
      descricao="Empresas terceirizadas de manutenção do CFTV"
      hooks={hooksEmpresas}
      colunas={colunas}
      resolver={zodResolver(schema)}
      valoresPadrao={valoresPadrao}
      paraFormulario={(e) => ({
        nome: e.nome,
        cnpj: e.cnpj ?? "",
        contato: e.contato ?? "",
        ativa: e.ativa,
      })}
      normalizar={(v) => ({
        nome: v.nome,
        cnpj: v.cnpj || null,
        contato: v.contato || null,
        ativa: v.ativa,
      })}
      buscar={(e, termo) =>
        e.nome.toLowerCase().includes(termo) ||
        (e.cnpj ?? "").toLowerCase().includes(termo)
      }
      rotuloItem={(e) => e.nome}
      campos={(form) => (
        <>
          <CampoTexto control={form.control} name="nome" label="Nome" placeholder="Ex.: INFOGOOGLE" />
          <CampoTexto control={form.control} name="cnpj" label="CNPJ (opcional)" />
          <CampoTexto control={form.control} name="contato" label="Contato (opcional)" placeholder="Telefone ou e-mail" />
          <CampoCheckbox control={form.control} name="ativa" label="Empresa ativa" />
        </>
      )}
    />
  );
}
