-- ============================================================
-- Status "Degradada" + mapeamento Tipo de defeito → Status da câmera
--
-- Antes: qualquer OS em aberto deixava a câmera 'inoperante', sem olhar
-- o defeito. Agora cada tipo de defeito carrega o status operacional que
-- a câmera assume enquanto a OS estiver aberta:
--   Inoperante        → inoperante
--   Removida por obra → desligada
--   demais defeitos   → degradada  (imagem/rede degradada, câmera ainda útil)
--   sem defeito       → inoperante (fallback, mantém o comportamento antigo)
--
-- O mapeamento vira dado (tipos_defeito.status_camera), não código: o
-- administrador ajusta pelo cadastro de defeitos sem migração nova.
--
-- Encerramento: ao concluir/cancelar a OS a câmera volta ao status que
-- tinha ANTES da abertura (ocorrencias.status_camera_anterior), e não
-- mais a um 'operante' fixo. Continua valendo a proteção original: se
-- alguém já mexeu no status da câmera na mão (ex.: modal "Atualizar
-- status da câmera" no aceite da OS), a trigger não sobrescreve.
-- ============================================================

-- ---------- 1. camera_status: 6 valores (+ degradada) ----------
-- Recriação do tipo (mesmo padrão das migrações 20260718/20260720):
-- `alter type ... add value` não pode ser usado na mesma transação que
-- o consome, e esta migração precisa do valor novo já nos defaults.

create type camera_status_novo as enum
  ('operante', 'degradada', 'inoperante', 'desligada', 'em_manutencao',
   'desligada_permanentemente');

drop view if exists v_kpis;
drop view if exists v_cameras_dias_parada;

alter table cameras alter column status drop default;
alter table cameras alter column status type camera_status_novo
  using status::text::camera_status_novo;
alter table cameras alter column status set default 'operante';

alter table camera_eventos alter column status_anterior type camera_status_novo
  using status_anterior::text::camera_status_novo;
alter table camera_eventos alter column status_novo type camera_status_novo
  using status_novo::text::camera_status_novo;

drop type camera_status;
alter type camera_status_novo rename to camera_status;

-- ---------- 2. Mapeamento defeito → status da câmera ----------

alter table tipos_defeito
  add column status_camera camera_status not null default 'degradada';

comment on column tipos_defeito.status_camera is
  'Status operacional que a câmera assume enquanto houver OS aberta com este defeito.';

update tipos_defeito set status_camera = 'inoperante' where nome = 'Inoperante';
update tipos_defeito set status_camera = 'desligada'  where nome = 'Removida por obra';

-- ---------- 3. Memória do status anterior na própria OS ----------

alter table ocorrencias
  add column status_camera_anterior camera_status,
  add column status_camera_aplicado camera_status;

comment on column ocorrencias.status_camera_anterior is
  'Status da câmera imediatamente antes desta OS abrir — restaurado ao concluir/cancelar.';
comment on column ocorrencias.status_camera_aplicado is
  'Status que esta OS aplicou na câmera; null quando a OS não está mais em aberto.';

-- ---------- 4. Sincronização ----------

create or replace function public.sincronizar_status_camera_por_ocorrencia()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_alvo  camera_status;
  v_atual camera_status;
begin
  if new.camera_id is null then
    return new;
  end if;

  select c.status into v_atual from cameras c where c.id = new.camera_id;

  -- câmera retirada em definitivo do parque nunca é tocada por esta regra
  if v_atual is null or v_atual = 'desligada_permanentemente' then
    return new;
  end if;

  if new.status in ('aberta', 'em_andamento', 'aguardando_aceite') then
    select td.status_camera into v_alvo
      from tipos_defeito td
     where td.id = new.tipo_defeito_id;
    v_alvo := coalesce(v_alvo, 'inoperante');

    if new.status_camera_aplicado is null then
      -- primeira vez que esta OS mexe na câmera: guarda o estado anterior
      new.status_camera_anterior := v_atual;
    elsif v_atual is distinct from new.status_camera_aplicado then
      -- alguém já ajustou o status na mão depois da abertura — respeita
      return new;
    end if;

    if v_atual is distinct from v_alvo then
      update cameras set status = v_alvo where id = new.camera_id;
    end if;
    new.status_camera_aplicado := v_alvo;

  elsif new.status in ('concluida', 'cancelada') then
    if new.status_camera_aplicado is not null
       and v_atual = new.status_camera_aplicado
       and not exists (
         select 1 from ocorrencias
          where camera_id = new.camera_id
            and id <> new.id
            and status in ('aberta', 'em_andamento', 'aguardando_aceite')
       )
    then
      update cameras
         set status = coalesce(new.status_camera_anterior, 'operante')
       where id = new.camera_id;
    end if;
    new.status_camera_aplicado := null;
  end if;

  return new;
end;
$$;

-- BEFORE (era AFTER): permite gravar status_camera_anterior/aplicado no
-- próprio NEW, sem um UPDATE extra que reentraria na trigger.
drop trigger if exists trg_sincronizar_status_camera on ocorrencias;
create trigger trg_sincronizar_status_camera
  before insert or update of status, tipo_defeito_id on ocorrencias
  for each row execute function sincronizar_status_camera_por_ocorrencia();

-- ---------- 5. Backfill das OS já em aberto ----------
-- Não inclui `status` nem `tipo_defeito_id` no SET, então não reentra na
-- trigger. O status anterior real dessas OS não existe no histórico —
-- 'operante' reproduz exatamente o que a regra antiga fazia ao encerrar.

update ocorrencias o
   set status_camera_anterior = 'operante',
       status_camera_aplicado = coalesce(
         (select td.status_camera from tipos_defeito td where td.id = o.tipo_defeito_id),
         'inoperante')
 where o.camera_id is not null
   and o.status in ('aberta', 'em_andamento', 'aguardando_aceite');

-- só reclassifica câmeras que estão 'inoperante' por causa da regra
-- antiga; qualquer outro status foi escolha explícita de alguém
with alvo as (
  select distinct on (o.camera_id) o.camera_id, o.status_camera_aplicado
    from ocorrencias o
   where o.camera_id is not null
     and o.status in ('aberta', 'em_andamento', 'aguardando_aceite')
   order by o.camera_id, o.aberta_em asc
)
update cameras c
   set status = a.status_camera_aplicado
  from alvo a
 where a.camera_id = c.id
   and c.status = 'inoperante'
   and a.status_camera_aplicado <> 'inoperante';

-- ---------- 6. Views recriadas (com degradadas) ----------

create or replace view v_kpis as
select
  (select count(*) from cameras where status <> 'desligada_permanentemente')                    as total_cameras,
  (select count(*) from cameras where status = 'operante')                                        as operantes,
  (select count(*) from cameras where status = 'degradada')                                       as degradadas,
  (select count(*) from cameras where status in ('inoperante', 'desligada'))                       as inoperantes,
  (select count(*) from cameras where status = 'em_manutencao')                                    as em_manutencao,
  (select count(*) from ocorrencias where status not in ('concluida', 'cancelada'))                as ocorrencias_abertas,
  (select count(*) from ocorrencias where status not in ('concluida', 'cancelada')
     and sla_vence_em < now())                                                                     as sla_vencidos,
  round(
    100.0 * (select count(*) from cameras where status = 'operante')
    / nullif((select count(*) from cameras where status <> 'desligada_permanentemente'), 0), 1
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

-- ---------- 7. Novos tenants herdam o mapeamento ----------

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

  insert into tipos_defeito (tenant_id, nome, categoria, status_camera)
  select v_id, nome, categoria, status_camera from tipos_defeito
  where tenant_id = (select id from tenants where slug = 'alesp');

  return v_id;
end;
$$;
