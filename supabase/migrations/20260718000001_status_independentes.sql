-- ============================================================
-- Status da Câmera x Status da Ocorrência — independência total
-- A partir desta migração, nenhuma trigger de ocorrência escreve
-- em `cameras`. Toda mudança de status de câmera é uma ação
-- explícita (edição direta ou o modal de aceite da OS) e fica
-- registrada em `camera_eventos`, histórico próprio da câmera.
-- ============================================================

-- ---------- 1. camera_status: 6 valores, removida/desativada -> desligada ----------

create type camera_status_novo as enum
  ('operante', 'inoperante', 'desligada', 'em_manutencao', 'aguardando_pecas', 'aguardando_visita');

-- views dependentes da coluna cameras.status precisam ser recriadas
drop view if exists v_kpis;
drop view if exists v_cameras_dias_parada;

alter table cameras alter column status drop default;
alter table cameras alter column status type camera_status_novo
  using (
    case status::text
      when 'removida' then 'desligada'
      when 'desativada' then 'desligada'
      else status::text
    end
  )::camera_status_novo;
alter table cameras alter column status set default 'operante';

drop type camera_status;
alter type camera_status_novo rename to camera_status;

-- ---------- 2. SLA explícito por OS (substitui o cálculo por prioridade) ----------

alter table ocorrencias add column sla_horas int;

create or replace function public.on_ocorrencia_criada()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.tenant_id is null then
    new.tenant_id := tenant_do_usuario();
  end if;
  if new.numero is null then
    new.numero := proximo_numero_os(new.tenant_id);
  end if;
  if new.sla_horas is not null then
    new.sla_vence_em := new.aberta_em + make_interval(hours => new.sla_horas);
  else
    new.sla_vence_em := null;
  end if;
  return new;
end;
$$;

-- ---------- 3. Triggers de OS deixam de tocar em `cameras` ----------

create or replace function public.after_ocorrencia_criada()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into ocorrencia_eventos (ocorrencia_id, autor_id, tipo, status_novo, mensagem)
  values (new.id, new.criada_por, 'abertura', new.status, 'Ocorrência aberta');
  return new;
end;
$$;

create or replace function public.on_ocorrencia_status_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into ocorrencia_eventos
      (ocorrencia_id, autor_id, tipo, status_anterior, status_novo)
    values
      (new.id, auth.uid(), 'mudanca_status', old.status, new.status);

    if new.status = 'concluida' and new.encerrada_em is null then
      new.encerrada_em := now();
    end if;

    if old.status = 'aberta' and new.primeira_resposta_em is null then
      new.primeira_resposta_em := now();
    end if;
  end if;
  return new;
end;
$$;

-- ---------- 4. Histórico próprio da câmera ----------

create table camera_eventos (
  id              uuid primary key default gen_random_uuid(),
  camera_id       uuid not null references cameras(id) on delete cascade,
  autor_id        uuid references perfis(id),
  tipo            text not null default 'mudanca_status',
  status_anterior camera_status,
  status_novo     camera_status,
  mensagem        text,
  criado_em       timestamptz not null default now(),
  tenant_id       uuid not null references tenants(id)
);

create index idx_camera_eventos_camera on camera_eventos (camera_id);
create index idx_camera_eventos_tenant on camera_eventos (tenant_id);

alter table camera_eventos enable row level security;

create policy "t_leitura" on camera_eventos for select to authenticated
  using (tenant_id = tenant_do_usuario());

-- preencher_tenant_do_pai() ganha o caso de camera_eventos
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
    elsif tg_table_name = 'camera_eventos' then
      select tenant_id into new.tenant_id from cameras where id = new.camera_id;
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_tenant_pai
  before insert on camera_eventos
  for each row execute function preencher_tenant_do_pai();

-- só regista quando o status realmente muda — cobre tanto a edição
-- direta da câmera quanto o modal de aceite da OS, sem duplicar lógica
create or replace function public.on_camera_status_change()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into camera_eventos (camera_id, autor_id, tipo, status_anterior, status_novo, tenant_id)
    values (new.id, auth.uid(), 'mudanca_status', old.status, new.status, new.tenant_id);
  end if;
  return new;
end;
$$;

create trigger trg_camera_status
  after update on cameras
  for each row execute function on_camera_status_change();

-- ---------- 5. Views recriadas (sem exclusão de removida/desativada — não existem mais) ----------

create or replace view v_kpis as
select
  (select count(*) from cameras)                                                                  as total_cameras,
  (select count(*) from cameras where status = 'operante')                                        as operantes,
  (select count(*) from cameras where status in ('inoperante', 'desligada'))                       as inoperantes,
  (select count(*) from cameras where status = 'em_manutencao')                                    as em_manutencao,
  (select count(*) from cameras where status in ('aguardando_pecas', 'aguardando_visita'))          as aguardando,
  (select count(*) from ocorrencias where status not in ('concluida', 'cancelada'))                as ocorrencias_abertas,
  (select count(*) from ocorrencias where status not in ('concluida', 'cancelada')
     and sla_vence_em < now())                                                                     as sla_vencidos,
  round(
    100.0 * (select count(*) from cameras where status = 'operante')
    / nullif((select count(*) from cameras), 0), 1
  )                                                                                                as disponibilidade_pct,
  (select round(avg(extract(epoch from (encerrada_em - aberta_em)) / 86400.0)::numeric, 1)
     from ocorrencias where status = 'concluida' and encerrada_em is not null)                     as mttr_dias;
alter view v_kpis set (security_invoker = true);

create or replace view v_cameras_dias_parada as
select c.id, c.numero, c.status, l.nome as local, p.nome as predio,
       o.id as ocorrencia_id, o.numero as os_numero, o.aberta_em,
       extract(day from now() - o.aberta_em)::int as dias_parada
from cameras c
join lateral (
  select * from ocorrencias oc
  where oc.camera_id = c.id and oc.status not in ('concluida', 'cancelada')
  order by oc.aberta_em asc
  limit 1
) o on true
left join locais l  on l.id = c.local_id
left join predios p on p.id = l.predio_id
order by dias_parada desc;
alter view v_cameras_dias_parada set (security_invoker = true);
