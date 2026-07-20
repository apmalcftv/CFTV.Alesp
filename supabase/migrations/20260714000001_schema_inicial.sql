-- ============================================================
-- Dashboard CFTV ALESP — Schema completo (Fase 0)
-- Migração inicial: enums, tabelas, triggers, views, RLS, seeds
-- ============================================================

-- ---------- ENUMS ----------
create type camera_status as enum
  ('operante','inoperante','em_manutencao','aguardando_pecas',
   'aguardando_visita','removida','desativada');

create type ocorrencia_status as enum
  ('aberta','em_andamento','aguardando_pecas','aguardando_visita',
   'aguardando_terceiros','concluida','cancelada');

create type prioridade as enum ('baixa','media','alta','critica');

-- admin    → tudo, inclusive criar usuários e alterar papéis
-- operador → tudo, exceto gerenciar usuários
-- gestor   → gestor do contrato de manutenção: vê tudo, sem edição
-- empresa  → empresa de manutenção: atualiza as OS atribuídas a ela
create type papel_usuario as enum ('admin','operador','gestor','empresa');

-- ---------- CADASTROS ----------
create table predios (
  id         uuid primary key default gen_random_uuid(),
  nome       text not null,
  sigla      text,
  criado_em  timestamptz not null default now()
);

create table locais (
  id         uuid primary key default gen_random_uuid(),
  predio_id  uuid references predios(id),
  andar      text,
  nome       text not null,
  tipo_area  text, -- corredor, elevador, estacionamento, portaria, área externa...
  criado_em  timestamptz not null default now()
);

create table fabricantes (
  id   uuid primary key default gen_random_uuid(),
  nome text not null unique
);

create table modelos_camera (
  id            uuid primary key default gen_random_uuid(),
  fabricante_id uuid references fabricantes(id),
  nome          text not null,
  tipo          text -- fixa, dome, bullet, PTZ
);

create table empresas (
  id      uuid primary key default gen_random_uuid(),
  nome    text not null,
  cnpj    text,
  contato text,
  ativa   boolean not null default true
);

create table tecnicos (
  id         uuid primary key default gen_random_uuid(),
  empresa_id uuid references empresas(id),
  nome       text not null,
  ativo      boolean not null default true
);

create table nvrs (
  id       uuid primary key default gen_random_uuid(),
  nome     text not null,
  ip       inet,
  local_id uuid references locais(id),
  canais   int
);

create table tipos_defeito (
  id        uuid primary key default gen_random_uuid(),
  nome      text not null unique,
  categoria text -- imagem, conectividade, física, sistema, ambiente
);

create table politicas_sla (
  id                uuid primary key default gen_random_uuid(),
  prioridade        prioridade not null unique,
  horas_atendimento int not null, -- prazo p/ primeira resposta
  horas_solucao     int not null  -- prazo p/ encerramento
);

-- Parâmetros gerais editáveis (ex.: dias para alerta de câmera parada)
create table configuracoes (
  chave     text primary key,
  valor     text not null,
  descricao text
);

-- ---------- PERFIS (vinculado ao auth do Supabase) ----------
create table perfis (
  id         uuid primary key references auth.users(id) on delete cascade,
  nome       text not null,
  papel      papel_usuario not null default 'gestor',
  empresa_id uuid references empresas(id), -- vínculo p/ papel 'empresa'
  criado_em  timestamptz not null default now()
);

-- Cria o perfil automaticamente quando o usuário se cadastra
create or replace function public.handle_novo_usuario()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.perfis (id, nome, papel)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)),
    -- administrador do sistema; demais contas nascem como gestor (só leitura)
    case when lower(new.email) = 'thiago2023leal@gmail.com'
         then 'admin'::papel_usuario
         else 'gestor'::papel_usuario
    end
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_novo_usuario();

-- ---------- NÚCLEO ----------
create table cameras (
  id              uuid primary key default gen_random_uuid(),
  numero          int not null unique,        -- "IP Cam" da planilha
  patrimonio      text,
  ip              inet,
  canal           int,
  modelo_id       uuid references modelos_camera(id),
  local_id        uuid references locais(id),
  nvr_id          uuid references nvrs(id),
  status          camera_status not null default 'operante',
  instalada_em    date,
  substituida_por uuid references cameras(id),
  observacoes     text,
  criada_em       timestamptz not null default now(),
  atualizada_em   timestamptz not null default now()
);

