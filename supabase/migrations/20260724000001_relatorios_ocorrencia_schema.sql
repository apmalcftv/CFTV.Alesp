-- ============================================================
-- Módulo "Relatórios de Ocorrências" (CMAL) — schema completo
-- Substitui as planilhas "Relatórios de ocorrencias" e "Análise de
-- ocorrência" da Central de Monitoramento. Totalmente independente do
-- módulo de Ocorrências de manutenção do CFTV: nenhuma FK para
-- ocorrencias/ocorrencia_eventos/anexos. Reaproveita apenas os
-- catálogos físicos (cameras, locais, predios) e a infraestrutura de
-- tenant já existente (tenant_do_usuario(), papel_atual(),
-- preencher_tenant(), tenant_contadores, set_atualizada_em()).
-- ============================================================

-- ---------- ENUM ----------

create type relatorio_status as enum
  ('recebida','em_analise','aguardando_informacoes','concluida','arquivada');

-- ---------- CATÁLOGOS ----------

create table departamentos (
  id        uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  nome      text not null,
  criado_em timestamptz not null default now(),
  unique (tenant_id, nome)
);

create table tipos_solicitacao (
  id        uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  nome      text not null,
  criado_em timestamptz not null default now(),
  unique (tenant_id, nome)
);

create table tipos_ocorrencia (
  id        uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  nome      text not null,
  criado_em timestamptz not null default now(),
  unique (tenant_id, nome)
);

create table solicitantes (
  id        uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  nome      text not null,
  criado_em timestamptz not null default now(),
  unique (tenant_id, nome)
);

create table marcadores (
  id        uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references tenants(id),
  nome      text not null,
  criado_em timestamptz not null default now(),
  unique (tenant_id, nome)
);

-- ---------- RELATÓRIO DE OCORRÊNCIA (Abas 1, 2 e 5) ----------

create table relatorios_ocorrencia (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references tenants(id),
  numero                bigint not null, -- atribuído por trigger, nunca reinicia (proximo_numero_relatorio)

  -- Aba 1 · Dados da Solicitação
  numero_memorando      text,
  tipo_solicitacao_id   uuid references tipos_solicitacao(id),
  solicitante_id        uuid references solicitantes(id),
  departamento_id       uuid references departamentos(id),
  data_solicitacao      date not null,
  prioridade            prioridade not null default 'media',
  operador_id           uuid references perfis(id),
  data_limite           date,
  status                relatorio_status not null default 'recebida',
  classificacao         text,

  -- Aba 2 · Dados do Fato
  data_fato             date, -- a planilha real tem casos sem essa data
  hora_aproximada       time,
  local_id              uuid references locais(id),
  descricao_fato        text not null,
  tipo_ocorrencia_id    uuid references tipos_ocorrencia(id),
  pessoas_envolvidas    text,
  observacoes_fato      text,

  -- Aba 5 · Resultado
  conclusao             text,
  providencias_adotadas text,
  resumo_executivo      text,
  encaminhamento        text,
  data_conclusao        date,
  concluido_por         uuid references perfis(id),

  -- suporte à importação de planilhas (evita uma 2ª migration na fase de import)
  import_chave          text,
  origem_importacao     text, -- nome do arquivo/aba de origem, quando importado

  criado_por            uuid references perfis(id),
  criado_em             timestamptz not null default now(),
  atualizada_em         timestamptz not null default now(),

  unique (tenant_id, numero),
  unique (tenant_id, import_chave)
);

create index idx_relatorios_oc_tenant on relatorios_ocorrencia(tenant_id, data_solicitacao);
create index idx_relatorios_oc_status on relatorios_ocorrencia(status);

-- ---------- ANÁLISE / TIMELINE (Aba 3) ----------
-- Achatada: sem tabela "análise" intermediária. Uma "análise" é apenas o
-- agrupamento visual (na UI) dos eventos com a mesma `data`. Ordenação
-- sempre por (data, horario_inicial) — cumpre a exigência de permanecer
-- em ordem cronológica e reordenar automaticamente por horário.

create table relatorio_timeline_eventos (
  id             uuid primary key default gen_random_uuid(),
  relatorio_id   uuid not null references relatorios_ocorrencia(id) on delete cascade,
  tenant_id      uuid not null references tenants(id),
  data           date not null,
  horario_inicial time not null,
  horario_final   time,
  camera_id      uuid references cameras(id),
  local_id       uuid references locais(id), -- override opcional (análise pode cruzar locais)
  descricao      text not null,
  operador_id    uuid references perfis(id),
  marcador_id    uuid references marcadores(id),
  criado_em      timestamptz not null default now(),
  atualizada_em  timestamptz not null default now()
);

