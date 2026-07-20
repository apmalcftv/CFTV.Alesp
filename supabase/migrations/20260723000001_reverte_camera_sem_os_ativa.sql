-- ============================================================
-- Corrige a sincronização de mão única criada em
-- 20260722000001_sincroniza_camera_por_ocorrencia.sql: faltava
-- reverter a câmera para operante quando a OS que a deixou
-- inoperante é concluída ou cancelada e não sobra nenhuma outra OS
-- ativa (aberta/em_andamento/aguardando_aceite) para essa câmera.
--
-- Importante: só reverte quando o status ATUAL da câmera ainda é
-- 'inoperante' — isso preserva o fluxo já existente onde o operador
-- escolhe explicitamente o status final da câmera ao aceitar a OS
-- (modal "Atualizar status da câmera" em detalhe-client.tsx, que
-- atualiza a câmera ANTES da OS virar concluída): se o operador já
-- escolheu outro status manualmente, esta trigger não mexe em nada.
-- ============================================================

create or replace function public.sincronizar_status_camera_por_ocorrencia()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.camera_id is null then
    return new;
  end if;

  if new.status in ('aberta', 'em_andamento', 'aguardando_aceite') then
    update cameras
    set status = 'inoperante'
    where id = new.camera_id
      and status not in ('inoperante', 'desligada_permanentemente');
  elsif new.status in ('concluida', 'cancelada') then
    if not exists (
      select 1 from ocorrencias
      where camera_id = new.camera_id
        and id <> new.id
        and status in ('aberta', 'em_andamento', 'aguardando_aceite')
    ) then
      update cameras
      set status = 'operante'
      where id = new.camera_id
        and status = 'inoperante';
    end if;
  end if;

  return new;
end;
$$;

-- backfill: câmeras hoje inoperante sem nenhuma OS ativa vinculada
update cameras c
set status = 'operante'
where c.status = 'inoperante'
  and not exists (
    select 1 from ocorrencias o
    where o.camera_id = c.id
      and o.status in ('aberta', 'em_andamento', 'aguardando_aceite')
  );