create table ocorrencias (
  id                   uuid primary key default gen_random_uuid(),
  numero               bigint generated always as identity, -- nº sequencial da OS
  camera_id            uuid references cameras(id),         -- NULL = ocorrência de sistema/infra
  tipo_defeito_id      uuid references tipos_defeito(id),
  descricao            text not null,
  prioridade           prioridade not null default 'media',
  status               ocorrencia_status not null default 'aberta',
  empresa_id           uuid references empresas(id),
  tecnico_id           uuid references tecnicos(id),
  os_externa           text,   -- nº da OS da terceirizada
  impedimento          text,   -- "aguardando obra", "necessita andaime"...
  aberta_em            timestamptz not null default now(),
  primeira_resposta_em timestamptz,
  encerrada_em         timestamptz,
  sla_vence_em         timestamptz, -- calculado por trigger via politicas_sla
  criada_por           uuid references perfis(id),
  criada_em            timestamptz not null default now(),
  atualizada_em        timestamptz not null default now(),
  constraint encerramento_apos_abertura check (encerrada_em is null or encerrada_em >= aberta_em),
  constraint resposta_apos_abertura     check (primeira_resposta_em is null or primeira_resposta_em >= aberta_em)
);

create index idx_ocorrencias_camera  on ocorrencias(camera_id);
create index idx_ocorrencias_status  on ocorrencias(status);
create index idx_ocorrencias_aberta  on ocorrencias(aberta_em);
create index idx_cameras_local       on cameras(local_id);
create index idx_cameras_status      on cameras(status);

create table ocorrencia_eventos (
  id              uuid primary key default gen_random_uuid(),
  ocorrencia_id   uuid not null references ocorrencias(id) on delete cascade,
  autor_id        uuid references perfis(id),
  tipo            text not null, -- comentario | mudanca_status | atribuicao | edicao | abertura
  status_anterior ocorrencia_status,
  status_novo     ocorrencia_status,
  campo           text,
  valor_anterior  text,
  valor_novo      text,
  mensagem        text,
  criado_em       timestamptz not null default now()
);

create index idx_eventos_ocorrencia on ocorrencia_eventos(ocorrencia_id);

create table anexos (
  id            uuid primary key default gen_random_uuid(),
  ocorrencia_id uuid not null references ocorrencias(id) on delete cascade,
  tipo          text not null, -- foto | video | arquivo
  storage_path  text not null,
  criado_por    uuid references perfis(id),
  criado_em     timestamptz not null default now()
);

create table notificacoes (
  id            uuid primary key default gen_random_uuid(),
  perfil_id     uuid not null references perfis(id) on delete cascade,
  tipo          text not null, -- sla_vencido | camera_parada | os_sem_atualizacao | reincidencia
  titulo        text not null,
  corpo         text,
  ocorrencia_id uuid references ocorrencias(id) on delete set null,
  camera_id     uuid references cameras(id) on delete set null,
  lida          boolean not null default false,
  criada_em     timestamptz not null default now()
);

create index idx_notificacoes_perfil on notificacoes(perfil_id, lida);

-- ---------- TRIGGERS DE NEGÓCIO ----------

-- updated_at automático
create or replace function public.set_atualizada_em()
returns trigger language plpgsql as $$
begin
  new.atualizada_em = now();
  return new;
end;
$$;

create trigger trg_cameras_updated     before update on cameras     for each row execute function set_atualizada_em();
create trigger trg_ocorrencias_updated before update on ocorrencias for each row execute function set_atualizada_em();

-- 1) Nova ocorrência: calcula SLA, marca câmera como inoperante, registra evento de abertura
create or replace function public.on_ocorrencia_criada()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_horas int;
begin
  select horas_solucao into v_horas from politicas_sla where prioridade = new.prioridade;
  if v_horas is not null then
    new.sla_vence_em := new.aberta_em + make_interval(hours => v_horas);
  end if;
  return new;
end;
$$;

create trigger trg_ocorrencia_sla
  before insert on ocorrencias
  for each row execute function on_ocorrencia_criada();

create or replace function public.after_ocorrencia_criada()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into ocorrencia_eventos (ocorrencia_id, autor_id, tipo, status_novo, mensagem)
  values (new.id, new.criada_por, 'abertura', new.status, 'Ocorrência aberta');

  if new.camera_id is not null then
    update cameras set status = 'inoperante'
    where id = new.camera_id and status = 'operante';
  end if;
  return new;
