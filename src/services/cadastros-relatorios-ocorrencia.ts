import { criarCrud } from "@/services/crud-simples";
import type {
  Departamento,
  Marcador,
  Solicitante,
  TipoOcorrenciaRelatorio,
  TipoSolicitacao,
} from "@/types/relatorios-ocorrencia";

export const crudDepartamentos = criarCrud<Departamento>("departamentos");
export const crudTiposSolicitacao = criarCrud<TipoSolicitacao>("tipos_solicitacao");
export const crudTiposOcorrenciaRelatorio =
  criarCrud<TipoOcorrenciaRelatorio>("tipos_ocorrencia");
export const crudSolicitantes = criarCrud<Solicitante>("solicitantes");
export const crudMarcadores = criarCrud<Marcador>("marcadores");
