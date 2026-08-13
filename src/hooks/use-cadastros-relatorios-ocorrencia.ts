// Hooks React Query dos catálogos do módulo CMAL.
//
// Tipo de solicitação e Tipo de ocorrência não têm hook: desde que os
// formulários de criação/edição passaram a aceitar texto livre, ninguém
// mais lista esses catálogos na tela — a resolução do nome para id
// acontece direto pelo serviço, em `services/catalogo-por-nome.ts`.

import {
  crudDepartamentos,
  crudMarcadores,
  crudSolicitantes,
} from "@/services/cadastros-relatorios-ocorrencia";
import { criarHooksCrud } from "@/hooks/use-crud-simples";
import type {
  Departamento,
  Marcador,
  Solicitante,
} from "@/types/relatorios-ocorrencia";

export const hooksDepartamentos = criarHooksCrud<Departamento>(
  "departamentos",
  crudDepartamentos,
  "Departamento"
);
export const hooksSolicitantes = criarHooksCrud<Solicitante>(
  "solicitantes",
  crudSolicitantes,
  "Solicitante"
);
export const hooksMarcadores = criarHooksCrud<Marcador>(
  "marcadores",
  crudMarcadores,
  "Marcador"
);
