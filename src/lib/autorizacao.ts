// Autorização do módulo "Relatórios de Ocorrências" (CMAL).
//
// FONTE ÚNICA DA VERDADE: a matriz configurável em Cadastros › Permissões,
// consultada pela função SQL `tem_permissao(recurso, ação)`.
//
//   • nas telas          -> `useMinhasPermissoes()` de @/hooks/use-permissoes
//   • nos guardas de rota-> `temPermissao()` de @/lib/permissoes-servidor
//   • no banco           -> as policies de RLS chamam `tem_permissao()`
//
// As três camadas acabam no MESMO código rodando no Postgres, então não
// têm como divergir. Quem protege o dado é a RLS; tela e rota só evitam
// oferecer uma ação que o banco vai recusar.
//
// NÃO reintroduzir aqui funções do tipo `podeXRelatorioOcorrencia(papel)`.
// Existiam 14 delas, comparando papéis literais; ficaram órfãs quando as
// telas passaram a ler a matriz e foram removidas em 11/08/2026
// justamente porque devolviam a regra antiga — um uso acidental
// divergiria da configuração do Administrador em silêncio, sem nada
// acusar. Permissão nova se declara no catálogo (`permissoes_catalogo`),
// não em código.
//
// O módulo Câmeras ainda usa regras por papel (`podeEditar` e afins em
// `types/domain.ts`), o que é esperado: a migração dele para a matriz é
// uma fase própria, ainda não iniciada.

import type { PapelUsuario } from "@/types/domain";

/** Papéis que podem ser atribuídos como **operador de uma análise**
    (coluna Operador do grid e modal "Salvar análise"), consumido por
    `services/usuarios.ts::listarOperadoresAnalise()`.

    Continua sendo lista fixa de propósito, e não uma entrada da matriz:
    não é uma permissão de quem está usando o sistema, e sim o conjunto de
    pessoas elegíveis a constar como responsável por um trabalho. Um papel
    novo só entra aqui deliberadamente. */
export const PAPEIS_GESTAO_RELATORIOS_OCORRENCIA: readonly PapelUsuario[] = [
  "administrador",
  "operador_cftc",
];
