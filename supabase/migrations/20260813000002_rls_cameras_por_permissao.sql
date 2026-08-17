-- ============================================================
-- FASE 3 (módulo Câmeras) — as policies passam a consultar a matriz
--
-- A partir daqui, o que o Administrador configura em Cadastros ›
-- Permissões rege de verdade o módulo Câmeras, inclusive contra chamada
-- direta à API. Sem redeploy: mudar o booleano muda o comportamento na
-- consulta seguinte.
--
-- PRINCÍPIO: PERMISSÃO **AND** ESCOPO. A matriz decide a AÇÃO; os
-- predicados que decidem QUAIS LINHAS continuam existindo, somados, nunca
-- substituídos. Conceder `visualizar` a uma Empresa Contratada não a faz
-- enxergar OS de outra empresa.
--
-- ============================================================
-- INVENTÁRIO DO ESTADO ANTERIOR (o que está sendo substituído)
--
--   cameras            SELECT t_leitura           tenant
--                      ALL    t_escrita_operador  tenant + adm/op
--   camera_eventos     SELECT t_leitura           tenant
--   ocorrencias        SELECT t_leitura           tenant + ESCOPO empresa
--                      ALL    t_escrita_operador  tenant + adm/op
--                      UPDATE t_empresa_atualiza_os  tenant + ESCOPO empresa
--   ocorrencia_eventos SELECT t_leitura           tenant
--                      ALL    t_escrita_operador  tenant + adm/op
--                      INSERT t_empresa_eventos   tenant + ESCOPO empresa
--   anexos             SELECT t_leitura           tenant
--                      ALL    t_escrita_operador  tenant + adm/op
--                      INSERT t_empresa_anexos    tenant + ESCOPO empresa
--   8 catálogos        SELECT t_leitura           tenant
--                      ALL    t_escrita_operador  tenant + adm/op
--   storage 'anexos'   SELECT/INSERT/DELETE       tenant + adm/op (+ escopo no INSERT)
--
-- As 15 `FOR ALL` são desmembradas em INSERT, UPDATE e DELETE explícitos,
-- para cada ação ter sua própria permissão — e para nenhum DELETE ficar
-- escondido dentro de um ALL, como já aconteceu no CMAL.
--
-- ============================================================
-- POR QUE A EMPRESA CONTRATADA PRECISA DE CUIDADO EXTRA
--
-- Hoje a policy geral de escrita exclui a empresa por comparar o papel
-- (`adm/op`). Trocar essa comparação por `tem_permissao()` sem mais nada
-- abriria um buraco: a empresa tem `cameras_os · editar` na matriz e
-- passaria a atualizar OS de QUALQUER empresa pela policy geral.
--
-- Por isso as policies gerais mantêm `papel_atual() <> 'empresa_contratada'`
-- e a empresa continua com policy própria, agora também exigindo a
-- permissão da matriz. As duas se somam (OR) e são mutuamente exclusivas
-- pelo papel — o escopo por empresa segue intacto nos dois lados.
--
-- ============================================================
-- NÃO ALTERADO DE PROPÓSITO
--   * notificacoes  — acesso pessoal (perfil_id = auth.uid())
--   * politicas_sla — órfã desde 17/07
--   * perfis, convites, configuracoes, tenants, saas_admins — administração
--   * t_locais_insercao_cmal — permissão do CMAL sobre `locais`, somada por OR
--   * todos os triggers, inclusive valida_transicao_empresa e o de status
--   * tudo do módulo CMAL
--   * SELECT de anexos e ocorrencia_eventos sem filtro de empresa
--     (Achado 3 da auditoria — fica para a Fase 4, como combinado)
-- ============================================================


