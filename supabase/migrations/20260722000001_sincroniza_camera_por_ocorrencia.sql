-- ============================================================
-- Sincronização de mão única: enquanto a ocorrência estiver em um
-- dos 3 status "em aberto" (aberta/em_andamento/aguardando_aceite),
-- a câmera vinculada fica automaticamente inoperante. Ao concluir ou
-- cancelar a OS, nada muda automaticamente — o operador continua
-- escolhendo o status final da câmera pelo fluxo já existente
-- (modal "Atualizar status da câmera" em detalhe-client.tsx).
-- Câmeras desligada_permanentemente nunca são tocadas por esta regra.
-- ============================================================

create or replace function public.sincronizar_status_camera_por_ocorrencia()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.camera_id is not null
     and new.status in ('aberta', 'em_andamento', 'aguardando_aceite') then
    update cameras
    set status = 'inoperante'
    where id = new.camera_id
      and status not in ('inoperante', 'desligada_permanentemente');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_sincronizar_status_camera on ocorrencias;
create trigger trg_sincronizar_status_camera
  after insert or update of status on ocorrencias
  for each row execute function sincronizar_status_camera_por_ocorrencia();

-- backfill: OS já existentes que porventura estejam num desses 3 status
update cameras c
set status = 'inoperante'
from ocorrencias o
where o.camera_id = c.id
  and o.status in ('aberta', 'em_andamento', 'aguardando_aceite')
  and c.status not in ('inoperante', 'desligada_permanentemente');
