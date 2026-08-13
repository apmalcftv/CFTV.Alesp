// Ponte entre a digitação livre do formulário e as colunas FK do banco.
//
// `relatorios_ocorrencia` guarda solicitante, departamento, local, tipo de
// solicitação e tipo de ocorrência como uuid — não como texto. O formulário
// de criação passou a aceitar texto livre, então o nome digitado precisa
// virar um id no momento de salvar: reaproveita o registro do catálogo se
// já existir um com o mesmo nome, cria um novo se não existir.
//
// É exatamente o que o botão "criar" do antigo combobox já fazia; a única
// diferença é que agora acontece sozinho. A comparação ignora caixa,
// acentuação e espaços nas pontas para não encher o catálogo de variações
// da mesma coisa ("Segurança", "seguranca", "SEGURANÇA ").

import { crudLocais } from "@/services/cadastros";
import {
  crudDepartamentos,
  crudSolicitantes,
  crudTiposOcorrenciaRelatorio,
  crudTiposSolicitacao,
} from "@/services/cadastros-relatorios-ocorrencia";

function normalizar(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

interface CatalogoSimples<T extends { id: string; nome: string }> {
  listar(): Promise<T[]>;
  criar(valores: Partial<T>): Promise<T>;
}

/** Devolve o id do registro cujo nome bate com `texto`, criando-o quando não
    existir. Texto vazio devolve null — nenhum campo é obrigatório aqui. */
async function idPorNome<T extends { id: string; nome: string }>(
  catalogo: CatalogoSimples<T>,
  texto: string,
  extras: Partial<T> = {}
): Promise<string | null> {
  const nome = texto.trim();
  if (!nome) return null;

  const alvo = normalizar(nome);
  const existentes = await catalogo.listar();
  const achado = existentes.find((e) => normalizar(e.nome) === alvo);
  if (achado) return achado.id;

  const novo = await catalogo.criar({ nome, ...extras } as Partial<T>);
  return novo.id;
}

export const idDoTipoSolicitacao = (texto: string) =>
  idPorNome(crudTiposSolicitacao, texto);

export const idDoSolicitante = (texto: string) => idPorNome(crudSolicitantes, texto);

export const idDoDepartamento = (texto: string) => idPorNome(crudDepartamentos, texto);

export const idDoTipoOcorrencia = (texto: string) =>
  idPorNome(crudTiposOcorrenciaRelatorio, texto);

/** Local exige prédio: `locais` é único por (predio_id, nome) e o sistema
    opera com um prédio só ("Complexo ALESP"). Mesma simplificação que o
    combobox de Local já adotava. */
export const idDoLocal = (texto: string, predioId: string | undefined) =>
  idPorNome(crudLocais, texto, predioId ? { predio_id: predioId } : {});