-- ============================================================
-- PARTE 1 — Ajuste da semente: leitura dos catálogos
--
-- A semente da Fase 1 tratou `visualizar` do catálogo como "aparece no
-- menu Cadastros". Só que ele também significa "consegue resolver o nome
-- numa consulta": Dashboard, Executivo, Relatórios e a lista de Câmeras
-- leem local, prédio, fabricante e tipo de defeito por join, e o
-- PostgREST aplica RLS ao recurso embutido.
--
-- Sem este ajuste, ligar o SELECT dos catálogos à matriz deixaria essas
-- telas em branco para Gestor e Fiscal, que hoje enxergam tudo.
-- Concede-se apenas `visualizar`; criar, editar e excluir seguem falsos.
-- ============================================================

update permissoes_perfil
   set permitido = true,
       atualizado_em = now()
 where papel in ('gestor', 'fiscal_alesp')
   and acao = 'visualizar'
   and recurso in ('cameras_predios', 'cameras_locais', 'cameras_fabricantes',
                   'cameras_modelos', 'cameras_nvrs', 'cameras_empresas',
                   'cameras_tecnicos', 'cameras_defeitos');


-- ============================================================
-- PARTE 2 — Inventário de câmeras
-- ============================================================

alter policy t_leitura on cameras
  using (tenant_id = tenant_do_usuario() and tem_permissao('cameras_inventario', 'visualizar'));

drop policy if exists t_escrita_operador on cameras;

create policy t_insercao on cameras
  for insert to authenticated
  with check (tenant_id = tenant_do_usuario() and tem_permissao('cameras_inventario', 'criar'));

create policy t_atualizacao on cameras
  for update to authenticated
  using (tenant_id = tenant_do_usuario() and tem_permissao('cameras_inventario', 'editar'))
  with check (tenant_id = tenant_do_usuario() and tem_permissao('cameras_inventario', 'editar'));

create policy t_exclusao on cameras
  for delete to authenticated
  using (tenant_id = tenant_do_usuario() and tem_permissao('cameras_inventario', 'excluir'));

-- Histórico da câmera: leitura acompanha o inventário. Não recebe policy
-- de escrita — quem grava é a trigger `on_camera_status_change`, nunca a
-- aplicação, e isso não muda.
alter policy t_leitura on camera_eventos
  using (tenant_id = tenant_do_usuario() and tem_permissao('cameras_inventario', 'visualizar'));


-- ============================================================
-- PARTE 3 — Ordens de serviço
-- ============================================================

-- SELECT: permissão da matriz E o filtro de empresa, preservado literalmente.
alter policy t_leitura on ocorrencias
  using (
    tenant_id = tenant_do_usuario()
    and tem_permissao('cameras_os', 'visualizar')
    and (papel_atual() <> 'empresa_contratada'::papel_usuario
         or empresa_id = empresa_do_usuario())
  );

drop policy if exists t_escrita_operador on ocorrencias;

-- Abrir OS: não existe caminho para a empresa criar OS hoje, e isso não muda.
create policy t_insercao on ocorrencias
  for insert to authenticated
  with check (
    tenant_id = tenant_do_usuario()
    and tem_permissao('cameras_os', 'criar')
    and papel_atual() <> 'empresa_contratada'::papel_usuario
  );

create policy t_atualizacao on ocorrencias
  for update to authenticated
  using (
    tenant_id = tenant_do_usuario()
    and tem_permissao('cameras_os', 'editar')
    and papel_atual() <> 'empresa_contratada'::papel_usuario
  )
  with check (
    tenant_id = tenant_do_usuario()
    and tem_permissao('cameras_os', 'editar')
    and papel_atual() <> 'empresa_contratada'::papel_usuario
  );

