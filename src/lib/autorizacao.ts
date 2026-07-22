// Serviço central de autorização. Objetivo: nenhuma regra de permissão
// deveria viver espalhada em componentes/serviços/páginas — cada módulo
// declara sua matriz de papéis aqui, e menu/rotas/botões/ações consultam
// só estas funções. As policies de RLS no Supabase espelham exatamente
// os mesmos papéis (ver comentário em cada migration) — são duas
// linguagens diferentes (TS/SQL), então a fonte da verdade vive nos dois
// lugares por necessidade técnica, mas a intenção e os papéis nunca devem
// divergir entre eles.
//
// Só o módulo "Relatórios de Ocorrências" foi migrado para cá nesta
// entrega. Os demais módulos continuam com suas checagens atuais
// (`podeEditar`, `podeGerenciarUsuarios`, `podeAtualizarOcorrencia` em
// `types/domain.ts`) intocadas — migrá-los depois é só reexportar a
// mesma função por aqui, sem mudar nenhum comportamento.

import type { PapelUsuario } from "@/types/domain";

// ---------- Módulo: Relatórios de Ocorrências ----------

/** Administrador e Operador CFTC têm exatamente os mesmos privilégios
    neste módulo: visualizar, criar, editar, excluir, alterar status,
    arquivar, restaurar, importar planilhas, gerenciar anexos/timeline/
    histórico — todas as ações de escrita. */
const PAPEIS_GESTAO_RELATORIOS_OCORRENCIA: readonly PapelUsuario[] = [
  "administrador",
  "operador_cftc",
];

/** Gestor enxerga o módulo em modo somente leitura (ver, pesquisar,
    filtrar, timeline, anexos, exportar, compartilhar). Fiscal ALESP e
    Empresa Contratada não têm acesso nenhum — nem o menu aparece, nem a
    URL funciona, nem a API/RLS libera. */
export const PAPEIS_COM_ACESSO_RELATORIOS_OCORRENCIA: readonly PapelUsuario[] = [
  ...PAPEIS_GESTAO_RELATORIOS_OCORRENCIA,
  "gestor",
];

/** Menu, acesso à(s) rota(s) do módulo e leitura em geral. */
export function podeAcessarRelatoriosOcorrencia(papel: PapelUsuario): boolean {
  return PAPEIS_COM_ACESSO_RELATORIOS_OCORRENCIA.includes(papel);
}

/** Criar, editar, excluir, alterar status, arquivar, restaurar, gerenciar
    anexos/timeline/histórico e importar planilhas — tudo que grava dado.
    Único predicado para todas essas ações porque, neste módulo, o
    conjunto de papéis autorizados é idêntico para todas elas (ver
    cabeçalho da CMAL: Operador CFTC = Administrador aqui). */
export function podeGerenciarRelatoriosOcorrencia(papel: PapelUsuario): boolean {
  return PAPEIS_GESTAO_RELATORIOS_OCORRENCIA.includes(papel);
}

/** Exportar (PDF/Excel) e compartilhar — liberado também para o Gestor,
    que só não grava dado nenhum. */
export function podeExportarRelatoriosOcorrencia(papel: PapelUsuario): boolean {
  return podeAcessarRelatoriosOcorrencia(papel);
}

// Aliases nomeados por ação — mesma regra de podeGerenciarRelatoriosOcorrencia,
// mantidos como funções próprias para o código de chamada ficar
// autoexplicativo (ex.: `podeExcluirRelatorioOcorrencia(perfil.papel)` no
// lugar de um genérico "podeGerenciar" sem contexto) e para dar um ponto
// único de mudança caso algum papel precise divergir no futuro.
export const podeCriarRelatorioOcorrencia = podeGerenciarRelatoriosOcorrencia;
export const podeEditarRelatorioOcorrencia = podeGerenciarRelatoriosOcorrencia;
export const podeExcluirRelatorioOcorrencia = podeGerenciarRelatoriosOcorrencia;
export const podeAlterarStatusRelatorioOcorrencia = podeGerenciarRelatoriosOcorrencia;
export const podeArquivarRelatorioOcorrencia = podeGerenciarRelatoriosOcorrencia;
export const podeRestaurarRelatorioOcorrencia = podeGerenciarRelatoriosOcorrencia;
export const podeImportarPlanilhasRelatoriosOcorrencia = podeGerenciarRelatoriosOcorrencia;
export const podeGerenciarAnexosRelatoriosOcorrencia = podeGerenciarRelatoriosOcorrencia;
export const podeGerenciarTimelineRelatoriosOcorrencia = podeGerenciarRelatoriosOcorrencia;
export const podeGerenciarHistoricoRelatoriosOcorrencia = podeGerenciarRelatoriosOcorrencia;
export const podeCompartilharRelatoriosOcorrencia = podeExportarRelatoriosOcorrencia;
