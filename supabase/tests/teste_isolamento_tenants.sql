-- ============================================================
-- Suíte de testes de isolamento multi-tenant (Fase S1)
-- Execute no SQL Editor do Supabase APÓS a migração 0003.
-- Roda inteira num BEGIN…ROLLBACK: não deixa resíduos.
-- Sucesso = várias mensagens "OK …" e nenhum erro.
-- ============================================================
begin;

-- ---------- Cenário: 2 tenants, 1 usuário em cada ----------
do $$
declare
  v_ta uuid; v_tb uuid;
  v_ua uuid := gen_random_uuid();
  v_ub uuid := gen_random_uuid();
  v_cam_a uuid; v_os_a uuid; v_os_b uuid;
  n int;
begin
  v_ta := criar_tenant('teste-a', 'Cliente A (teste)');
  v_tb := criar_tenant('teste-b', 'Cliente B (teste)');

  -- usuários de teste pelo fluxo REAL: convite + signup (trigger cria o perfil)
  insert into convites (tenant_id, email, papel) values
    (v_ta, 'admin-a@teste.local', 'admin'),
    (v_tb, 'admin-b@teste.local', 'admin');

  insert into auth.users
    (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
     created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
     confirmation_token, recovery_token, email_change_token_new, email_change)
  values
    ('00000000-0000-0000-0000-000000000000', v_ua, 'authenticated', 'authenticated',
     'admin-a@teste.local', '', now(), now(), now(), '{}'::jsonb,
     '{"nome":"Admin A"}'::jsonb, '', '', '', ''),
    ('00000000-0000-0000-0000-000000000000', v_ub, 'authenticated', 'authenticated',
     'admin-b@teste.local', '', now(), now(), now(), '{}'::jsonb,
     '{"nome":"Admin B"}'::jsonb, '', '', '', '');

  -- o trigger deve ter criado os perfis com tenant e papel do convite
  select count(*) into n from perfis
  where (id = v_ua and tenant_id = v_ta and papel = 'admin')
     or (id = v_ub and tenant_id = v_tb and papel = 'admin');
  if n <> 2 then raise exception 'FALHA: convite/signup não criou os perfis (criados: %)', n; end if;
  raise notice 'OK fluxo de convite: signup criou perfis com tenant e papel do convite';

  -- signup SEM convite deve ser recusado
  begin
    insert into auth.users
      (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
       created_at, updated_at, raw_app_meta_data, raw_user_meta_data,
       confirmation_token, recovery_token, email_change_token_new, email_change)
    values
      ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated',
       'authenticated', 'sem-convite@teste.local', '', now(), now(), now(),
       '{}'::jsonb, '{}'::jsonb, '', '', '', '');
    raise exception 'FALHA: signup sem convite foi aceito';
  exception when others then
    if sqlerrm like 'FALHA%' then raise; end if;
    raise notice 'OK signup sem convite é recusado (%)', sqlerrm;
  end;

  -- dados do tenant A e B (como postgres, sem RLS)
  insert into cameras (tenant_id, numero) values (v_ta, 1) returning id into v_cam_a;
  insert into cameras (tenant_id, numero) values (v_tb, 1); -- MESMO número: ok por tenant
  insert into ocorrencias (tenant_id, camera_id, descricao, aberta_em)
    values (v_ta, v_cam_a, 'OS do tenant A', now()) returning id into v_os_a;
  insert into ocorrencias (tenant_id, descricao, aberta_em)
    values (v_tb, 'OS do tenant B', now()) returning id into v_os_b;
  raise notice 'OK cenário criado (2 tenants, câmeras nº 1 em ambos, 1 OS cada)';

  -- numeração de OS por tenant: ambas devem ser nº 1
  select numero into n from ocorrencias where id = v_os_a;
  if n <> 1 then raise exception 'FALHA: OS do tenant A deveria ser nº 1, veio %', n; end if;
  select numero into n from ocorrencias where id = v_os_b;
  if n <> 1 then raise exception 'FALHA: OS do tenant B deveria ser nº 1, veio %', n; end if;
  raise notice 'OK numeração de OS independente por tenant';

  -- ---------- Simula o usuário A (RLS ativa) ----------
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_ua, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select count(*) into n from cameras;
  if n <> 1 then raise exception 'FALHA isolamento: usuário A vê % câmeras (esperado 1)', n; end if;
  select count(*) into n from ocorrencias;
  if n <> 1 then raise exception 'FALHA isolamento: usuário A vê % OS (esperado 1)', n; end if;
  select count(*) into n from ocorrencias where descricao = 'OS do tenant B';
  if n <> 0 then raise exception 'FALHA isolamento: usuário A enxerga OS do tenant B'; end if;
  raise notice 'OK usuário A só vê dados do tenant A';

  -- KPIs (views security_invoker) devem respeitar o tenant
  select total_cameras into n from v_kpis;
  if n <> 1 then raise exception 'FALHA: v_kpis do usuário A retornou % câmeras (esperado 1)', n; end if;
  raise notice 'OK views de KPI respeitam RLS (v_kpis = só tenant A)';

  -- escrita cruzada: update na OS do tenant B não pode afetar nada
  update ocorrencias set descricao = 'hackeada' where id = v_os_b;
  select count(*) into n from ocorrencias where descricao = 'hackeada';
  if n <> 0 then raise exception 'FALHA: usuário A alterou OS do tenant B'; end if;
  raise notice 'OK usuário A não altera dados do tenant B';

  -- insert forjando tenant alheio deve falhar (WITH CHECK)
  begin
    insert into cameras (tenant_id, numero) values (v_tb, 99);
    raise exception 'FALHA: usuário A inseriu câmera no tenant B';
  exception when insufficient_privilege or check_violation or others then
    if sqlerrm like 'FALHA%' then raise; end if;
    raise notice 'OK insert com tenant forjado é bloqueado (%)', sqlerrm;
  end;

  -- tenants: usuário A só enxerga o próprio
  select count(*) into n from tenants;
  if n <> 1 then raise exception 'FALHA: usuário A vê % tenants (esperado 1)', n; end if;
  raise notice 'OK usuário A só vê o próprio tenant';

  -- ---------- Simula o usuário B ----------
  reset role;
  perform set_config('request.jwt.claims',
    json_build_object('sub', v_ub, 'role', 'authenticated')::text, true);
  set local role authenticated;

  select count(*) into n from ocorrencias where descricao = 'OS do tenant A';
  if n <> 0 then raise exception 'FALHA isolamento: usuário B enxerga OS do tenant A'; end if;
  select count(*) into n from cameras;
  if n <> 1 then raise exception 'FALHA isolamento: usuário B vê % câmeras (esperado 1)', n; end if;
  raise notice 'OK usuário B só vê dados do tenant B';

  -- perfis: B não enxerga o perfil de A
  select count(*) into n from perfis where id = v_ua;
  if n <> 0 then raise exception 'FALHA: usuário B enxerga perfil do tenant A'; end if;
  raise notice 'OK perfis isolados por tenant';

  -- anônimo (sem JWT) não vê nada
  reset role;
  perform set_config('request.jwt.claims', '', true);
  set local role anon;
  select count(*) into n from cameras;
  if n <> 0 then raise exception 'FALHA: anônimo vê câmeras'; end if;
  reset role;
  raise notice 'OK anônimo não vê nada';

  raise notice '=== TODOS OS TESTES DE ISOLAMENTO PASSARAM ===';
end;
$$;

rollback;
