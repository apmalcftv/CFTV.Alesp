-- ============================================================
-- Fase 1 — Ajustes de modelagem para importação idempotente
-- (M1–M6 aprovados em 14/07/2026; M7 aplicado na migração 0001)
-- ============================================================

-- M1: chave natural da linha da planilha (hash câmera|data|texto).
-- Reimportar a planilha ATUALIZA a OS existente em vez de duplicar.
alter table ocorrencias
  add column import_chave text unique;

comment on column ocorrencias.import_chave is
  'Chave de idempotência da importação da planilha (md5 de câmera|data|texto). NULL para OS criadas pelo sistema.';

-- M2–M6: chaves naturais dos catálogos, para upsert idempotente
alter table predios        add constraint predios_nome_unico        unique (nome);
alter table locais         add constraint locais_predio_nome_unico  unique (predio_id, nome);
alter table empresas       add constraint empresas_nome_unico       unique (nome);
alter table tecnicos       add constraint tecnicos_empresa_nome_unico unique (empresa_id, nome);
alter table modelos_camera add constraint modelos_fab_nome_unico    unique (fabricante_id, nome);
