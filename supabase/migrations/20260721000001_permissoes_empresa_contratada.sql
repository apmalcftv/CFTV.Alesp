-- ============================================================
-- Reforça as permissões da empresa contratada na OS (garantia no
-- banco, não só botão escondido na UI):
-- (1) libera a transição de status para 'aberta' — usada pelo novo
--     fluxo "Cancelar manutenção" (devolve a OS ao CFTC sem excluir
--     nem cancelar a ocorrência);
-- (2) bloqueia qualquer mudança de prioridade vinda desse papel —
--     campo passou a ser somente leitura para empresa_contratada.
-- ============================================================

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
  end if;
  return new;
end;
$$;
