// Gera o SQL idempotente da importação (upserts com ON CONFLICT).
// Multi-tenant (S1): todos os registros pertencem ao tenant informado
// (padrão: alesp). Executado como postgres — não passa por RLS.

import { PREDIO_PADRAO } from "./parser-planilha.mts";
import type { ResultadoParse } from "./tipos.mts";

function q(v: string | null): string {
  if (v === null) return "NULL";
  return `'${v.replace(/'/g, "''")}'`;
}

export function gerarSql(
  r: ResultadoParse,
  geradoEm: Date,
  tenantSlug = "alesp"
): string {
  const partes: string[] = [];
  // subselect do tenant, usado em todos os upserts
  const T = `(select id from tenants where slug = ${q(tenantSlug)})`;

  partes.push(`-- ============================================================
-- Importação da planilha "Câmeras inoperantes/com novidades"
-- Tenant: ${tenantSlug}
-- Gerado em ${geradoEm.toISOString()} por scripts/importar-planilha.mts
-- IDEMPOTENTE: pode ser executado várias vezes sem duplicar registros.
-- Requer as migrações até 20260714000003_multitenant aplicadas.
-- ============================================================
begin;

do $$ begin
  if not exists (select 1 from tenants where slug = ${q(tenantSlug)}) then
    raise exception 'Tenant "${tenantSlug}" não existe. Crie-o antes de importar.';
  end if;
end $$;`);

  // ---------- Prédio agrupador (decisão D2 da Fase 1) ----------
  partes.push(`
insert into predios (tenant_id, nome, sigla)
select id, ${q(PREDIO_PADRAO)}, 'ALESP' from tenants where slug = ${q(tenantSlug)}
on conflict (tenant_id, nome) do nothing;`);

  // ---------- Locais ----------
  const predioSel = `(select id from predios where tenant_id = ${T} and nome = ${q(PREDIO_PADRAO)})`;
  partes.push(`\n-- Locais extraídos e normalizados do texto livre (${r.locais.length})`);
  for (const l of r.locais) {
    partes.push(
      `insert into locais (tenant_id, predio_id, nome, tipo_area, andar)
values (${T}, ${predioSel}, ${q(l.nome)}, ${q(l.tipoArea)}, ${q(l.andar)})
on conflict (predio_id, nome) do update set tipo_area = excluded.tipo_area, andar = excluded.andar;`
    );
  }

  // ---------- Empresa e técnico ----------
  const empresaSel = `(select id from empresas where tenant_id = ${T} and nome = 'Infogoogle')`;
  partes.push(`
insert into empresas (tenant_id, nome)
select id, 'Infogoogle' from tenants where slug = ${q(tenantSlug)}
on conflict (tenant_id, nome) do nothing;
insert into tecnicos (tenant_id, empresa_id, nome)
values (${T}, ${empresaSel}, 'Eduardo')
on conflict (empresa_id, nome) do nothing;`);

  // ---------- Câmeras ----------
  partes.push(`\n-- Inventário: ${r.cameras.length} câmeras (status final ajustado no fim)`);
  for (const c of r.cameras) {
    const localSel = c.local
      ? `(select l.id from locais l where l.predio_id = ${predioSel} and l.nome = ${q(c.local.nome)})`
      : "NULL";
    partes.push(
      `insert into cameras (tenant_id, numero, local_id, observacoes)
values (${T}, ${c.numero}, ${localSel}, ${q(c.observacoes)})
on conflict (tenant_id, numero) do update set local_id = excluded.local_id, observacoes = excluded.observacoes;`
    );
  }

  // ---------- Ocorrências ----------
  // numero da OS: atribuído pelo trigger (contador por tenant)
  partes.push(`\n-- Ocorrências: ${r.ocorrencias.length} (upsert por tenant + import_chave)`);
  for (const o of r.ocorrencias) {
    const cameraSel =
      o.camera !== null
        ? `(select id from cameras where tenant_id = ${T} and numero = ${o.camera})`
        : "NULL";
    const tecnicoSel = o.tecnico
      ? `(select t.id from tecnicos t where t.empresa_id = ${empresaSel} and t.nome = ${q(o.tecnico)})`
      : "NULL";
    partes.push(
      `insert into ocorrencias
  (tenant_id, import_chave, camera_id, tipo_defeito_id, descricao, prioridade, status,
   empresa_id, tecnico_id, impedimento, aberta_em, encerrada_em)
values
  (${T}, ${q(o.importChave)}, ${cameraSel},
   (select id from tipos_defeito where tenant_id = ${T} and nome = ${q(o.defeito)}),
   ${q(o.descricao)}, 'media', ${q(o.status)},
   ${empresaSel}, ${tecnicoSel},
   ${q(o.impedimento)}, ${q(o.abertaEm)}, ${o.encerradaEm ? q(o.encerradaEm) : "NULL"})
on conflict (tenant_id, import_chave) do update set
  status = excluded.status,
  encerrada_em = excluded.encerrada_em,
  impedimento = excluded.impedimento,
  descricao = excluded.descricao,
  tipo_defeito_id = excluded.tipo_defeito_id,
  aberta_em = excluded.aberta_em,
  tecnico_id = excluded.tecnico_id;`
    );
  }

  // ---------- Substituições ----------
  const comSub = r.cameras.filter((c) => c.substituidaPor !== null);
  if (comSub.length) {
    partes.push(`\n-- Substituições rastreadas (cameras.substituida_por)`);
    for (const c of comSub) {
      partes.push(
        `update cameras set substituida_por =
  (select id from cameras where tenant_id = ${T} and numero = ${c.substituidaPor})
where tenant_id = ${T} and numero = ${c.numero};`
      );
    }
  }

  // ---------- Status final das câmeras ----------
  partes.push(`\n-- Status final derivado (corrige efeitos dos triggers nos inserts históricos)`);
  partes.push(
    `update cameras c set status = v.status::camera_status
from (values
${r.cameras.map((c) => `  (${c.numero}, ${q(c.status)})`).join(",\n")}
) as v(numero, status)
where c.numero = v.numero and c.tenant_id = ${T};`
  );

  partes.push(`\ncommit;`);
  return partes.join("\n") + "\n";
}