create index idx_timeline_relatorio on relatorio_timeline_eventos(relatorio_id, data, horario_inicial);

-- ---------- EXPORTAÇÕES (Aba 4) ----------

create table relatorio_exportacoes (
  id                uuid primary key default gen_random_uuid(),
  relatorio_id      uuid not null references relatorios_ocorrencia(id) on delete cascade,
  tenant_id         uuid not null references tenants(id),
  data_exportacao   date not null,
  hora_exportacao   time,
  operador_id       uuid references perfis(id),
  cameras_exportadas text, -- texto livre (lista/faixa, ex. "34, 108, 149")
  periodo_inicio    timestamptz,
  periodo_fim       timestamptz,
  formato           text,
  tamanho           text,
  destino           text,
  hash              text,
  observacoes       text,
  criado_por        uuid references perfis(id),
  criado_em         timestamptz not null default now()
);

create index idx_exportacoes_relatorio on relatorio_exportacoes(relatorio_id);

-- ---------- ANEXOS (Aba 6) ----------
-- Arquivos ficam no bucket privado "anexos-relatorios" (migration seguinte).

create table relatorio_anexos (
  id           uuid primary key default gen_random_uuid(),
  relatorio_id uuid not null references relatorios_ocorrencia(id) on delete cascade,
  tenant_id    uuid not null references tenants(id),
  tipo         text not null, -- pdf | memorando | foto | video | documento | outro
  storage_path text not null,
  criado_por   uuid references perfis(id),
  criado_em    timestamptz not null default now()
);

create index idx_anexos_relatorio on relatorio_anexos(relatorio_id);

-- ---------- HISTÓRICO (Aba 7) — append-only, nunca apagado ----------

create table relatorio_historico (
  id             uuid primary key default gen_random_uuid(),
  relatorio_id   uuid not null references relatorios_ocorrencia(id) on delete cascade,
  tenant_id      uuid not null references tenants(id),
  autor_id       uuid references perfis(id),
  tipo           text not null, -- criacao | edicao | mudanca_status | comentario
  campo          text,
  valor_anterior text,
  valor_novo     text,
  mensagem       text,
  criado_em      timestamptz not null default now()
);

create index idx_historico_relatorio on relatorio_historico(relatorio_id, criado_em);

-- ---------- NUMERAÇÃO (contínua, nunca reinicia — mesmo padrão de proximo_numero_os) ----------

create or replace function public.proximo_numero_relatorio(p_tenant uuid)
returns bigint
language sql volatile security definer set search_path = public
as $$
  insert into tenant_contadores as c (tenant_id, chave, valor)
  values (p_tenant, 'relatorio_ocorrencia', 1)
  on conflict (tenant_id, chave) do update set valor = c.valor + 1
  returning valor;
$$;

create or replace function public.on_relatorio_criado()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.tenant_id is null then
    new.tenant_id := tenant_do_usuario();
  end if;
  if new.numero is null then
    new.numero := proximo_numero_relatorio(new.tenant_id);
  end if;
  return new;
end;
$$;

create trigger trg_relatorio_criado
  before insert on relatorios_ocorrencia
  for each row execute function on_relatorio_criado();

create trigger trg_relatorios_oc_updated
  before update on relatorios_ocorrencia
  for each row execute function set_atualizada_em();

create trigger trg_timeline_updated
  before update on relatorio_timeline_eventos
  for each row execute function set_atualizada_em();

-- ---------- TENANT NOS CATÁLOGOS E FILHOS ----------

