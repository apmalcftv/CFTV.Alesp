-- ============================================================
-- FASE 3 — As policies do CMAL passam a consultar a matriz
--
-- Substitui as listas literais de papéis por `tem_permissao(recurso, ação)`
-- nas 10 tabelas do módulo. A partir daqui, o que o Administrador
-- configura em Cadastros › Permissões vale de verdade, inclusive contra
-- chamada direta à API — não é mais só o botão sumindo da tela.
--
-- NADA da matriz é tocado: esta migration não faz insert, update ou
-- delete em `permissoes_perfil`. A configuração já feita continua valendo
-- exatamente como está.
--
-- AUDITORIA DO ESTADO ANTERIOR (o que está sendo substituído):
--
--   relatorios_ocorrencia   SELECT t_leitura        admin+operador+gestor
--                           INSERT t_insercao       admin+operador
--                           UPDATE t_atualizacao    admin+operador
--                           DELETE t_exclusao_admin admin
--   timeline/anexos/exportacoes
--                           SELECT t_leitura        admin+operador+gestor
--                           ALL    t_escrita        admin+operador
--   relatorio_historico     SELECT t_leitura        admin+operador+gestor
--                           INSERT t_historico_insere admin+operador
--   5 catálogos do CMAL     SELECT t_leitura        admin+operador+gestor
--                           ALL    t_escrita        admin+operador
--
-- As `FOR ALL` NÃO são traduzidas cegamente: cada uma é desmembrada em
-- INSERT, UPDATE e DELETE explícitos, para o comando ficar visível na
-- policy em vez de escondido dentro de um ALL — foi exatamente isso que
-- deixou o operador_cftc com DELETE implícito em relatorios_ocorrencia.
--
-- MAPEAMENTO recurso.ação -> comando:
--   relatorios_ocorrencia:   SELECT=visualizar INSERT=criar UPDATE=editar DELETE=excluir
--   timeline/anexos/exportacoes/historico: SELECT=visualizar, escrita=editar
--     (mexer na análise, nos anexos ou nas exportações é editar o
--      relatório, não criar um relatório)
--   catálogos do CMAL:       SELECT=visualizar, escrita=criar OU editar
--     (o formulário é texto livre e a ponte catalogo-por-nome.ts cria
--      solicitante/departamento/tipo no envio; se o catálogo ficasse mais
--      restrito que o relatório, quem pode criar receberia erro ao digitar
--      um nome novo)
--
-- FORA DE ESCOPO, preservado intacto: módulo Câmeras, catálogos
-- compartilhados (locais, cameras, predios), regras da empresa_contratada
-- e o trigger de transição de status das OS.
-- ============================================================

-- ---------- relatorios_ocorrencia ----------
alter policy t_leitura on relatorios_ocorrencia
  using (tenant_id = tenant_do_usuario() and tem_permissao('cmal_relatorios', 'visualizar'));

alter policy t_insercao on relatorios_ocorrencia
  with check (tenant_id = tenant_do_usuario() and tem_permissao('cmal_relatorios', 'criar'));

alter policy t_atualizacao on relatorios_ocorrencia
  using (tenant_id = tenant_do_usuario() and tem_permissao('cmal_relatorios', 'editar'))
  with check (tenant_id = tenant_do_usuario() and tem_permissao('cmal_relatorios', 'editar'));

alter policy t_exclusao_admin on relatorios_ocorrencia
  using (tenant_id = tenant_do_usuario() and tem_permissao('cmal_relatorios', 'excluir'));

-- ---------- Tabelas-filhas do relatório ----------
-- Escrita mapeada para 'editar'. As três FOR ALL viram três comandos
-- explícitos cada. O DELETE importa de verdade aqui: "Salvar Análise"
-- apaga e reinsere todas as linhas da timeline.
do $$
declare t text;
begin
  foreach t in array array['relatorio_timeline_eventos', 'relatorio_anexos', 'relatorio_exportacoes']
  loop
    execute format(
      'alter policy t_leitura on %I using (tenant_id = tenant_do_usuario() and tem_permissao(''cmal_relatorios'', ''visualizar''))', t);

    execute format('drop policy if exists t_escrita on %I', t);

    execute format(
      'create policy t_insercao on %I for insert to authenticated
         with check (tenant_id = tenant_do_usuario() and tem_permissao(''cmal_relatorios'', ''editar''))', t);
    execute format(
      'create policy t_atualizacao on %I for update to authenticated
         using (tenant_id = tenant_do_usuario() and tem_permissao(''cmal_relatorios'', ''editar''))
         with check (tenant_id = tenant_do_usuario() and tem_permissao(''cmal_relatorios'', ''editar''))', t);
    execute format(
      'create policy t_exclusao on %I for delete to authenticated
         using (tenant_id = tenant_do_usuario() and tem_permissao(''cmal_relatorios'', ''editar''))', t);
  end loop;
end $$;

-- ---------- relatorio_historico ----------
-- Append-only por design: continua sem policy de UPDATE ou DELETE.
alter policy t_leitura on relatorio_historico
  using (tenant_id = tenant_do_usuario() and tem_permissao('cmal_relatorios', 'visualizar'));

alter policy t_historico_insere on relatorio_historico
  with check (tenant_id = tenant_do_usuario() and tem_permissao('cmal_relatorios', 'editar'));

-- ---------- Catálogos exclusivos do CMAL ----------
-- `locais`, `cameras` e `predios` NÃO entram: são compartilhados com o
-- módulo Câmeras e seguem sob as policies atuais até a fase daquele módulo.
do $$
declare t text;
begin
  foreach t in array array['departamentos', 'solicitantes', 'marcadores', 'tipos_ocorrencia', 'tipos_solicitacao']
  loop
    execute format(
      'alter policy t_leitura on %I using (tenant_id = tenant_do_usuario() and tem_permissao(''cmal_relatorios'', ''visualizar''))', t);

    execute format('drop policy if exists t_escrita on %I', t);

    execute format(
      'create policy t_insercao on %I for insert to authenticated
         with check (tenant_id = tenant_do_usuario()
                     and (tem_permissao(''cmal_relatorios'', ''criar'') or tem_permissao(''cmal_relatorios'', ''editar'')))', t);
    execute format(
      'create policy t_atualizacao on %I for update to authenticated
         using (tenant_id = tenant_do_usuario()
                and (tem_permissao(''cmal_relatorios'', ''criar'') or tem_permissao(''cmal_relatorios'', ''editar'')))
         with check (tenant_id = tenant_do_usuario()
                and (tem_permissao(''cmal_relatorios'', ''criar'') or tem_permissao(''cmal_relatorios'', ''editar'')))', t);
    execute format(
      'create policy t_exclusao on %I for delete to authenticated
         using (tenant_id = tenant_do_usuario()
                and (tem_permissao(''cmal_relatorios'', ''criar'') or tem_permissao(''cmal_relatorios'', ''editar'')))', t);
  end loop;
end $$;
