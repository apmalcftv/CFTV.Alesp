import {
  crudEmpresas,
  crudFabricantes,
  crudLocais,
  crudModelos,
  crudNvrs,
  crudPredios,
  crudTecnicos,
  crudTiposDefeito,
} from "@/services/cadastros";
import { criarHooksCrud } from "@/hooks/use-crud-simples";
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

export const hooksPredios = criarHooksCrud<Predio>(
  "predios",
  crudPredios,
  "Prédio"
);
export const hooksLocais = criarHooksCrud<Local>("locais", crudLocais, "Local");
export const hooksFabricantes = criarHooksCrud<Fabricante>(
  "fabricantes",
  crudFabricantes,
  "Fabricante"
);
export const hooksModelos = criarHooksCrud<ModeloCamera>(
  "modelos_camera",
  crudModelos,
  "Modelo"
);
export const hooksNvrs = criarHooksCrud<Nvr>("nvrs", crudNvrs, "NVR");
export const hooksEmpresas = criarHooksCrud<Empresa>(
  "empresas",
  crudEmpresas,
  "Empresa"
);
export const hooksTecnicos = criarHooksCrud<Tecnico>(
  "tecnicos",
  crudTecnicos,
  "Técnico"
);
export const hooksTiposDefeito = criarHooksCrud<TipoDefeito>(
  "tipos_defeito",
  crudTiposDefeito,
  "Tipo de defeito"
);
