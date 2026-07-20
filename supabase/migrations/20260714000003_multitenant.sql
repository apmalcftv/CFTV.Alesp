-- ============================================================
-- S1 — Fundação SaaS multi-tenant (plano AUDITORIA_SAAS.md,
-- decisões D1 pool · D2 URL única · D3 OS por tenant, 14/07/2026)
--
-- Idempotente onde possível; segura para banco já populado (backfill ALESP).
-- Preserva 100% das regras de papel existentes — cada política apenas
-- ganha o predicado de tenant.
-- ============================================================

-- ---------- 1. Tenants ----------

create table if not exists tenants (
  id        uuid primary key default gen_random_uuid(),
  slug      text not null unique check (slug ~ '^[a-z0-9-]+$'),
  nome      text not null,
  ativo     boolean not null default true,
  -- branding e textos do cliente (consumido pelo TenantProvider na fase S2)
  branding  jsonb not null default '{}'::jsonb,
  criado_em timestamptz not null default now()
);

-- ALESP = tenant nº 1, com o branding L-Vision atual
insert into tenants (slug, nome, branding) values (
  'alesp',
  'CFTV ALESP',
  '{
    "nome_sistema": "CFTV ALESP",
    "subtitulo": "Central de monitoramento",
    "descricao": "Gerenciamento do circuito de câmeras",
    "rodape": "Assembleia Legislativa de São Paulo",
    "dominio_email": "alesp.sp.gov.br",
    "cores": {
      "primary": "#0b0f34", "secondary": "#3b82f6", "accent": "#f59e0b",
      "bg_base": "#f8fafc", "surface": "#ffffff", "elevated": "#f1f5f9"
    }
  }'::jsonb
) on conflict (slug) do nothing;

-- Super admins da plataforma (equipe SaaS) — fora de qualquer tenant
create table if not exists saas_admins (
  perfil_id uuid primary key references perfis(id) on delete cascade,
  criado_em timestamptz not null default now()
);

-- ---------- 2. tenant_id em todas as tabelas de domínio ----------

alter table predios            add column if not exists tenant_id uuid references tenants(id);
alter table locais             add column if not exists tenant_id uuid references tenants(id);
alter table fabricantes        add column if not exists tenant_id uuid references tenants(id);
alter table modelos_camera     add column if not exists tenant_id uuid references tenants(id);
alter table empresas           add column if not exists tenant_id uuid references tenants(id);
alter table tecnicos           add column if not exists tenant_id uuid references tenants(id);
alter table nvrs               add column if not exists tenant_id uuid references tenants(id);
alter table tipos_defeito      add column if not exists tenant_id uuid references tenants(id);
alter table politicas_sla      add column if not exists tenant_id uuid references tenants(id);
alter table configuracoes      add column if not exists tenant_id uuid references tenants(id);
alter table cameras            add column if not exists tenant_id uuid references tenants(id);
alter table ocorrencias        add column if not exists tenant_id uuid references tenants(id);
alter table ocorrencia_eventos add column if not exists tenant_id uuid references tenants(id);
alter table anexos             add column if not exists tenant_id uuid references tenants(id);
alter table notificacoes       add column if not exists tenant_id uuid references tenants(id);
-- perfis: NULL = super admin da plataforma (sem tenant)
alter table perfis             add column if not exists tenant_id uuid references tenants(id);

-- ---------- 3. Backfill: tudo que existe pertence à ALESP ----------

do $$
declare
  v_alesp uuid;
  t text;
begin
  select id into v_alesp from tenants where slug = 'alesp';
  foreach t in array array[
    'predios','locais','fabricantes','modelos_camera','empresas','tecnicos',
    'nvrs','tipos_defeito','politicas_sla','configuracoes','cameras',
    'ocorrencias','ocorrencia_eventos','anexos','notificacoes','perfis'
  ] loop
    execute format('update %I set tenant_id = $1 where tenant_id is null', t)
      using v_alesp;
  end loop;
end;
$$;

