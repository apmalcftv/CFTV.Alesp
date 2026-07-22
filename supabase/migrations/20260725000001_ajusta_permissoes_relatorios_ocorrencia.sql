-- ============================================================
-- Revisão de permissões do módulo "Relatórios de Ocorrências"
-- (exclusiva deste módulo — nenhuma outra tabela/policy é tocada).
--
-- Papel definido com o usuário:
--   administrador   -> acesso total (leitura + escrita)
--   operador_cftc   -> mesmos privilégios do administrador neste módulo
--   gestor          -> somente leitura (visualizar/pesquisar/filtrar/
--                      timeline/anexos/exportar/compartilhar)
--   fiscal_alesp    -> SEM acesso nenhum (antes estava incluído na
--                      leitura por engano — corrigido aqui)
--   empresa_contratada -> já não tinha acesso, mantido assim
--
-- t_escrita (administrador/operador_cftc) e t_historico_insere já
-- estavam corretos e não são alterados — só t_leitura (tabelas) e
-- t_anexos_relatorios_leitura (storage) removem fiscal_alesp.
-- ============================================================

do $$
declare t text;
begin
  foreach t in array array[
    'departamentos','tipos_solicitacao','tipos_ocorrencia','solicitantes','marcadores',
    'relatorios_ocorrencia','relatorio_timeline_eventos','relatorio_exportacoes',
    'relatorio_anexos','relatorio_historico'
  ] loop
    execute format('drop policy if exists "t_leitura" on %I', t);
    execute format(
      'create policy "t_leitura" on %I for select to authenticated
       using (tenant_id = tenant_do_usuario()
              and papel_atual() in (''administrador'',''operador_cftc'',''gestor''));', t);
  end loop;
end;
$$;

drop policy if exists "t_anexos_relatorios_leitura" on storage.objects;

create policy "t_anexos_relatorios_leitura" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'anexos-relatorios'
    and (storage.foldername(name))[1] = tenant_do_usuario()::text
    and papel_atual() in ('administrador','operador_cftc','gestor')
  );
