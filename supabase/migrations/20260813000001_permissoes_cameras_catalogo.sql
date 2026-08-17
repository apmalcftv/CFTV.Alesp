-- ============================================================
-- FASE 1 (módulo Câmeras) — catálogo de recursos e matriz
--
-- Estende a infraestrutura de permissões já em produção para o módulo
-- Câmeras. NADA passa a consultar estes registros nesta fase: as
-- policies do módulo continuam exatamente como estão, o menu continua
-- por `papeis`, e nenhuma rota ganha guarda. O comportamento de todos
-- os usuários é rigorosamente o de antes desta migration.
--
-- Não toca em nada do CMAL: os 4 recursos e as 35 linhas de matriz do
-- CMAL não são lidos, alterados nem apagados aqui.
--
-- 14 recursos novos, sendo 10 de dado e 4 de tela.
-- 44 linhas de catálogo (10 recursos x 4 ações + 4 telas x 1 ação).
-- 220 linhas de matriz (5 papéis x 44).
--
-- ---------- CADASTROS SEPARADOS ----------
-- Cada um dos 8 catálogos vira recurso próprio, conforme decidido: são
-- telas independentes, com rota e tabela próprias, e agrupá-los num
-- checkbox só impediria, por exemplo, liberar Técnicos sem liberar
-- Empresas.
--
-- ---------- AÇÃO `excluir` ----------
-- Criada apenas onde a operação existe hoje no código. Os 4 recursos de
-- tela só têm `visualizar`; a interface renderiza "—" nas demais, como
-- já faz no CMAL. Em `cameras_os`, `excluir` existe porque remover
-- anexo de OS existe (`removerAnexo`) — a OS em si nunca é apagada, é
-- cancelada com motivo, e isso continua sendo `editar`.
--
-- ---------- ESCOPO NÃO ENTRA NA MATRIZ ----------
-- A matriz decide a AÇÃO. As regras que decidem QUAIS LINHAS continuam
-- intactas e serão aplicadas junto (AND), não no lugar:
--   * empresa_contratada só lê/atualiza OS da própria empresa
--   * empresa_contratada só anexa/comenta em OS própria
--   * trigger valida_transicao_empresa (status que a empresa pode gravar)
--   * notificacoes.perfil_id = auth.uid()
--   * tenant_id = tenant_do_usuario() em toda policy
-- ============================================================