-- NOT NULL após o backfill (perfis fica nullable: super admin não tem tenant)
alter table predios            alter column tenant_id set not null;
alter table locais             alter column tenant_id set not null;
alter table fabricantes        alter column tenant_id set not null;
alter table modelos_camera     alter column tenant_id set not null;
alter table empresas           alter column tenant_id set not null;
alter table tecnicos           alter column tenant_id set not null;
alter table nvrs               alter column tenant_id set not null;
alter table tipos_defeito      alter column tenant_id set not null;
alter table politicas_sla      alter column tenant_id set not null;
alter table configuracoes      alter column tenant_id set not null;
alter table cameras            alter column tenant_id set not null;
alter table ocorrencias        alter column tenant_id set not null;
alter table ocorrencia_eventos alter column tenant_id set not null;
alter table anexos             alter column tenant_id set not null;
alter table notificacoes       alter column tenant_id set not null;

-- ---------- 4. Unicidades: globais → por tenant ----------

alter table cameras       drop constraint if exists cameras_numero_key;
alter table cameras       add constraint cameras_tenant_numero_unico unique (tenant_id, numero);

alter table fabricantes   drop constraint if exists fabricantes_nome_key;
alter table fabricantes   add constraint fabricantes_tenant_nome_unico unique (tenant_id, nome);

alter table tipos_defeito drop constraint if exists tipos_defeito_nome_key;
alter table tipos_defeito add constraint tipos_defeito_tenant_nome_unico unique (tenant_id, nome);

alter table empresas      drop constraint if exists empresas_nome_unico;
alter table empresas      add constraint empresas_tenant_nome_unico unique (tenant_id, nome);

alter table predios       drop constraint if exists predios_nome_unico;
alter table predios       add constraint predios_tenant_nome_unico unique (tenant_id, nome);

alter table politicas_sla drop constraint if exists politicas_sla_prioridade_key;
alter table politicas_sla add constraint sla_tenant_prioridade_unico unique (tenant_id, prioridade);

alter table ocorrencias   drop constraint if exists ocorrencias_import_chave_key;
alter table ocorrencias   add constraint ocorrencias_tenant_import_unico unique (tenant_id, import_chave);

-- configuracoes: PK era (chave); vira (tenant_id, chave)
alter table configuracoes drop constraint if exists configuracoes_pkey;
alter table configuracoes add primary key (tenant_id, chave);

-- locais (predio_id, nome), tecnicos (empresa_id, nome) e modelos
-- (fabricante_id, nome) já são tenant-scoped via pai — permanecem.

-- Índices de tenant nas tabelas mais consultadas
create index if not exists idx_cameras_tenant      on cameras(tenant_id);
create index if not exists idx_ocorrencias_tenant  on ocorrencias(tenant_id, aberta_em);
create index if not exists idx_locais_tenant       on locais(tenant_id);
create index if not exists idx_eventos_tenant      on ocorrencia_eventos(tenant_id);
create index if not exists idx_notificacoes_tenant on notificacoes(tenant_id);
create index if not exists idx_perfis_tenant       on perfis(tenant_id);

-- ---------- 5. Numeração de OS por tenant (decisão D3) ----------

create table if not exists tenant_contadores (
  tenant_id uuid not null references tenants(id) on delete cascade,
  chave     text not null,
  valor     bigint not null default 0,
  primary key (tenant_id, chave)
);

-- inicializa o contador da ALESP com o maior número já usado
insert into tenant_contadores (tenant_id, chave, valor)
select t.id, 'os', coalesce((select max(o.numero) from ocorrencias o where o.tenant_id = t.id), 0)
from tenants t
on conflict (tenant_id, chave) do nothing;

-- numero deixa de ser identity global e passa a ser atribuído por trigger
alter table ocorrencias alter column numero drop identity if exists;

create or replace function public.proximo_numero_os(p_tenant uuid)
returns bigint
language sql volatile security definer set search_path = public
as $$
  insert into tenant_contadores as c (tenant_id, chave, valor)
  values (p_tenant, 'os', 1)
  on conflict (tenant_id, chave) do update set valor = c.valor + 1
  returning valor;
