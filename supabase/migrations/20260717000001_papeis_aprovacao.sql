-- ============================================================
-- Módulo de Usuários, Permissões e Aprovação
-- Papéis nomeados conforme a operação real do CFTC ALESP +
-- auto-cadastro público com aprovação obrigatória do administrador.
-- ============================================================

-- ---------- 1. Papéis: renomear para os nomes reais da operação ----------
-- admin -> administrador · operador -> operador_cftc · empresa -> empresa_contratada
-- gestor permanece · fiscal_alesp é novo (somente leitura, igual gestor)
alter type papel_usuario rename value 'admin' to 'administrador';
alter type papel_usuario rename value 'operador' to 'operador_cftc';
alter type papel_usuario rename value 'empresa' to 'empresa_contratada';
alter type papel_usuario add value 'fiscal_alesp';

-- ---------- 2. Status de aprovação do cadastro ----------
create type status_usuario as enum ('pendente', 'aprovado', 'rejeitado', 'bloqueado', 'excluido');

-- papel só é definido na aprovação — nasce nulo
alter table perfis alter column papel drop not null;
alter table perfis add column status status_usuario not null default 'pendente';
alter table perfis add column telefone text;
alter table perfis add column empresa_informada text;
alter table perfis add column email text;
alter table perfis add column aprovado_por uuid references perfis(id);
alter table perfis add column aprovado_em timestamptz;
alter table perfis add column ultimo_acesso timestamptz;

update perfis set email = (select u.email from auth.users u where u.id = perfis.id)
where email is null;

-- quem já tinha papel definido (perfis criados antes deste módulo) já nasce aprovado
update perfis set status = 'aprovado', aprovado_em = criado_em where papel is not null;

-- ---------- 3. Auto-cadastro público (substitui o modelo por convite) ----------
-- Qualquer pessoa pode se cadastrar; a conta nasce "pendente" e sem papel —
-- só o administrador aprova e escolhe o papel (RLS trava tudo até aprovar,
-- ver tenant_do_usuario() abaixo). thiago2023leal@gmail.com continua o
-- bootstrap automático do sistema (mesma regra da v1 original).
create or replace function public.handle_novo_usuario()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_tenant_id uuid;
begin
  select id into v_tenant_id from tenants where slug = 'alesp';

  if lower(new.email) = 'thiago2023leal@gmail.com' then
    insert into public.perfis (id, nome, email, papel, status, tenant_id, aprovado_em)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)),
      new.email,
      'administrador',
      'aprovado',
      v_tenant_id,
      now()
    );
  else
    insert into public.perfis (id, nome, email, telefone, empresa_informada, status, tenant_id)
    values (
      new.id,
      coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)),
      new.email,
      new.raw_user_meta_data ->> 'telefone',
      new.raw_user_meta_data ->> 'empresa',
      'pendente',
      v_tenant_id
    );
  end if;
  return new;
end;
$$;

-- (trigger on_auth_user_created já existe desde a 0001 e já aponta pra esta função)

-- ---------- 4. Bloqueio de acesso por status: um único ponto de controle ----------
-- Toda tabela do sistema já filtra por tenant_id = tenant_do_usuario(); fazendo
-- essa função exigir status='aprovado', derruba o acesso a tudo de uma vez para
-- quem está pendente/rejeitado/bloqueado/excluído, sem tocar em cada policy.
create or replace function public.tenant_do_usuario()
returns uuid
language sql stable security definer set search_path = public
as $$
  select tenant_id from perfis where id = auth.uid() and status = 'aprovado';
$$;

-- ---------- 5. Último acesso (auth.users não é consultável direto pelo cliente) ----------
create or replace function public.sync_ultimo_acesso()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  update public.perfis set ultimo_acesso = new.last_sign_in_at where id = new.id;
  return new;
end;
$$;

drop trigger if exists on_auth_user_login on auth.users;
create trigger on_auth_user_login
  after update on auth.users
  for each row
  when (new.last_sign_in_at is distinct from old.last_sign_in_at)
  execute function public.sync_ultimo_acesso();

-- ---------- 6. Recriar policies que citam os nomes antigos de papel ----------

drop policy if exists "t_escrita_operador" on predios;
drop policy if exists "t_escrita_operador" on locais;
drop policy if exists "t_escrita_operador" on fabricantes;
drop policy if exists "t_escrita_operador" on modelos_camera;
drop policy if exists "t_escrita_operador" on empresas;
drop policy if exists "t_escrita_operador" on tecnicos;
drop policy if exists "t_escrita_operador" on nvrs;
drop policy if exists "t_escrita_operador" on tipos_defeito;
drop policy if exists "t_escrita_operador" on cameras;
drop policy if exists "t_escrita_operador" on ocorrencias;
drop policy if exists "t_escrita_operador" on ocorrencia_eventos;
drop policy if exists "t_escrita_operador" on anexos;

