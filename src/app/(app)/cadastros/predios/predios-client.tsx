"use client";

import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Predio } from "@/types/domain";
import { hooksPredios } from "@/hooks/use-cadastros";
import { PaginaCrud, type ColunaCrud } from "@/components/cadastros/pagina-crud";
import { CampoTexto } from "@/components/cadastros/campos-formulario";

const schema = z.object({
  nome: z.string().min(1, "Informe o nome"),
  sigla: z.string(),
});
type Form = z.infer<typeof schema>;

const valoresPadrao: Form = { nome: "", sigla: "" };

const colunas: ColunaCrud<Predio>[] = [
  { chave: "nome", rotulo: "Nome", render: (p) => p.nome },
  { chave: "sigla", rotulo: "Sigla", render: (p) => p.sigla ?? "—" },
];

export function PrediosClient() {
  return (
    <PaginaCrud<Predio, Form>
      titulo="Prédios"
      descricao="Prédios do Complexo ALESP onde há câmeras instaladas"
      hooks={hooksPredios}
      colunas={colunas}
      resolver={zodResolver(schema)}
      valoresPadrao={valoresPadrao}
      paraFormulario={(p) => ({ nome: p.nome, sigla: p.sigla ?? "" })}
      normalizar={(v) => ({ nome: v.nome, sigla: v.sigla || null })}
      buscar={(p, termo) =>
        p.nome.toLowerCase().includes(termo) ||
        (p.sigla ?? "").toLowerCase().includes(termo)
      }
      rotuloItem={(p) => p.nome}
      campos={(form) => (
        <>
          <CampoTexto control={form.control} name="nome" label="Nome" placeholder="Ex.: Anexo I" />
          <CampoTexto control={form.control} name="sigla" label="Sigla (opcional)" placeholder="Ex.: A1" />
        </>
      )}
    />
  );
}
