-- ============================================================
-- Refinamento do Grid Investigativo (aba Análise): comentários
-- internos por evento da timeline — visíveis só para operadores
-- dentro do sistema, nunca nas exportações Excel/PDF (a exclusão é
-- feita na camada de exportação, que já mapeia campos nominalmente
-- em vez de serializar a linha inteira).
-- ============================================================

alter table relatorio_timeline_eventos
  add column if not exists comentario_interno text;