end;
$$;

create trigger trg_ocorrencia_pos_criacao
  after insert on ocorrencias
  for each row execute function after_ocorrencia_criada();

-- 2) Mudança de status: auditoria + sincronização do status da câmera
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

    -- encerramento: registra data e devolve câmera a operante se não houver outra OS aberta
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
      -- espelha estados de espera na câmera
      update cameras set status = case new.status
          when 'em_andamento'         then 'em_manutencao'::camera_status
          when 'aguardando_pecas'     then 'aguardando_pecas'::camera_status
          when 'aguardando_visita'    then 'aguardando_visita'::camera_status
          when 'aguardando_terceiros' then 'em_manutencao'::camera_status
          else 'inoperante'::camera_status
        end
      where id = new.camera_id and status <> 'removida' and status <> 'desativada';
    end if;

    -- primeira resposta: primeiro movimento após abertura
    if old.status = 'aberta' and new.primeira_resposta_em is null then
      new.primeira_resposta_em := now();
    end if;
  end if;
  return new;
end;
$$;

create trigger trg_ocorrencia_status
  before update on ocorrencias
  for each row execute function on_ocorrencia_status_change();

-- ---------- VIEWS DE INDICADORES ----------

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

create or replace view v_ranking_locais as
select l.id, l.nome, l.tipo_area, p.nome as predio,
       count(o.id) as total_ocorrencias
from locais l
left join predios p  on p.id = l.predio_id
left join cameras c  on c.local_id = l.id
left join ocorrencias o on o.camera_id = c.id
group by l.id, l.nome, l.tipo_area, p.nome
order by total_ocorrencias desc;

create or replace view v_ranking_defeitos as
select t.id, t.nome, t.categoria, count(o.id) as total
from tipos_defeito t
left join ocorrencias o on o.tipo_defeito_id = t.id
group by t.id, t.nome, t.categoria
order by total desc;

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

-- Reincidência: câmeras com 3+ ocorrências nos últimos 12 meses
create or replace view v_cameras_reincidentes as
select c.id, c.numero, l.nome as local, count(o.id) as ocorrencias_12m
from cameras c
join ocorrencias o on o.camera_id = c.id and o.aberta_em >= now() - interval '12 months'
left join locais l on l.id = c.local_id
group by c.id, c.numero, l.nome
having count(o.id) >= 3
order by ocorrencias_12m desc;

-- ---------- RLS ----------

-- Função auxiliar: papel do usuário logado
create or replace function public.papel_atual()
returns papel_usuario
language sql stable security definer set search_path = public
as $$
  select papel from perfis where id = auth.uid();
$$;

-- Habilita RLS em tudo
alter table predios            enable row level security;
alter table locais             enable row level security;
alter table fabricantes        enable row level security;
alter table modelos_camera     enable row level security;
alter table empresas           enable row level security;
alter table tecnicos           enable row level security;
alter table nvrs               enable row level security;
alter table tipos_defeito      enable row level security;
alter table politicas_sla      enable row level security;
alter table configuracoes      enable row level security;
alter table perfis             enable row level security;
alter table cameras            enable row level security;
alter table ocorrencias        enable row level security;
alter table ocorrencia_eventos enable row level security;
alter table anexos             enable row level security;
alter table notificacoes       enable row level security;

-- Leitura: qualquer usuário autenticado
do $$
declare t text;
begin
  foreach t in array array[
    'predios','locais','fabricantes','modelos_camera','empresas','tecnicos',
    'nvrs','tipos_defeito','politicas_sla','configuracoes','cameras',
    'ocorrencias','ocorrencia_eventos','anexos'
  ] loop
    execute format(
      'create policy "leitura_autenticada" on %I for select to authenticated using (true);', t);
  end loop;
end;
$$;

