-- ============================================================
-- Exportações: apagar registro passa a exigir `excluir`, nunca `editar`.
--
-- Mesmo defeito já corrigido nos anexos, no mesmo módulo: o DELETE de
-- `relatorio_exportacoes` herdou da Fase 3 o mapeamento para `editar`,
-- tratando a edição como suficiente para apagar. Na matriz, `editar` e
-- `excluir` são ações independentes.
--
--   antes: tem_permissao('cmal_relatorios','editar')
--   agora: tem_permissao('cmal_relatorios','excluir')
--
-- INSERT e UPDATE de `relatorio_exportacoes` continuam em `editar`:
-- registrar uma exportação é parte de editar o relatório. Só o apagar
-- muda de exigência.
--
-- O mapeamento de DELETE no módulo fica assim:
--   relatorios_ocorrencia      -> excluir
--   relatorio_anexos + Storage -> excluir
--   relatorio_exportacoes      -> excluir   (esta migration)
--   relatorio_timeline_eventos -> editar    (INTOCADO, ver abaixo)
--
-- A timeline permanece em `editar` de propósito: ali o DELETE não é uma
-- ação do usuário, é o mecanismo de "Salvar Análise", que apaga todas as
-- linhas e reinsere o grid inteiro. Exigir `excluir` impediria qualquer
-- pessoa com `editar` de salvar a análise.
--
-- Módulo Câmeras, empresa_contratada e estrutura da matriz: intocados.
-- Nenhum dado é alterado.
-- ============================================================

drop policy if exists t_exclusao on relatorio_exportacoes;
create policy t_exclusao on relatorio_exportacoes
  for delete to authenticated
  using (
    tenant_id = tenant_do_usuario()
    and tem_permissao('cmal_relatorios', 'excluir')
  );
