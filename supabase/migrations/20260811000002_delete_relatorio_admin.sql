-- ============================================================
-- Exclusão definitiva de Relatório de Ocorrência: exclusiva do
-- Administrador, garantida no banco e não só na tela.
--
-- Situação anterior: `t_escrita` era uma policy FOR ALL para
-- administrador + operador_cftc. FOR ALL cobre DELETE, então na prática
-- o operador_cftc também podia apagar relatório pela API — nunca pela
-- interface, porque nenhuma tela expunha a ação. Aqui a policy é
-- desmembrada para que DELETE fique só com o administrador.
--
-- INSERT e UPDATE continuam idênticos ao que já valia (mesmos papéis,
-- mesmo predicado de tenant): a única mudança de permissão é o DELETE.
-- Leitura (`t_leitura`, que inclui o gestor) não é tocada.
--
-- As tabelas dependentes (relatorio_timeline_eventos, relatorio_anexos,
-- relatorio_historico, relatorio_exportacoes) já apagam junto por
-- ON DELETE CASCADE das FKs — nada a criar aqui, e nenhuma policy de
-- DELETE é necessária nelas: a integridade referencial roda como dona
-- da tabela e não passa por RLS. Catálogos compartilhados (locais,
-- cameras, perfis, departamentos, solicitantes, marcadores, tipos)
-- são referenciados pelo relatório, não o contrário — não são tocados
-- por esta exclusão.
-- ============================================================

drop policy if exists t_escrita on relatorios_ocorrencia;

create policy t_insercao on relatorios_ocorrencia
  for insert to authenticated
  with check (
    tenant_id = tenant_do_usuario()
    and papel_atual() = any (array['administrador'::papel_usuario, 'operador_cftc'::papel_usuario])
  );

create policy t_atualizacao on relatorios_ocorrencia
  for update to authenticated
  using (
    tenant_id = tenant_do_usuario()
    and papel_atual() = any (array['administrador'::papel_usuario, 'operador_cftc'::papel_usuario])
  )
  with check (
    tenant_id = tenant_do_usuario()
    and papel_atual() = any (array['administrador'::papel_usuario, 'operador_cftc'::papel_usuario])
  );

create policy t_exclusao_admin on relatorios_ocorrencia
  for delete to authenticated
  using (
    tenant_id = tenant_do_usuario()
    and papel_atual() = 'administrador'::papel_usuario
  );
