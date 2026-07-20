-- ============================================================
-- S2 — Branding por tenant
-- 1) Admin do tenant pode editar o PRÓPRIO tenant (personalização)
-- 2) RPC pública de branding para as telas de login/cadastro
--    (nome e cores não são dados sensíveis; nada operacional vaza)
-- ============================================================

-- Admin do tenant atualiza o próprio tenant (branding/nome).
-- slug e ativo continuam restritos ao super admin (WITH CHECK impede troca de id;
-- a coluna slug é protegida por trigger abaixo).
create policy "t_tenant_admin_update" on tenants
  for update to authenticated
  using (id = tenant_do_usuario() and papel_atual() = 'admin')
  with check (id = tenant_do_usuario() and papel_atual() = 'admin');

-- protege slug/ativo de alteração por quem não é super admin
create or replace function public.protege_tenant_campos()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not eh_super_admin() and current_user not in ('postgres', 'supabase_admin') then
    new.slug := old.slug;
    new.ativo := old.ativo;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_protege_tenant on tenants;
create trigger trg_protege_tenant
  before update on tenants
  for each row execute function protege_tenant_campos();

-- Branding público por slug (para o login exibir a marca do cliente via ?t=slug)
create or replace function public.branding_publico(p_slug text)
returns jsonb
language sql stable security definer set search_path = public
as $$
  select jsonb_build_object('nome', nome, 'branding', branding)
  from tenants
  where slug = p_slug and ativo;
$$;

grant execute on function public.branding_publico(text) to anon, authenticated;