-- Escrita em cadastros e núcleo: admin e operador
do $$
declare t text;
begin
  foreach t in array array[
    'predios','locais','fabricantes','modelos_camera','empresas','tecnicos',
    'nvrs','tipos_defeito','cameras','ocorrencias','ocorrencia_eventos','anexos'
  ] loop
    execute format(
      'create policy "escrita_operador" on %I for all to authenticated
       using (papel_atual() in (''admin'',''operador''))
       with check (papel_atual() in (''admin'',''operador''));', t);
  end loop;
end;
$$;

-- Papel 'empresa': atualiza as OS atribuídas à sua empresa
-- e registra comentários/anexos nelas (sem tocar em cadastros/câmeras)
create or replace function public.empresa_do_usuario()
returns uuid
language sql stable security definer set search_path = public
as $$
  select empresa_id from perfis where id = auth.uid();
$$;

create policy "empresa_atualiza_suas_os" on ocorrencias
  for update to authenticated
  using (papel_atual() = 'empresa' and empresa_id = empresa_do_usuario())
  with check (papel_atual() = 'empresa' and empresa_id = empresa_do_usuario());

create policy "empresa_registra_eventos" on ocorrencia_eventos
  for insert to authenticated
  with check (
    papel_atual() = 'empresa' and exists (
      select 1 from ocorrencias o
      where o.id = ocorrencia_id and o.empresa_id = empresa_do_usuario()
    )
  );

create policy "empresa_envia_anexos" on anexos
  for insert to authenticated
  with check (
    papel_atual() = 'empresa' and exists (
      select 1 from ocorrencias o
      where o.id = ocorrencia_id and o.empresa_id = empresa_do_usuario()
    )
  );

-- SLA e configurações: só admin altera
create policy "sla_admin" on politicas_sla for all to authenticated
  using (papel_atual() = 'admin') with check (papel_atual() = 'admin');
create policy "config_admin" on configuracoes for all to authenticated
  using (papel_atual() = 'admin') with check (papel_atual() = 'admin');

-- Perfis: cada um vê o próprio; admin vê e edita todos
create policy "perfil_proprio" on perfis for select to authenticated
  using (id = auth.uid() or papel_atual() = 'admin');
create policy "perfil_admin_update" on perfis for update to authenticated
  using (papel_atual() = 'admin') with check (papel_atual() = 'admin');

-- Notificações: cada usuário vê/atualiza as suas
create policy "notif_proprias" on notificacoes for select to authenticated
  using (perfil_id = auth.uid());
create policy "notif_marcar_lida" on notificacoes for update to authenticated
  using (perfil_id = auth.uid()) with check (perfil_id = auth.uid());

-- ---------- SEEDS ----------

insert into politicas_sla (prioridade, horas_atendimento, horas_solucao) values
  ('critica', 4,  24),
  ('alta',    8,  48),
  ('media',   24, 120),  -- 5 dias
  ('baixa',   48, 240);  -- 10 dias

insert into configuracoes (chave, valor, descricao) values
  ('alerta_dias_camera_parada', '7',  'Dias de câmera parada para gerar alerta'),
  ('alerta_dias_os_sem_atualizacao', '5', 'Dias sem atualização em OS aberta para gerar alerta'),
  ('reincidencia_min_ocorrencias', '3', 'Nº de ocorrências em 12 meses para marcar câmera como reincidente');

insert into tipos_defeito (nome, categoria) values
  ('Inoperante',                'conectividade'),
  ('Instabilidade / perda de sinal', 'conectividade'),
  ('Lente suja',                'imagem'),
  ('Lente riscada',             'imagem'),
  ('Oscilação de imagem',       'imagem'),
  ('Desalinhada / fora de ângulo', 'física'),
  ('Desprendida do suporte',    'física'),
  ('Removida por obra',         'física'),
  ('Vandalismo / dano físico',  'física'),
  ('Obstrução por folhagem',    'ambiente'),
  ('Infiltração / umidade',     'ambiente'),
  ('Falha de NVR / gravador',   'sistema'),
  ('Falha de software (ANYVISION)', 'sistema'),
  ('Falha de plugin / player',  'sistema'),
  ('Falha de disco (SSD/HD)',   'sistema'),
  ('Outros',                    null);

insert into empresas (nome, contato) values
  ('Infogoogle', null);

insert into tecnicos (empresa_id, nome)
select id, 'Eduardo' from empresas where nome = 'Infogoogle';

insert into fabricantes (nome) values ('Hikvision'), ('Intelbras'), ('Dahua'), ('Axis');

-- Prédios: populados pela importação da planilha (decisão do usuário:
-- agrupador único "Complexo ALESP" até a classificação real pela tela de cadastros)