$$;

alter table ocorrencias drop constraint if exists ocorrencias_tenant_numero_unico;
alter table ocorrencias add constraint ocorrencias_tenant_numero_unico unique (tenant_id, numero);

-- ---------- 6. Preenchimento automático de tenant nos INSERTs ----------

create or replace function public.tenant_do_usuario()
returns uuid
language sql stable security definer set search_path = public
as $$
  select tenant_id from perfis where id = auth.uid();
$$;

create or replace function public.eh_super_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from saas_admins where perfil_id = auth.uid());
$$;

-- tenant default a partir do usuário logado (para os CRUDs das fases S2/S3)
create or replace function public.preencher_tenant()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.tenant_id is null then
    new.tenant_id := tenant_do_usuario();
  end if;
  return new;
end;
$$;

do $$
declare t text;
begin
  -- (ocorrencias fica de fora: tem trigger próprio que também numera a OS)
  foreach t in array array[
    'predios','locais','fabricantes','modelos_camera','empresas','tecnicos',
    'nvrs','tipos_defeito','politicas_sla','configuracoes','cameras'
  ] loop
    execute format('drop trigger if exists trg_tenant_default on %I', t);
    execute format(
      'create trigger trg_tenant_default before insert on %I
       for each row execute function preencher_tenant()', t);
  end loop;
end;
$$;

-- Ocorrência: tenant + número da OS + SLA num único trigger (ordem garantida).
-- Substitui o on_ocorrencia_criada da migração 0001, que buscava a política
-- de SLA sem filtrar tenant (pegaria a de qualquer cliente).
create or replace function public.on_ocorrencia_criada()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_horas int;
begin
  if new.tenant_id is null then
    new.tenant_id := tenant_do_usuario();
  end if;
  if new.numero is null then
    new.numero := proximo_numero_os(new.tenant_id);
  end if;
  select horas_solucao into v_horas
  from politicas_sla
  where tenant_id = new.tenant_id and prioridade = new.prioridade;
  if v_horas is not null then
    new.sla_vence_em := new.aberta_em + make_interval(hours => v_horas);
  end if;
  return new;
end;
$$;

-- o trg_ocorrencia_sla da 0001 já aponta para on_ocorrencia_criada (replace
-- acima); remove o trigger genérico de tenant para não duplicar
drop trigger if exists trg_tenant_default on ocorrencias;

-- eventos/anexos/notificações herdam o tenant do pai
create or replace function public.preencher_tenant_do_pai()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.tenant_id is null then
    if tg_table_name in ('ocorrencia_eventos', 'anexos') then
      select tenant_id into new.tenant_id from ocorrencias where id = new.ocorrencia_id;
    elsif tg_table_name = 'notificacoes' then
      select tenant_id into new.tenant_id from perfis where id = new.perfil_id;
    end if;
  end if;
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['ocorrencia_eventos','anexos','notificacoes'] loop
    execute format('drop trigger if exists trg_tenant_pai on %I', t);
    execute format(
      'create trigger trg_tenant_pai before insert on %I
       for each row execute function preencher_tenant_do_pai()', t);
  end loop;
end;
$$;

-- ---------- 7. Convites (substitui o cadastro aberto) ----------

create table if not exists convites (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references tenants(id) on delete cascade,
  email      text not null,
  papel      papel_usuario not null default 'gestor',
  empresa_id uuid references empresas(id),
  criado_por uuid references perfis(id),
  criado_em  timestamptz not null default now(),
  expira_em  timestamptz not null default now() + interval '14 days',
  aceito_em  timestamptz
);

create index if not exists idx_convites_email on convites (lower(email)) where aceito_em is null;

-- o auto-admin por e-mail hardcoded morre: vira um convite-semente do tenant ALESP
insert into convites (tenant_id, email, papel, expira_em)
select id, 'thiago2023leal@gmail.com', 'admin', now() + interval '365 days'
from tenants where slug = 'alesp'
  and not exists (select 1 from perfis p where p.papel = 'admin' and p.tenant_id = tenants.id)
  and not exists (select 1 from convites c where lower(c.email) = 'thiago2023leal@gmail.com');

-- signup passa a exigir convite válido
create or replace function public.handle_novo_usuario()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_convite convites%rowtype;
begin
  select * into v_convite
  from convites
  where lower(email) = lower(new.email)
    and aceito_em is null
    and expira_em > now()
  order by criado_em desc
  limit 1;

  if v_convite.id is null then
    raise exception 'Cadastro permitido apenas com convite do administrador (%).', new.email
      using errcode = 'P0001';
  end if;

  insert into public.perfis (id, nome, papel, tenant_id, empresa_id)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)),
    v_convite.papel,
    v_convite.tenant_id,
    v_convite.empresa_id
  );

  update convites set aceito_em = now() where id = v_convite.id;
  return new;
