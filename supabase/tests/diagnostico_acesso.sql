-- ============================================================
-- Diagnóstico "dados sumiram após a migração multi-tenant"
-- Execute no SQL Editor. Ele REPORTA o estado e CORRIGE o caso
-- mais comum (perfil do admin sem tenant), sem tocar em mais nada.
-- ============================================================

-- 1. Correção garantida: perfil do administrador no tenant alesp
--    (idempotente — não altera nada se já estiver certo)
insert into perfis (id, nome, papel, tenant_id)
select u.id,
       coalesce(u.raw_user_meta_data ->> 'nome', split_part(u.email, '@', 1)),
       'admin',
       (select id from tenants where slug = 'alesp')
from auth.users u
where lower(u.email) = 'thiago2023leal@gmail.com'
on conflict (id) do update set
  papel = 'admin',
  tenant_id = coalesce(perfis.tenant_id, excluded.tenant_id);

-- 2. Relatório completo
do $$
declare
  v_alesp uuid;
  n_cam int; n_os int; n_cam_st int; n_os_st int;
  r record;
begin
  select id into v_alesp from tenants where slug = 'alesp';
  if v_alesp is null then
    raise notice 'PROBLEMA: tenant alesp NÃO existe — a migração 0003 foi aplicada?';
    return;
  end if;
  raise notice 'Tenant alesp: %', v_alesp;

  select count(*), count(*) filter (where tenant_id = v_alesp) into n_cam, n_cam_st from cameras;
  select count(*), count(*) filter (where tenant_id = v_alesp) into n_os, n_os_st from ocorrencias;
  raise notice 'Câmeras no banco: % (no tenant alesp: %)', n_cam, n_cam_st;
  raise notice 'Ocorrências no banco: % (no tenant alesp: %)', n_os, n_os_st;
  if n_cam = 0 then
    raise notice 'PROBLEMA: não há câmeras no banco — a importação (planilha_import.sql) nunca rodou ou falhou. Use o arquivo REGENERADO do disco (a versão antiga falha após a 0003).';
  end if;

  raise notice '--- Contas e perfis ---';
  for r in
    select u.email, p.papel::text as papel, t.slug as tenant
    from auth.users u
    left join perfis p on p.id = u.id
    left join tenants t on t.id = p.tenant_id
    order by u.created_at
  loop
    if r.papel is null then
      raise notice 'PROBLEMA: % tem conta mas NÃO tem perfil', r.email;
    elsif r.tenant is null then
      raise notice 'PROBLEMA: % (papel %) está SEM tenant', r.email, r.papel;
    else
      raise notice 'OK: % → papel %, tenant %', r.email, r.papel, r.tenant;
    end if;
  end loop;
end;
$$;
