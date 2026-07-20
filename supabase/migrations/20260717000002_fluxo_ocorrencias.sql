-- ============================================================
-- Fluxo operacional de Ocorrências — 5 status
-- Aberta -> Em andamento -> Aguardando aceite -> Concluída / (reprovada volta a Em andamento)
-- ou Cancelada a qualquer momento antes da conclusão.
-- ============================================================

-- ---------- 1. Novo enum com só os 5 status do fluxo real ----------
-- Os status intermediários antigos (aguardando_pecas/aguardando_visita/
-- aguardando_terceiros) migram para em_andamento — o motivo específico já
-- fica preservado no campo livre "impedimento", nenhuma informação se perde.
create type ocorrencia_status_novo as enum
  ('aberta', 'em_andamento', 'aguardando_aceite', 'concluida', 'cancelada');

-- Views que dependem da coluna ocorrencias.status precisam ser recriadas
drop view if exists v_kpis;
drop view if exists v_ocorrencias_mensal;
drop view if exists v_ranking_empresas;
drop view if exists v_cameras_dias_parada;

alter table ocorrencias alter column status drop default;
alter table ocorrencias alter column status type ocorrencia_status_novo
  using (
    case status::text
      when 'aguardando_pecas' then 'em_andamento'
      when 'aguardando_visita' then 'em_andamento'
      when 'aguardando_terceiros' then 'em_andamento'
      else status::text
    end
  )::ocorrencia_status_novo;
alter table ocorrencias alter column status set default 'aberta';

alter table ocorrencia_eventos alter column status_anterior type ocorrencia_status_novo
  using (
    case status_anterior::text
      when 'aguardando_pecas' then 'em_andamento'
      when 'aguardando_visita' then 'em_andamento'
      when 'aguardando_terceiros' then 'em_andamento'
      else status_anterior::text
    end
  )::ocorrencia_status_novo;
alter table ocorrencia_eventos alter column status_novo type ocorrencia_status_novo
  using (
    case status_novo::text
      when 'aguardando_pecas' then 'em_andamento'
      when 'aguardando_visita' then 'em_andamento'
      when 'aguardando_terceiros' then 'em_andamento'
      else status_novo::text
    end
  )::ocorrencia_status_novo;

drop type ocorrencia_status;
alter type ocorrencia_status_novo rename to ocorrencia_status;

-- Recriar as views (mesma lógica de antes — 'concluida'/'cancelada' continuam existindo)
create or replace view v_kpis as
select
  (select count(*) from cameras where status not in ('removida','desativada'))                    as total_cameras,
  (select count(*) from cameras where status = 'operante')                                        as operantes,
  (select count(*) from cameras where status = 'inoperante')                                      as inoperantes,
  (select count(*) from cameras where status = 'em_manutencao')                                   as em_manutencao,
  (select count(*) from cameras where status in ('aguardando_pecas','aguardando_visita'))         as aguardando,
  (select count(*) from ocorrencias where status not in ('concluida','cancelada'))                as ocorrencias_abertas,
  (select count(*) from ocorrencias where status not in ('concluida','cancelada')
     and sla_vence_em < now())                                                                    as sla_vencidos,
  round(
    100.0 * (select count(*) from cameras where status = 'operante')
    / nullif((select count(*) from cameras where status not in ('removida','desativada')), 0), 1
  )                                                                                               as disponibilidade_pct,
  (select round(avg(extract(epoch from (encerrada_em - aberta_em)) / 86400.0)::numeric, 1)
     from ocorrencias where status = 'concluida' and encerrada_em is not null)                    as mttr_dias;
alter view v_kpis set (security_invoker = true);

create or replace view v_ocorrencias_mensal as
select
  date_trunc('month', aberta_em)::date                                        as mes,
  count(*)                                                                    as novas,
  count(*) filter (where status = 'concluida')                                as concluidas,
  round(avg(extract(epoch from (encerrada_em - aberta_em)) / 86400.0)
        filter (where encerrada_em is not null)::numeric, 1)                  as mttr_dias
from ocorrencias
group by 1
order by 1;
alter view v_ocorrencias_mensal set (security_invoker = true);

create or replace view v_ranking_empresas as
select e.id, e.nome,
       count(o.id)                                                            as total_ocorrencias,
       count(o.id) filter (where o.status = 'concluida')                      as concluidas,
       round(avg(extract(epoch from (o.encerrada_em - o.aberta_em)) / 86400.0)
             filter (where o.encerrada_em is not null)::numeric, 1)           as mttr_dias,
       round(100.0 * count(o.id) filter (where o.status = 'concluida'
             and o.encerrada_em <= o.sla_vence_em)
             / nullif(count(o.id) filter (where o.status = 'concluida'), 0), 1) as pct_dentro_sla
from empresas e
left join ocorrencias o on o.empresa_id = e.id
group by e.id, e.nome
order by total_ocorrencias desc;
alter view v_ranking_empresas set (security_invoker = true);

create or replace view v_cameras_dias_parada as
select c.id, c.numero, c.status, l.nome as local, p.nome as predio,
       o.id as ocorrencia_id, o.numero as os_numero, o.aberta_em,
       extract(day from now() - o.aberta_em)::int as dias_parada
from cameras c
join lateral (
  select * from ocorrencias oc
  where oc.camera_id = c.id and oc.status not in ('concluida','cancelada')
  order by oc.aberta_em asc
  limit 1
) o on true
left join locais l  on l.id = c.local_id
left join predios p on p.id = l.predio_id
order by dias_parada desc;
alter view v_cameras_dias_parada set (security_invoker = true);

-- ---------- 2. Mapeamento câmera <-> status simplificado ----------
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

    if new.status in ('concluida','cancelada') then
      if new.encerrada_em is null and new.status = 'concluida' then
        new.encerrada_em := now();
      end if;
      if new.camera_id is not null and not exists (
        select 1 from ocorrencias o
        where o.camera_id = new.camera_id
          and o.id <> new.id
          and o.status not in ('concluida','cancelada')
      ) then
        update cameras set status = 'operante' where id = new.camera_id;
      end if;
    elsif new.camera_id is not null then
      -- em_andamento e aguardando_aceite: câmera segue em manutenção
      update cameras set status = case new.status
          when 'em_andamento'      then 'em_manutencao'::camera_status
          when 'aguardando_aceite' then 'em_manutencao'::camera_status
          else 'inoperante'::camera_status
        end
      where id = new.camera_id and status <> 'removida' and status <> 'desativada';
    end if;

    if old.status = 'aberta' and new.primeira_resposta_em is null then
      new.primeira_resposta_em := now();
    end if;
  end if;
  return new;
end;
$$;

-- ---------- 3. Empresa contratada nunca conclui/cancela/reabre diretamente ----------
-- Garantia no banco, não só botão escondido: mesmo chamando a API direto,
-- só pode mover a OS entre em_andamento e aguardando_aceite.
create or replace function public.valida_transicao_empresa()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.status is distinct from old.status and papel_atual() = 'empresa_contratada' then
    if new.status not in ('em_andamento', 'aguardando_aceite') then
      raise exception 'Empresa contratada não pode alterar a ocorrência para este status.'
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_valida_transicao_empresa on ocorrencias;
create trigger trg_valida_transicao_empresa
  before update on ocorrencias
  for each row execute function valida_transicao_empresa();