-- ---------- Catálogo ----------
insert into permissoes_catalogo (recurso, acao, modulo, grupo, rotulo, rota, tipo, ordem) values
  -- Operação de Câmeras
  ('cameras_dashboard',   'visualizar', 'Operação e Análise de Câmeras', 'Operação de Câmeras', 'Dashboard Câmeras', '/dashboard',   'tela', 10),

  ('cameras_inventario',  'visualizar', 'Operação e Análise de Câmeras', 'Operação de Câmeras', 'Câmeras',           '/cameras',     'dado', 11),
  ('cameras_inventario',  'criar',      'Operação e Análise de Câmeras', 'Operação de Câmeras', 'Câmeras',           '/cameras',     'dado', 11),
  ('cameras_inventario',  'editar',     'Operação e Análise de Câmeras', 'Operação de Câmeras', 'Câmeras',           '/cameras',     'dado', 11),
  ('cameras_inventario',  'excluir',    'Operação e Análise de Câmeras', 'Operação de Câmeras', 'Câmeras',           '/cameras',     'dado', 11),

  ('cameras_os',          'visualizar', 'Operação e Análise de Câmeras', 'Operação de Câmeras', 'OS/Câmeras',        '/ocorrencias', 'dado', 12),
  ('cameras_os',          'criar',      'Operação e Análise de Câmeras', 'Operação de Câmeras', 'OS/Câmeras',        '/ocorrencias', 'dado', 12),
  ('cameras_os',          'editar',     'Operação e Análise de Câmeras', 'Operação de Câmeras', 'OS/Câmeras',        '/ocorrencias', 'dado', 12),
  ('cameras_os',          'excluir',    'Operação e Análise de Câmeras', 'Operação de Câmeras', 'OS/Câmeras',        '/ocorrencias', 'dado', 12),

  -- Análise de Câmeras
  ('cameras_executivo',   'visualizar', 'Operação e Análise de Câmeras', 'Análise de Câmeras',  'Executivo',                 '/executivo',    'tela', 13),
  ('cameras_relatorios',  'visualizar', 'Operação e Análise de Câmeras', 'Análise de Câmeras',  'Relatórios de Câmeras',     '/relatorios',   'tela', 14),
  ('cameras_notificacoes','visualizar', 'Operação e Análise de Câmeras', 'Análise de Câmeras',  'Notificações de Câmeras',   '/notificacoes', 'tela', 15),

  -- Cadastros operacionais — um recurso por catálogo
  ('cameras_predios',     'visualizar', 'Operação e Análise de Câmeras', 'Cadastros de Câmeras', 'Prédios',           '/cadastros/predios',     'dado', 20),
  ('cameras_predios',     'criar',      'Operação e Análise de Câmeras', 'Cadastros de Câmeras', 'Prédios',           '/cadastros/predios',     'dado', 20),
  ('cameras_predios',     'editar',     'Operação e Análise de Câmeras', 'Cadastros de Câmeras', 'Prédios',           '/cadastros/predios',     'dado', 20),
  ('cameras_predios',     'excluir',    'Operação e Análise de Câmeras', 'Cadastros de Câmeras', 'Prédios',           '/cadastros/predios',     'dado', 20),

  -- ATENÇÃO: `locais` é COMPARTILHADO com o CMAL. Já existe a policy
  -- t_locais_insercao_cmal, que concede INSERT a quem tem
  -- cmal_relatorios criar/editar. Ao migrar na Fase 3, as duas regras se
  -- somam por OR — este recurso não substitui aquela policy.
  ('cameras_locais',      'visualizar', 'Operação e Análise de Câmeras', 'Cadastros de Câmeras', 'Locais',            '/cadastros/locais',      'dado', 21),
  ('cameras_locais',      'criar',      'Operação e Análise de Câmeras', 'Cadastros de Câmeras', 'Locais',            '/cadastros/locais',      'dado', 21),
  ('cameras_locais',      'editar',     'Operação e Análise de Câmeras', 'Cadastros de Câmeras', 'Locais',            '/cadastros/locais',      'dado', 21),
  ('cameras_locais',      'excluir',    'Operação e Análise de Câmeras', 'Cadastros de Câmeras', 'Locais',            '/cadastros/locais',      'dado', 21),

  ('cameras_fabricantes', 'visualizar', 'Operação e Análise de Câmeras', 'Cadastros de Câmeras', 'Fabricantes',       '/cadastros/fabricantes', 'dado', 22),
  ('cameras_fabricantes', 'criar',      'Operação e Análise de Câmeras', 'Cadastros de Câmeras', 'Fabricantes',       '/cadastros/fabricantes', 'dado', 22),
  ('cameras_fabricantes', 'editar',     'Operação e Análise de Câmeras', 'Cadastros de Câmeras', 'Fabricantes',       '/cadastros/fabricantes', 'dado', 22),
  ('cameras_fabricantes', 'excluir',    'Operação e Análise de Câmeras', 'Cadastros de Câmeras', 'Fabricantes',       '/cadastros/fabricantes', 'dado', 22),

  ('cameras_modelos',     'visualizar', 'Operação e Análise de Câmeras', 'Cadastros de Câmeras', 'Modelos de câmera', '/cadastros/modelos',     'dado', 23),
  ('cameras_modelos',     'criar',      'Operação e Análise de Câmeras', 'Cadastros de Câmeras', 'Modelos de câmera', '/cadastros/modelos',     'dado', 23),
  ('cameras_modelos',     'editar',     'Operação e Análise de Câmeras', 'Cadastros de Câmeras', 'Modelos de câmera', '/cadastros/modelos',     'dado', 23),
  ('cameras_modelos',     'excluir',    'Operação e Análise de Câmeras', 'Cadastros de Câmeras', 'Modelos de câmera', '/cadastros/modelos',     'dado', 23),

  ('cameras_nvrs',        'visualizar', 'Operação e Análise de Câmeras', 'Cadastros de Câmeras', 'NVRs',              '/cadastros/nvrs',        'dado', 24),
  ('cameras_nvrs',        'criar',      'Operação e Análise de Câmeras', 'Cadastros de Câmeras', 'NVRs',              '/cadastros/nvrs',        'dado', 24),
  ('cameras_nvrs',        'editar',     'Operação e Análise de Câmeras', 'Cadastros de Câmeras', 'NVRs',              '/cadastros/nvrs',        'dado', 24),
  ('cameras_nvrs',        'excluir',    'Operação e Análise de Câmeras', 'Cadastros de Câmeras', 'NVRs',              '/cadastros/nvrs',        'dado', 24),

  ('cameras_empresas',    'visualizar', 'Operação e Análise de Câmeras', 'Cadastros de Câmeras', 'Empresas',          '/cadastros/empresas',    'dado', 25),
  ('cameras_empresas',    'criar',      'Operação e Análise de Câmeras', 'Cadastros de Câmeras', 'Empresas',          '/cadastros/empresas',    'dado', 25),
  ('cameras_empresas',    'editar',     'Operação e Análise de Câmeras', 'Cadastros de Câmeras', 'Empresas',          '/cadastros/empresas',    'dado', 25),
  ('cameras_empresas',    'excluir',    'Operação e Análise de Câmeras', 'Cadastros de Câmeras', 'Empresas',          '/cadastros/empresas',    'dado', 25),

  ('cameras_tecnicos',    'visualizar', 'Operação e Análise de Câmeras', 'Cadastros de Câmeras', 'Técnicos',          '/cadastros/tecnicos',    'dado', 26),
  ('cameras_tecnicos',    'criar',      'Operação e Análise de Câmeras', 'Cadastros de Câmeras', 'Técnicos',          '/cadastros/tecnicos',    'dado', 26),
  ('cameras_tecnicos',    'editar',     'Operação e Análise de Câmeras', 'Cadastros de Câmeras', 'Técnicos',          '/cadastros/tecnicos',    'dado', 26),
  ('cameras_tecnicos',    'excluir',    'Operação e Análise de Câmeras', 'Cadastros de Câmeras', 'Técnicos',          '/cadastros/tecnicos',    'dado', 26),

  ('cameras_defeitos',    'visualizar', 'Operação e Análise de Câmeras', 'Cadastros de Câmeras', 'Tipos de defeito',  '/cadastros/defeitos',    'dado', 27),
  ('cameras_defeitos',    'criar',      'Operação e Análise de Câmeras', 'Cadastros de Câmeras', 'Tipos de defeito',  '/cadastros/defeitos',    'dado', 27),
  ('cameras_defeitos',    'editar',     'Operação e Análise de Câmeras', 'Cadastros de Câmeras', 'Tipos de defeito',  '/cadastros/defeitos',    'dado', 27),
  ('cameras_defeitos',    'excluir',    'Operação e Análise de Câmeras', 'Cadastros de Câmeras', 'Tipos de defeito',  '/cadastros/defeitos',    'dado', 27)
