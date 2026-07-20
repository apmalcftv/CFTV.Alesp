-- ============================================================
-- Ajuste de status de câmera + empresa responsável
-- Remove aguardando_pecas/aguardando_visita (não usados em produção),
-- adiciona desligada_permanentemente (câmera retirada em definitivo do
-- parque — não deve entrar em nenhum indicador do Dashboard/Executivo,
-- só permanece visível/filtrável em Câmeras e Relatórios).
-- ============================================================

-- ---------- 1. camera_status: 5 valores ----------

create type camera_status_novo as enum
  ('operante', 'inoperante', 'desligada', 'em_manutencao', 'desligada_permanentemente');

-- views dependentes da coluna cameras.status precisam ser recriadas
drop view if exists v_kpis;
drop view if exists v_cameras_dias_parada;

alter table cameras alter column status drop default;
alter table cameras alter column status type camera_status_novo
  using (
    case status::text
      when 'aguardando_pecas' then 'em_manutencao'
      when 'aguardando_visita' then 'em_manutencao'
      else status::text
    end
  )::camera_status_novo;
alter table cameras alter column status set default 'operante';

-- camera_eventos guarda o histórico (status_anterior/status_novo também são
-- camera_status) — precisa da mesma conversão antes do drop do tipo antigo
alter table camera_eventos alter column status_anterior type camera_status_novo
  using (
    case status_anterior::text
      when 'aguardando_pecas' then 'em_manutencao'
      when 'aguardando_visita' then 'em_manutencao'
      else status_anterior::text
    end
  )::camera_status_novo;
alter table camera_eventos alter column status_novo type camera_status_novo
  using (
    case status_novo::text
      when 'aguardando_pecas' then 'em_manutencao'
      when 'aguardando_visita' then 'em_manutencao'
      else status_novo::text
    end
  )::camera_status_novo;

drop type camera_status;
alter type camera_status_novo rename to camera_status;

-- ---------- 2. Empresa responsável pela câmera ----------
-- Distinto de ocorrencias.empresa_id (empresa que atende a uma OS
-- específica) — este é o contrato/empresa responsável pela câmera em si.

alter table cameras add column empresa_id uuid references empresas(id);
create index idx_cameras_empresa on cameras(empresa_id);

-- ---------- 3. Views recriadas ----------
-- "aguardando" saiu do v_kpis (os status que a alimentavam não existem
-- mais); total_cameras e disponibilidade_pct passam a excluir câmeras
-- desligada_permanentemente, coerente com a regra de negócio nova.

create or replace view v_kpis as
select
  (select count(*) from cameras where status <> 'desligada_permanentemente')                    as total_cameras,
  (select count(*) from cameras where status = 'operante')                                        as operantes,
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
