-- ============================================================
-- Correção: excluir anexo passa a exigir `excluir`, nunca `editar`.
--
-- FALHA CORRIGIDA (encontrada em homologação): um perfil com
-- visualizar + editar, e SEM excluir, conseguia remover anexos de um
-- relatório. A causa estava em duas policies que eu escrevi tratando
-- `editar` como suficiente para apagar:
--
--   storage.objects / t_anexos_relatorios_exclusao
--     antes: tem_permissao('cmal_relatorios','editar')
--            OR tem_permissao('cmal_relatorios','excluir')
--     agora: tem_permissao('cmal_relatorios','excluir')
--
--   relatorio_anexos / t_exclusao
--     antes: tem_permissao('cmal_relatorios','editar')
--     agora: tem_permissao('cmal_relatorios','excluir')
--
-- `editar` e `excluir` são ações independentes da matriz. Editar cobre
-- adicionar e substituir anexo; apagar exige `excluir` e ponto.
--
-- A exclusão do relatório inteiro continua funcionando: `excluirRelatorio()`
-- apaga os arquivos do Storage antes de apagar o relatório, e quem faz
-- isso necessariamente tem `excluir` — que é justamente o que estas
-- policies passam a pedir. Os registros em `relatorio_anexos` somem pela
-- cascata da FK, que roda como dona da tabela e não passa por RLS.
--
-- NÃO ALTERADO, de propósito:
--
--   relatorio_timeline_eventos / t_exclusao continua em `editar`. Ali o
--   DELETE não é uma ação do usuário: "Salvar Análise" apaga todas as
--   linhas e reinsere o grid inteiro. Exigir `excluir` impediria qualquer
--   pessoa com `editar` de salvar a análise — quebraria a edição.
--
--   Bucket `anexos` (módulo Câmeras), regras da empresa_contratada e
--   demais ações da matriz seguem intactos.
-- ============================================================

drop policy if exists t_anexos_relatorios_exclusao on storage.objects;
create policy t_anexos_relatorios_exclusao on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'anexos-relatorios'
    and (storage.foldername(name))[1] = tenant_do_usuario()::text
    and tem_permissao('cmal_relatorios', 'excluir')
  );

drop policy if exists t_exclusao on relatorio_anexos;
create policy t_exclusao on relatorio_anexos
  for delete to authenticated
  using (
    tenant_id = tenant_do_usuario()
    and tem_permissao('cmal_relatorios', 'excluir')
  );
