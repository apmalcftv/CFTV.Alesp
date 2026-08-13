-- ============================================================
-- Aba Histórico do Relatório de Ocorrências vira trilha de auditoria
-- objetiva: quem, quando, qual ação, qual campo — e nada além disso.
--
-- Duas mudanças de comportamento:
--
-- 1. A trigger de edição cobria só 5 campos (status, prioridade,
--    operador_id, departamento_id, data_limite). Passa a cobrir todos os
--    campos editáveis do relatório.
--
-- 2. `valor_anterior` e `valor_novo` deixam de ser preenchidos. As
--    colunas continuam existindo e o conteúdo já gravado nelas é
--    preservado — nenhum registro antigo é apagado ou alterado; a tela
--    é que deixa de exibir valores.
--
-- A ação é deduzida da transição: nulo/vazio -> valor é "adicao",
-- valor -> nulo/vazio é "exclusao", valor -> valor é "edicao".
--
-- Anexos ganham auditoria própria (adicionar/excluir), que não existia.
-- ============================================================

-- Registra a mudança de um campo. Centraliza a classificação da ação
-- para que a trigger fique só com a lista de campos.
create or replace function registrar_campo_historico(
  p_relatorio uuid,
  p_tenant uuid,
  p_autor uuid,
  p_campo text,
  p_anterior text,
  p_novo text
) returns void
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  if p_anterior is not distinct from p_novo then
    return;
  end if;

  insert into relatorio_historico (relatorio_id, tenant_id, autor_id, tipo, campo)
  values (
    p_relatorio,
    p_tenant,
    p_autor,
    case
      when p_anterior is null or p_anterior = '' then 'adicao'
      when p_novo is null or p_novo = '' then 'exclusao'
      else 'edicao'
    end,
    p_campo
  );
end;
$$;

create or replace function registrar_historico_relatorio()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_autor uuid := auth.uid();
begin
  -- Dados da Solicitação
  perform registrar_campo_historico(new.id, new.tenant_id, v_autor, 'numero_memorando', old.numero_memorando, new.numero_memorando);
  perform registrar_campo_historico(new.id, new.tenant_id, v_autor, 'tipo_solicitacao_id', old.tipo_solicitacao_id::text, new.tipo_solicitacao_id::text);
  perform registrar_campo_historico(new.id, new.tenant_id, v_autor, 'solicitante_id', old.solicitante_id::text, new.solicitante_id::text);
  perform registrar_campo_historico(new.id, new.tenant_id, v_autor, 'departamento_id', old.departamento_id::text, new.departamento_id::text);
  perform registrar_campo_historico(new.id, new.tenant_id, v_autor, 'data_solicitacao', old.data_solicitacao::text, new.data_solicitacao::text);
  perform registrar_campo_historico(new.id, new.tenant_id, v_autor, 'data_limite', old.data_limite::text, new.data_limite::text);
  perform registrar_campo_historico(new.id, new.tenant_id, v_autor, 'status', old.status::text, new.status::text);
  perform registrar_campo_historico(new.id, new.tenant_id, v_autor, 'prioridade', old.prioridade::text, new.prioridade::text);
  perform registrar_campo_historico(new.id, new.tenant_id, v_autor, 'operador_id', old.operador_id::text, new.operador_id::text);
  perform registrar_campo_historico(new.id, new.tenant_id, v_autor, 'classificacao', old.classificacao::text, new.classificacao::text);

  -- Dados do Fato
  perform registrar_campo_historico(new.id, new.tenant_id, v_autor, 'data_fato', old.data_fato::text, new.data_fato::text);
  perform registrar_campo_historico(new.id, new.tenant_id, v_autor, 'hora_aproximada', old.hora_aproximada::text, new.hora_aproximada::text);
  perform registrar_campo_historico(new.id, new.tenant_id, v_autor, 'local_id', old.local_id::text, new.local_id::text);
  perform registrar_campo_historico(new.id, new.tenant_id, v_autor, 'tipo_ocorrencia_id', old.tipo_ocorrencia_id::text, new.tipo_ocorrencia_id::text);
  perform registrar_campo_historico(new.id, new.tenant_id, v_autor, 'descricao_fato', old.descricao_fato, new.descricao_fato);
  perform registrar_campo_historico(new.id, new.tenant_id, v_autor, 'pessoas_envolvidas', old.pessoas_envolvidas, new.pessoas_envolvidas);
  perform registrar_campo_historico(new.id, new.tenant_id, v_autor, 'observacoes_fato', old.observacoes_fato, new.observacoes_fato);

  -- Resultado
  perform registrar_campo_historico(new.id, new.tenant_id, v_autor, 'conclusao', old.conclusao, new.conclusao);
  perform registrar_campo_historico(new.id, new.tenant_id, v_autor, 'providencias_adotadas', old.providencias_adotadas, new.providencias_adotadas);
  perform registrar_campo_historico(new.id, new.tenant_id, v_autor, 'resumo_executivo', old.resumo_executivo, new.resumo_executivo);
  perform registrar_campo_historico(new.id, new.tenant_id, v_autor, 'encaminhamento', old.encaminhamento, new.encaminhamento);
  perform registrar_campo_historico(new.id, new.tenant_id, v_autor, 'data_conclusao', old.data_conclusao::text, new.data_conclusao::text);
  perform registrar_campo_historico(new.id, new.tenant_id, v_autor, 'concluido_por', old.concluido_por::text, new.concluido_por::text);

  return new;
end;
$$;

-- Anexos: adicionar e excluir passam a aparecer na trilha.
create or replace function registrar_historico_anexo()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_relatorio uuid;
  v_tenant uuid;
begin
  if tg_op = 'INSERT' then
    v_relatorio := new.relatorio_id;
    v_tenant := new.tenant_id;
  else
    v_relatorio := old.relatorio_id;
    v_tenant := old.tenant_id;
  end if;

  -- Excluir o relatório apaga os anexos por cascata. Registrar histórico
  -- aí seria gravar um evento de um relatório que deixou de existir — a
  -- FK recusaria e a exclusão inteira falharia.
  if not exists (select 1 from relatorios_ocorrencia where id = v_relatorio) then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  insert into relatorio_historico (relatorio_id, tenant_id, autor_id, tipo, campo)
  values (
    v_relatorio,
    v_tenant,
    auth.uid(),
    case when tg_op = 'INSERT' then 'adicao' else 'exclusao' end,
    'anexo'
  );

  if tg_op = 'DELETE' then return old; end if;
  return new;
end;
$$;

drop trigger if exists trg_relatorio_anexo_historico on relatorio_anexos;
create trigger trg_relatorio_anexo_historico
  after insert or delete on relatorio_anexos
  for each row execute function registrar_historico_anexo();