end;
$$;

-- ---------- 8. Onboarding: criar tenant com seeds padrão ----------

create or replace function public.criar_tenant(p_slug text, p_nome text)
returns uuid
language plpgsql volatile security definer set search_path = public
as $$
declare
  v_id uuid;
begin
  if not eh_super_admin() and current_user not in ('postgres', 'supabase_admin') then
    raise exception 'Apenas super admins podem criar tenants.';
  end if;

  insert into tenants (slug, nome) values (p_slug, p_nome) returning id into v_id;

  insert into politicas_sla (tenant_id, prioridade, horas_atendimento, horas_solucao) values
    (v_id, 'critica', 4,  24), (v_id, 'alta', 8, 48),
    (v_id, 'media', 24, 120), (v_id, 'baixa', 48, 240);

  insert into configuracoes (tenant_id, chave, valor, descricao) values
    (v_id, 'alerta_dias_camera_parada', '7',  'Dias de câmera parada para gerar alerta'),
    (v_id, 'alerta_dias_os_sem_atualizacao', '5', 'Dias sem atualização em OS aberta para gerar alerta'),
    (v_id, 'reincidencia_min_ocorrencias', '3', 'Nº de ocorrências em 12 meses para marcar câmera como reincidente');

  insert into tipos_defeito (tenant_id, nome, categoria)
  select v_id, nome, categoria from tipos_defeito
  where tenant_id = (select id from tenants where slug = 'alesp');

  return v_id;
end;
$$;

-- ---------- 9. RLS v2: tenant + papéis (regras atuais preservadas) ----------

alter table tenants           enable row level security;
alter table saas_admins       enable row level security;
alter table convites          enable row level security;
alter table tenant_contadores enable row level security;

