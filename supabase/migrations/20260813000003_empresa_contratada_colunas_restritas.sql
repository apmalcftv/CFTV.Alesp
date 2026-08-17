-- ============================================================
-- Empresa Contratada em OS/Câmeras — visibilidade por status e
-- proteção de colunas administrativas.
--
-- Autorizado após auditoria (ver relatório de Fase 1/2). Duas mudanças,
-- nenhuma delas mexe em Câmeras, no CMAL ou em outro perfil.
--
-- 1) t_leitura (ocorrencias): a Empresa Contratada só enxergava por
--    tenant + empresa, sem filtro de status — via CONCLUÍDA e CANCELADA.
--    Acrescenta status IN ('aberta','em_andamento','aguardando_aceite')
--    só dentro do ramo que já era exclusivo dela.
--
-- 2) valida_transicao_empresa(): já bloqueava status fora da máquina de
--    estados e prioridade. Ganha três verificações no mesmo estilo:
--    tecnico_id, sla_horas e empresa_id não podem ser alterados por
--    quem é empresa_contratada. empresa_id já era bloqueado pelo
--    WITH CHECK de t_empresa_atualiza_os — a checagem aqui é defesa em
--    profundidade, com mensagem explícita em vez de erro genérico de RLS.
--
-- Fora de escopo, de propósito: vínculo usuário→técnico (não existe no
-- schema e não foi criado agora — decisão registrada), cadastro de
-- técnicos, matriz de permissões, qualquer coisa de Câmeras/CMAL.
-- ============================================================

alter policy t_leitura on ocorrencias
  using (
    tenant_id = tenant_do_usuario()
    and tem_permissao('cameras_os', 'visualizar')
    and (
      papel_atual() <> 'empresa_contratada'::papel_usuario
      or (
        empresa_id = empresa_do_usuario()
        and status in ('aberta', 'em_andamento', 'aguardando_aceite')
      )
    )
  );

create or replace function public.valida_transicao_empresa()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if papel_atual() = 'empresa_contratada' then
    if new.status is distinct from old.status
       and new.status not in ('em_andamento', 'aguardando_aceite', 'aberta') then
      raise exception 'Empresa contratada não pode alterar a ocorrência para este status.'
        using errcode = 'P0001';
    end if;
    if new.prioridade is distinct from old.prioridade then
      raise exception 'Empresa contratada não pode alterar a prioridade da ocorrência.'
        using errcode = 'P0001';
    end if;
    if new.tecnico_id is distinct from old.tecnico_id then
      raise exception 'Empresa contratada não pode alterar o técnico responsável.'
        using errcode = 'P0001';
    end if;
    if new.sla_horas is distinct from old.sla_horas then
      raise exception 'Empresa contratada não pode alterar o prazo (SLA).'
        using errcode = 'P0001';
    end if;
    if new.empresa_id is distinct from old.empresa_id then
      raise exception 'Empresa contratada não pode alterar a empresa responsável.'
        using errcode = 'P0001';
    end if;
  end if;
  return new;
end;
$$;
