import { criarCrud } from "@/services/crud-simples";
import type {
  Empresa,
  Fabricante,
  Local,
  ModeloCamera,
  Nvr,
  Predio,
  Tecnico,
  TipoDefeito,
} from "@/types/domain";

export const crudPredios = criarCrud<Predio>("predios");
export const crudLocais = criarCrud<Local>("locais");
export const crudFabricantes = criarCrud<Fabricante>("fabricantes");
export const crudModelos = criarCrud<ModeloCamera>("modelos_camera");
export const crudNvrs = criarCrud<Nvr>("nvrs");
export const crudEmpresas = criarCrud<Empresa>("empresas");
export const crudTecnicos = criarCrud<Tecnico>("tecnicos");
export const crudTiposDefeito = criarCrud<TipoDefeito>("tipos_defeito");
