-- ============================================================
-- Corrige o backfill de 20260726000001.
--
-- Aquela migração gravou status_camera_anterior = 'operante' em TODA OS
-- aberta com câmera. O palpite só é válido para as câmeras que a regra
-- antiga de fato controlava: ela deixava a câmera 'inoperante' na
-- abertura e revertia para 'operante' no encerramento — nunca tocava em
-- câmera em qualquer outro status.
--
-- Para as demais (ex.: "Removida por obra" cuja câmera já estava
-- 'desligada' antes da OS existir), 'operante' está errado: ao encerrar,
-- a câmera voltaria a operante sem nunca ter sido reparada.
--
-- Zerar as marcas restaura exatamente o comportamento antigo (não
-- reverter) e é auto-corretivo: na próxima transição de status da OS a
-- trigger recaptura o status anterior real da câmera.
-- ============================================================

update ocorrencias o
   set status_camera_anterior = null,
       status_camera_aplicado = null
  from cameras c
 where c.id = o.camera_id
   and o.status in ('aberta', 'em_andamento', 'aguardando_aceite')
   and o.status_camera_aplicado is not null
   and c.status in ('desligada', 'desligada_permanentemente')
   and c.status = o.status_camera_aplicado;
