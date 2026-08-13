-- ============================================================
-- FASE 1 — Estrutura das permissões configuráveis (piloto: CMAL)
--
-- Cria as duas tabelas, semeia o catálogo dos recursos do CMAL e
-- reproduz na matriz a autorização que hoje está literal nas policies.
--
-- NADA no sistema consulta estas tabelas ainda. Nenhuma policy existente
-- é alterada, nenhum dado de negócio é tocado: depois desta migration o
-- comportamento de todos os perfis é exatamente o de antes dela.
--
-- Modelo: uma linha por (tenant, papel, recurso, ação) com booleano. A
-- chave primária composta já serve de índice para a consulta que a
-- função `tem_permissao()` fará na Fase 2.
-- ============================================================

-- ---------- Catálogo: o que existe para ser permitido ----------
-- Semente do sistema, alterada só por migration — por isso não recebe
-- policy de escrita nenhuma (RLS ativa sem policy = ninguém grava).
--
-- `tipo` distingue os dois níveis de garantia, e a distinção é real:
--   'dado' → tem tabelas próprias, a permissão vira predicado de RLS;
--   'tela' → é uma leitura dos MESMOS dados de outro recurso, então a
--            permissão controla menu e rota, não acesso ao dado. Tirar
--            'cmal_painel' não impede quem tem 'cmal_relatorios' de ler
--            os mesmos registros pela tela de lista ou pela API.
create table if not exists permissoes_catalogo (
  recurso text not null,
  acao    text not null,
  modulo  text not null,
  grupo   text not null,
  rotulo  text not null,
  rota    text,
  tipo    text not null check (tipo in ('dado', 'tela')),
  ordem   int  not null,
  primary key (recurso, acao),
  check (acao in ('visualizar', 'criar', 'editar', 'excluir'))
);

-- ---------- Matriz: o que o Administrador configurou ----------
create table if not exists permissoes_perfil (
  tenant_id      uuid not null references tenants(id),
  papel          papel_usuario not null,
  recurso        text not null,
  acao           text not null,
  permitido      boolean not null default false,
  atualizado_por uuid references perfis(id),
  atualizado_em  timestamptz not null default now(),
  primary key (tenant_id, papel, recurso, acao),
  foreign key (recurso, acao) references permissoes_catalogo(recurso, acao)
);

-- ---------- Semente do catálogo: os 4 recursos do CMAL ----------
-- Rótulos, módulo e grupo espelham `lib/navigation.ts` sem alterá-lo.
insert into permissoes_catalogo (recurso, acao, modulo, grupo, rotulo, rota, tipo, ordem) values
  ('cmal_painel',       'visualizar', 'CMAL', 'Operação CMAL',          'Dashboard',                 '/relatorios-ocorrencias/painel',       'tela', 1),

  ('cmal_relatorios',   'visualizar', 'CMAL', 'Operação CMAL',          'Relatórios de Ocorrências', '/relatorios-ocorrencias',              'dado', 2),
  ('cmal_relatorios',   'criar',      'CMAL', 'Operação CMAL',          'Relatórios de Ocorrências', '/relatorios-ocorrencias',              'dado', 2),
  ('cmal_relatorios',   'editar',     'CMAL', 'Operação CMAL',          'Relatórios de Ocorrências', '/relatorios-ocorrencias',              'dado', 2),
  ('cmal_relatorios',   'excluir',    'CMAL', 'Operação CMAL',          'Relatórios de Ocorrências', '/relatorios-ocorrencias',              'dado', 2),

  ('cmal_executivo',    'visualizar', 'CMAL', 'Análise de Ocorrências', 'Executivo',                 '/relatorios-ocorrencias/executivo',    'tela', 3),
  ('cmal_notificacoes', 'visualizar', 'CMAL', 'Análise de Ocorrências', 'Notificações',              '/relatorios-ocorrencias/notificacoes', 'tela', 4)
on conflict (recurso, acao) do nothing;

-- ---------- Semente da matriz: o estado de hoje, literal ----------
-- Traduz as policies atuais do CMAL, que não têm nenhuma exceção:
--   leitura  = administrador, operador_cftc, gestor
--   escrita  = administrador, operador_cftc
--   exclusão = administrador  (policy t_exclusao_admin)
--
-- Grava linha para TODA combinação, inclusive as negadas, para a tela de
-- configuração partir de um estado completo e explícito em vez de
-- depender da ausência de linha.
insert into permissoes_perfil (tenant_id, papel, recurso, acao, permitido)
select
  t.id,
  p.papel,
  c.recurso,
  c.acao,
  case
    when p.papel = 'administrador'  then true
    -- operador faz tudo menos excluir relatório
    when p.papel = 'operador_cftc'  then c.acao <> 'excluir'
    -- gestor é somente leitura
    when p.papel = 'gestor'         then c.acao = 'visualizar'
    -- fiscal_alesp e empresa_contratada não têm acesso ao módulo
    else false
  end
from tenants t
cross join (select unnest(enum_range(null::papel_usuario)) as papel) p
cross join permissoes_catalogo c
on conflict (tenant_id, papel, recurso, acao) do nothing;

-- ---------- RLS ----------
alter table permissoes_catalogo enable row level security;
alter table permissoes_perfil   enable row level security;

-- Catálogo é global (não tem tenant): qualquer usuário aprovado lê, para
-- o frontend saber montar menu e tela. `tenant_do_usuario()` devolve null
-- para conta pendente/bloqueada/rejeitada/excluída, que assim não lê nada.
create policy t_catalogo_leitura on permissoes_catalogo
  for select to authenticated
  using (tenant_do_usuario() is not null);

-- Todo usuário aprovado precisa ler a própria matriz — é o que permite ao
-- frontend saber o que pode fazer.
create policy t_leitura on permissoes_perfil
  for select to authenticated
  using (tenant_id = tenant_do_usuario());

-- Escrita exclusiva do administrador. Explícita por comando em vez de
-- `for all`: uma policy FOR ALL esconde o DELETE dentro dela, e foi
-- exatamente isso que precisou ser desmembrado em relatorios_ocorrencia.
create policy t_insercao_admin on permissoes_perfil
  for insert to authenticated
  with check (
    tenant_id = tenant_do_usuario()
    and papel_atual() = 'administrador'::papel_usuario
  );

create policy t_atualizacao_admin on permissoes_perfil
  for update to authenticated
  using (
    tenant_id = tenant_do_usuario()
    and papel_atual() = 'administrador'::papel_usuario
  )
  with check (
    tenant_id = tenant_do_usuario()
    and papel_atual() = 'administrador'::papel_usuario
  );

create policy t_exclusao_admin on permissoes_perfil
  for delete to authenticated
  using (
    tenant_id = tenant_do_usuario()
    and papel_atual() = 'administrador'::papel_usuario
  );
