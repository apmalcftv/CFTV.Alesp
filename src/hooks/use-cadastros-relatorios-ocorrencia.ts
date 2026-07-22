import {
  crudDepartamentos,
  crudMarcadores,
  crudSolicitantes,
  crudTiposOcorrenciaRelatorio,
  crudTiposSolicitacao,
} from "@/services/cadastros-relatorios-ocorrencia";
import { criarHooksCrud } from "@/hooks/use-crud-simples";
import type {
  Departamento,
  Marcador,
  Solicitante,
  TipoOcorrenciaRelatorio,
  TipoSolicitacao,
} from "@/types/relatorios-ocorrencia";

export const hooksDepartamentos = criarHooksCrud<Departamento>(
  "departamentos",
  crudDepartamentos,
  "Departamento"
);
export const hooksTiposSolicitacao = criarHooksCrud<TipoSolicitacao>(
  "tipos_solicitacao",
  crudTiposSolicitacao,
  "Tipo de solicitação"
);
export const hooksTiposOcorrenciaRelatorio = criarHooksCrud<TipoOcorrenciaRelatorio>(
  "tipos_ocorrencia",
  crudTiposOcorrenciaRelatorio,
  "Tipo de ocorrência"
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