on conflict (recurso, acao) do nothing;

-- ---------- Matriz: reproduz o comportamento atual ----------
-- Traduzida do cruzamento entre `navigation.ts` (o que cada papel
-- enxerga), os componentes (`podeEditar`, `podeAtualizarOcorrencia`) e as
-- policies `t_escrita_operador` / `t_empresa_atualiza_os`.
--
-- `visualizar` segue o MENU, não a policy de SELECT. Hoje as leituras de
-- `cameras` e dos catálogos são abertas a qualquer usuário aprovado do
-- tenant — é o Achado 2 da auditoria, que ficou para a Fase 4. Semear
-- pelo menu preserva o que o usuário percebe hoje e mantém aquele achado
-- em aberto: a Fase 3 migra as policies de ESCRITA, e só a Fase 4 aperta
-- as de LEITURA.
--
-- A única linha em que a empresa_contratada recebe escrita é
-- `cameras_os / editar`, reproduzindo `t_empresa_atualiza_os`. O escopo
-- (somente OS da própria empresa) NÃO está aqui: continua na policy, e
-- na Fase 3 as duas condições serão aplicadas juntas com AND.
insert into permissoes_perfil (tenant_id, papel, recurso, acao, permitido)
select
  t.id,
  p.papel,
  c.recurso,
  c.acao,
  case
    when p.papel = 'administrador' then true

    -- Operador CFTC: hoje faz tudo no módulo, igual ao administrador
    when p.papel = 'operador_cftc' then true

    -- Gestor: menu mostra Dashboard, Executivo e Relatórios; sem escrita
    when p.papel = 'gestor' then
      c.acao = 'visualizar'
      and c.recurso in ('cameras_dashboard', 'cameras_os', 'cameras_executivo', 'cameras_relatorios')

    -- Fiscal ALESP: menu mostra tudo do módulo menos os cadastros; sem escrita
    when p.papel = 'fiscal_alesp' then
      c.acao = 'visualizar'
      and c.recurso in ('cameras_dashboard', 'cameras_inventario', 'cameras_os',
                        'cameras_executivo', 'cameras_relatorios', 'cameras_notificacoes')

    -- Empresa Contratada: só OS/Câmeras. Vê e edita (as próprias, por
    -- escopo na policy); nunca abre nem apaga.
    when p.papel = 'empresa_contratada' then
      c.recurso = 'cameras_os' and c.acao in ('visualizar', 'editar')

    else false
  end
from tenants t
cross join (select unnest(enum_range(null::papel_usuario)) as papel) p
cross join permissoes_catalogo c
where c.recurso like 'cameras\_%'
on conflict (tenant_id, papel, recurso, acao) do nothing;