-- A policy da empresa continua existindo com o mesmo nome e o mesmo
-- predicado de escopo; só passou a exigir também a permissão da matriz.
-- A trigger `valida_transicao_empresa` segue limitando quais status ela
-- pode gravar — isso é regra de negócio e não foi tocado.
alter policy t_empresa_atualiza_os on ocorrencias
  using (
    tenant_id = tenant_do_usuario()
    and tem_permissao('cameras_os', 'editar')
    and papel_atual() = 'empresa_contratada'::papel_usuario
    and empresa_id = empresa_do_usuario()
  )
  with check (
    tenant_id = tenant_do_usuario()
    and tem_permissao('cameras_os', 'editar')
    and papel_atual() = 'empresa_contratada'::papel_usuario
    and empresa_id = empresa_do_usuario()
  );

-- DELETE não existe na aplicação: OS é cancelada com motivo, nunca apagada.
-- A policy passa a ser explícita para que o DELETE deixe de vir escondido
-- dentro do antigo FOR ALL, e exige `excluir`.
create policy t_exclusao on ocorrencias
  for delete to authenticated
  using (
    tenant_id = tenant_do_usuario()
    and tem_permissao('cameras_os', 'excluir')
    and papel_atual() <> 'empresa_contratada'::papel_usuario
  );


-- ============================================================
-- PARTE 4 — Timeline e anexos da OS
-- ============================================================

-- Nota: o SELECT destas duas tabelas continua sem filtro de empresa,
-- exatamente como está hoje (Achado 3, reservado para a Fase 4).
alter policy t_leitura on ocorrencia_eventos
  using (tenant_id = tenant_do_usuario() and tem_permissao('cameras_os', 'visualizar'));

drop policy if exists t_escrita_operador on ocorrencia_eventos;

create policy t_insercao on ocorrencia_eventos
  for insert to authenticated
  with check (
    tenant_id = tenant_do_usuario()
    and tem_permissao('cameras_os', 'editar')
    and papel_atual() <> 'empresa_contratada'::papel_usuario
  );

alter policy t_empresa_eventos on ocorrencia_eventos
  with check (
    tenant_id = tenant_do_usuario()
    and tem_permissao('cameras_os', 'editar')
    and papel_atual() = 'empresa_contratada'::papel_usuario
    and exists (select 1 from ocorrencias o
                 where o.id = ocorrencia_id and o.empresa_id = empresa_do_usuario())
  );

create policy t_atualizacao on ocorrencia_eventos
  for update to authenticated
  using (tenant_id = tenant_do_usuario() and tem_permissao('cameras_os', 'editar'))
  with check (tenant_id = tenant_do_usuario() and tem_permissao('cameras_os', 'editar'));

create policy t_exclusao on ocorrencia_eventos
  for delete to authenticated
  using (tenant_id = tenant_do_usuario() and tem_permissao('cameras_os', 'excluir'));

-- ---------- anexos (registro) ----------
alter policy t_leitura on anexos
  using (tenant_id = tenant_do_usuario() and tem_permissao('cameras_os', 'visualizar'));

drop policy if exists t_escrita_operador on anexos;

create policy t_insercao on anexos
  for insert to authenticated
  with check (
    tenant_id = tenant_do_usuario()
    and tem_permissao('cameras_os', 'editar')
    and papel_atual() <> 'empresa_contratada'::papel_usuario
  );

alter policy t_empresa_anexos on anexos
  with check (
    tenant_id = tenant_do_usuario()
    and tem_permissao('cameras_os', 'editar')
    and papel_atual() = 'empresa_contratada'::papel_usuario
    and exists (select 1 from ocorrencias o
                 where o.id = anexos.ocorrencia_id and o.empresa_id = empresa_do_usuario())
  );

create policy t_atualizacao on anexos
  for update to authenticated
  using (tenant_id = tenant_do_usuario() and tem_permissao('cameras_os', 'editar'))
  with check (tenant_id = tenant_do_usuario() and tem_permissao('cameras_os', 'editar'));

-- Apagar anexo exige `excluir`, nunca `editar` — mesma regra já corrigida
-- no CMAL depois da falha encontrada em homologação.
create policy t_exclusao on anexos
  for delete to authenticated
  using (tenant_id = tenant_do_usuario() and tem_permissao('cameras_os', 'excluir'));