-- remove TODAS as políticas antigas das tabelas de domínio (serão recriadas)
do $$
declare pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'predios','locais','fabricantes','modelos_camera','empresas','tecnicos',
        'nvrs','tipos_defeito','politicas_sla','configuracoes','perfis','cameras',
        'ocorrencias','ocorrencia_eventos','anexos','notificacoes')
  loop
    execute format('drop policy %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end;
$$;

-- Leitura: autenticado, dentro do próprio tenant
do $$
declare t text;
begin
  foreach t in array array[
    'predios','locais','fabricantes','modelos_camera','empresas','tecnicos',
    'nvrs','tipos_defeito','politicas_sla','configuracoes','cameras',
    'ocorrencias','ocorrencia_eventos','anexos'
  ] loop
    execute format(
      'create policy "t_leitura" on %I for select to authenticated
       using (tenant_id = tenant_do_usuario());', t);
  end loop;
end;
$$;

-- Escrita geral: admin e operador, dentro do próprio tenant
do $$
declare t text;
begin
  foreach t in array array[
    'predios','locais','fabricantes','modelos_camera','empresas','tecnicos',
    'nvrs','tipos_defeito','cameras','ocorrencias','ocorrencia_eventos','anexos'
  ] loop
    execute format(
      'create policy "t_escrita_operador" on %I for all to authenticated
       using (tenant_id = tenant_do_usuario() and papel_atual() in (''admin'',''operador''))
       with check (tenant_id = tenant_do_usuario() and papel_atual() in (''admin'',''operador''));', t);
  end loop;
end;
$$;

-- Papel 'empresa': atualiza as OS da sua empresa (regra original + tenant)
create policy "t_empresa_atualiza_os" on ocorrencias
  for update to authenticated
  using (tenant_id = tenant_do_usuario()
         and papel_atual() = 'empresa' and empresa_id = empresa_do_usuario())
  with check (tenant_id = tenant_do_usuario()
         and papel_atual() = 'empresa' and empresa_id = empresa_do_usuario());

create policy "t_empresa_eventos" on ocorrencia_eventos
  for insert to authenticated
  with check (
    tenant_id = tenant_do_usuario() and papel_atual() = 'empresa' and exists (
      select 1 from ocorrencias o
      where o.id = ocorrencia_id and o.empresa_id = empresa_do_usuario()
    )
  );

create policy "t_empresa_anexos" on anexos
  for insert to authenticated
  with check (
    tenant_id = tenant_do_usuario() and papel_atual() = 'empresa' and exists (
      select 1 from ocorrencias o
      where o.id = ocorrencia_id and o.empresa_id = empresa_do_usuario()
    )
  );

-- SLA e configurações: só admin altera (do próprio tenant)
create policy "t_sla_admin" on politicas_sla for all to authenticated
  using (tenant_id = tenant_do_usuario() and papel_atual() = 'admin')
  with check (tenant_id = tenant_do_usuario() and papel_atual() = 'admin');
create policy "t_config_admin" on configuracoes for all to authenticated
  using (tenant_id = tenant_do_usuario() and papel_atual() = 'admin')
  with check (tenant_id = tenant_do_usuario() and papel_atual() = 'admin');

-- Perfis: o próprio, ou o admin do MESMO tenant
create policy "t_perfil_select" on perfis for select to authenticated
  using (id = auth.uid()
         or (papel_atual() = 'admin' and tenant_id = tenant_do_usuario()));
create policy "t_perfil_admin_update" on perfis for update to authenticated
  using (papel_atual() = 'admin' and tenant_id = tenant_do_usuario())
  with check (papel_atual() = 'admin' and tenant_id = tenant_do_usuario());

-- Notificações: cada usuário vê e atualiza as suas
create policy "t_notif_select" on notificacoes for select to authenticated
  using (perfil_id = auth.uid());
create policy "t_notif_update" on notificacoes for update to authenticated
  using (perfil_id = auth.uid()) with check (perfil_id = auth.uid());

-- Tenants: usuário vê o seu; super admin vê e gerencia todos
create policy "t_tenant_proprio" on tenants for select to authenticated
  using (id = tenant_do_usuario() or eh_super_admin());
create policy "t_tenant_super" on tenants for all to authenticated
  using (eh_super_admin()) with check (eh_super_admin());

-- Convites: admin do tenant gerencia os do seu tenant; super admin todos
create policy "t_convites_admin" on convites for all to authenticated
  using ((tenant_id = tenant_do_usuario() and papel_atual() = 'admin') or eh_super_admin())
  with check ((tenant_id = tenant_do_usuario() and papel_atual() = 'admin') or eh_super_admin());

-- saas_admins: cada um vê o próprio registro (gestão só via SQL/console)
create policy "t_saas_admin_self" on saas_admins for select to authenticated
  using (perfil_id = auth.uid());

-- tenant_contadores: sem acesso direto (só via função security definer)

-- ---------- 10. Views de KPI passam a respeitar RLS ----------

alter view v_kpis                 set (security_invoker = true);
alter view v_ocorrencias_mensal   set (security_invoker = true);
alter view v_ranking_locais       set (security_invoker = true);
alter view v_ranking_defeitos     set (security_invoker = true);
alter view v_ranking_empresas     set (security_invoker = true);
alter view v_cameras_dias_parada  set (security_invoker = true);
alter view v_cameras_reincidentes set (security_invoker = true);