do $$
declare t text;
begin
  foreach t in array array[
    'predios','locais','fabricantes','modelos_camera','empresas','tecnicos',
    'nvrs','tipos_defeito','cameras','ocorrencia_eventos','anexos'
  ] loop
    execute format(
      'create policy "t_escrita_operador" on %I for all to authenticated
       using (tenant_id = tenant_do_usuario() and papel_atual() in (''administrador'',''operador_cftc''))
       with check (tenant_id = tenant_do_usuario() and papel_atual() in (''administrador'',''operador_cftc''));', t);
  end loop;
end;
$$;

-- ocorrencias: leitura passa a ser role-aware (empresa_contratada só vê as
-- próprias OS) e ganha sua própria policy de escrita geral
drop policy if exists "t_leitura" on ocorrencias;
create policy "t_leitura" on ocorrencias for select to authenticated
  using (
    tenant_id = tenant_do_usuario()
    and (papel_atual() <> 'empresa_contratada' or empresa_id = empresa_do_usuario())
  );

create policy "t_escrita_operador" on ocorrencias for all to authenticated
  using (tenant_id = tenant_do_usuario() and papel_atual() in ('administrador','operador_cftc'))
  with check (tenant_id = tenant_do_usuario() and papel_atual() in ('administrador','operador_cftc'));

drop policy if exists "t_empresa_atualiza_os" on ocorrencias;
create policy "t_empresa_atualiza_os" on ocorrencias
  for update to authenticated
  using (tenant_id = tenant_do_usuario()
         and papel_atual() = 'empresa_contratada' and empresa_id = empresa_do_usuario())
  with check (tenant_id = tenant_do_usuario()
         and papel_atual() = 'empresa_contratada' and empresa_id = empresa_do_usuario());

drop policy if exists "t_empresa_eventos" on ocorrencia_eventos;
create policy "t_empresa_eventos" on ocorrencia_eventos
  for insert to authenticated
  with check (
    tenant_id = tenant_do_usuario() and papel_atual() = 'empresa_contratada' and exists (
      select 1 from ocorrencias o
      where o.id = ocorrencia_id and o.empresa_id = empresa_do_usuario()
    )
  );

drop policy if exists "t_empresa_anexos" on anexos;
create policy "t_empresa_anexos" on anexos
  for insert to authenticated
  with check (
    tenant_id = tenant_do_usuario() and papel_atual() = 'empresa_contratada' and exists (
      select 1 from ocorrencias o
      where o.id = ocorrencia_id and o.empresa_id = empresa_do_usuario()
    )
  );

drop policy if exists "t_sla_admin" on politicas_sla;
create policy "t_sla_admin" on politicas_sla for all to authenticated
  using (tenant_id = tenant_do_usuario() and papel_atual() = 'administrador')
  with check (tenant_id = tenant_do_usuario() and papel_atual() = 'administrador');

drop policy if exists "t_config_admin" on configuracoes;
create policy "t_config_admin" on configuracoes for all to authenticated
  using (tenant_id = tenant_do_usuario() and papel_atual() = 'administrador')
  with check (tenant_id = tenant_do_usuario() and papel_atual() = 'administrador');

drop policy if exists "t_perfil_select" on perfis;
create policy "t_perfil_select" on perfis for select to authenticated
  using (id = auth.uid()
         or (papel_atual() = 'administrador' and tenant_id = tenant_do_usuario()));

drop policy if exists "t_perfil_admin_update" on perfis;
create policy "t_perfil_admin_update" on perfis for update to authenticated
  using (papel_atual() = 'administrador' and tenant_id = tenant_do_usuario())
  with check (papel_atual() = 'administrador' and tenant_id = tenant_do_usuario());

drop policy if exists "t_convites_admin" on convites;
create policy "t_convites_admin" on convites for all to authenticated
  using ((tenant_id = tenant_do_usuario() and papel_atual() = 'administrador') or eh_super_admin())
  with check ((tenant_id = tenant_do_usuario() and papel_atual() = 'administrador') or eh_super_admin());

drop policy if exists "t_tenant_admin_update" on tenants;
create policy "t_tenant_admin_update" on tenants
  for update to authenticated
  using (id = tenant_do_usuario() and papel_atual() = 'administrador')
  with check (id = tenant_do_usuario() and papel_atual() = 'administrador');

-- Storage (bucket anexos): mesmos literais de papel
drop policy if exists "t_anexos_upload" on storage.objects;
create policy "t_anexos_upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'anexos'
    and (storage.foldername(name))[1] = tenant_do_usuario()::text
    and (
      papel_atual() in ('administrador', 'operador_cftc')
      or (
        papel_atual() = 'empresa_contratada'
        and exists (
          select 1 from ocorrencias o
          where o.id::text = (storage.foldername(name))[2]
            and o.empresa_id = empresa_do_usuario()
        )
      )
    )
  );

drop policy if exists "t_anexos_exclusao" on storage.objects;
create policy "t_anexos_exclusao" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'anexos'
    and (storage.foldername(name))[1] = tenant_do_usuario()::text
    and papel_atual() in ('administrador', 'operador_cftc')
  );