-- ============================================================
-- PARTE 5 — Storage do módulo Câmeras (bucket 'anexos')
--
-- O arquivo acompanha o registro: baixar exige visualizar, subir e
-- substituir exigem editar, apagar exige excluir. O escopo da empresa no
-- upload é preservado.
-- ============================================================

drop policy if exists t_anexos_leitura on storage.objects;
create policy t_anexos_leitura on storage.objects
  for select to authenticated
  using (
    bucket_id = 'anexos'
    and (storage.foldername(name))[1] = tenant_do_usuario()::text
    and tem_permissao('cameras_os', 'visualizar')
  );

drop policy if exists t_anexos_upload on storage.objects;
create policy t_anexos_upload on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'anexos'
    and (storage.foldername(name))[1] = tenant_do_usuario()::text
    and tem_permissao('cameras_os', 'editar')
    and (
      papel_atual() <> 'empresa_contratada'::papel_usuario
      or exists (select 1 from ocorrencias o
                  where o.id::text = (storage.foldername(name))[2]
                    and o.empresa_id = empresa_do_usuario())
    )
  );

drop policy if exists t_anexos_atualizacao on storage.objects;
create policy t_anexos_atualizacao on storage.objects
  for update to authenticated
  using (
    bucket_id = 'anexos'
    and (storage.foldername(name))[1] = tenant_do_usuario()::text
    and tem_permissao('cameras_os', 'editar')
  )
  with check (
    bucket_id = 'anexos'
    and (storage.foldername(name))[1] = tenant_do_usuario()::text
    and tem_permissao('cameras_os', 'editar')
  );

drop policy if exists t_anexos_exclusao on storage.objects;
create policy t_anexos_exclusao on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'anexos'
    and (storage.foldername(name))[1] = tenant_do_usuario()::text
    and tem_permissao('cameras_os', 'excluir')
  );


-- ============================================================
-- PARTE 6 — Os oito catálogos, um recurso cada
--
-- `locais` mantém, além disto, a policy t_locais_insercao_cmal, que
-- concede INSERT a quem tem cmal_relatorios criar/editar. As duas se
-- somam por OR: o CMAL continua criando local pelo texto livre mesmo sem
-- permissão no módulo Câmeras.
-- ============================================================

do $$
declare
  t record;
begin
  for t in
    select * from (values
      ('predios',        'cameras_predios'),
      ('locais',         'cameras_locais'),
      ('fabricantes',    'cameras_fabricantes'),
      ('modelos_camera', 'cameras_modelos'),
      ('nvrs',           'cameras_nvrs'),
      ('empresas',       'cameras_empresas'),
      ('tecnicos',       'cameras_tecnicos'),
      ('tipos_defeito',  'cameras_defeitos')
    ) as v(tabela, recurso)
  loop
    execute format(
      'alter policy t_leitura on %I using (tenant_id = tenant_do_usuario() and tem_permissao(%L, ''visualizar''))',
      t.tabela, t.recurso);

    execute format('drop policy if exists t_escrita_operador on %I', t.tabela);

    execute format(
      'create policy t_insercao on %I for insert to authenticated
         with check (tenant_id = tenant_do_usuario() and tem_permissao(%L, ''criar''))',
      t.tabela, t.recurso);

    execute format(
      'create policy t_atualizacao on %I for update to authenticated
         using (tenant_id = tenant_do_usuario() and tem_permissao(%L, ''editar''))
         with check (tenant_id = tenant_do_usuario() and tem_permissao(%L, ''editar''))',
      t.tabela, t.recurso, t.recurso);

    execute format(
      'create policy t_exclusao on %I for delete to authenticated
         using (tenant_id = tenant_do_usuario() and tem_permissao(%L, ''excluir''))',
      t.tabela, t.recurso);
  end loop;
end $$;