do $$
declare t text;
begin
  foreach t in array array[
    'departamentos','tipos_solicitacao','tipos_ocorrencia','solicitantes','marcadores'
  ] loop
    execute format(
      'create trigger trg_tenant_default before insert on %I
       for each row execute function preencher_tenant()', t);
  end loop;
end;
$$;

-- Filhos diretos do relatório herdam o tenant do pai (mesma ideia de
-- preencher_tenant_do_pai(), função própria para não mexer na existente).
create or replace function public.preencher_tenant_do_relatorio()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.tenant_id is null then
    select tenant_id into new.tenant_id
    from relatorios_ocorrencia where id = new.relatorio_id;
  end if;
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'relatorio_timeline_eventos','relatorio_exportacoes','relatorio_anexos','relatorio_historico'
  ] loop
    execute format(
      'create trigger trg_tenant_relatorio before insert on %I
       for each row execute function preencher_tenant_do_relatorio()', t);
  end loop;
end;
$$;

-- ---------- HISTÓRICO AUTOMÁTICO ----------
-- Rastreia os campos de estado mais relevantes do relatório (status,
-- prioridade, responsável, departamento, prazo). Comentários manuais
-- usam o mesmo tipo 'comentario' via serviço, mas nunca update/delete.

create or replace function public.registrar_criacao_relatorio()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into relatorio_historico (relatorio_id, tenant_id, autor_id, tipo, mensagem)
  values (new.id, new.tenant_id, new.criado_por, 'criacao', 'Relatório criado');
  return new;
end;
$$;

create trigger trg_relatorio_pos_criacao
  after insert on relatorios_ocorrencia
  for each row execute function registrar_criacao_relatorio();

create or replace function public.registrar_historico_relatorio()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_autor uuid := auth.uid();
begin
  if new.status is distinct from old.status then
    insert into relatorio_historico (relatorio_id, tenant_id, autor_id, tipo, campo, valor_anterior, valor_novo)
    values (new.id, new.tenant_id, v_autor, 'mudanca_status', 'status', old.status::text, new.status::text);
  end if;
  if new.prioridade is distinct from old.prioridade then
    insert into relatorio_historico (relatorio_id, tenant_id, autor_id, tipo, campo, valor_anterior, valor_novo)
    values (new.id, new.tenant_id, v_autor, 'edicao', 'prioridade', old.prioridade::text, new.prioridade::text);
  end if;
  if new.operador_id is distinct from old.operador_id then
    insert into relatorio_historico (relatorio_id, tenant_id, autor_id, tipo, campo, valor_anterior, valor_novo)
    values (new.id, new.tenant_id, v_autor, 'edicao', 'operador_id', old.operador_id::text, new.operador_id::text);
  end if;
  if new.departamento_id is distinct from old.departamento_id then
    insert into relatorio_historico (relatorio_id, tenant_id, autor_id, tipo, campo, valor_anterior, valor_novo)
    values (new.id, new.tenant_id, v_autor, 'edicao', 'departamento_id', old.departamento_id::text, new.departamento_id::text);
  end if;
  if new.data_limite is distinct from old.data_limite then
    insert into relatorio_historico (relatorio_id, tenant_id, autor_id, tipo, campo, valor_anterior, valor_novo)
    values (new.id, new.tenant_id, v_autor, 'edicao', 'data_limite', old.data_limite::text, new.data_limite::text);
  end if;
  return new;
end;
$$;

create trigger trg_relatorio_historico
  after update on relatorios_ocorrencia
  for each row execute function registrar_historico_relatorio();

-- ---------- RLS ----------
-- Leitura: administrador, operador_cftc, fiscal_alesp, gestor (nunca empresa_contratada)
-- Escrita: só administrador e operador_cftc (criar/editar/concluir/arquivar)

alter table departamentos              enable row level security;
alter table tipos_solicitacao          enable row level security;
alter table tipos_ocorrencia           enable row level security;
alter table solicitantes               enable row level security;
alter table marcadores                 enable row level security;
alter table relatorios_ocorrencia      enable row level security;
alter table relatorio_timeline_eventos enable row level security;
alter table relatorio_exportacoes      enable row level security;
alter table relatorio_anexos           enable row level security;
alter table relatorio_historico        enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'departamentos','tipos_solicitacao','tipos_ocorrencia','solicitantes','marcadores',
    'relatorios_ocorrencia','relatorio_timeline_eventos','relatorio_exportacoes',
    'relatorio_anexos','relatorio_historico'
  ] loop
    execute format(
      'create policy "t_leitura" on %I for select to authenticated
       using (tenant_id = tenant_do_usuario()
              and papel_atual() in (''administrador'',''operador_cftc'',''fiscal_alesp'',''gestor''));', t);
  end loop;
end;
$$;

-- relatorio_historico só recebe INSERT (via trigger/serviço) — nunca update/delete
do $$
declare t text;
begin
  foreach t in array array[
    'departamentos','tipos_solicitacao','tipos_ocorrencia','solicitantes','marcadores',
    'relatorios_ocorrencia','relatorio_timeline_eventos','relatorio_exportacoes','relatorio_anexos'
  ] loop
    execute format(
      'create policy "t_escrita" on %I for all to authenticated
       using (tenant_id = tenant_do_usuario() and papel_atual() in (''administrador'',''operador_cftc''))
       with check (tenant_id = tenant_do_usuario() and papel_atual() in (''administrador'',''operador_cftc''));', t);
  end loop;
end;
$$;

create policy "t_historico_insere" on relatorio_historico
  for insert to authenticated
  with check (tenant_id = tenant_do_usuario()
              and papel_atual() in ('administrador','operador_cftc'));
