-- ============================================================
-- Correções da auditoria da Fase 3 — as duas brechas em que a matriz
-- era ignorada no banco.
--
-- 1) Bucket `anexos-relatorios`: as policies do Storage seguiam por papel
--    fixo enquanto a tabela `relatorio_anexos` já consultava a matriz.
--    Resultado comprovado em teste: quem perdia `editar` era bloqueado na
--    tabela mas continuava subindo e apagando arquivos no bucket.
--
-- 2) Catálogo `locais`: o formulário de relatório é texto livre e a ponte
--    `catalogo-por-nome.ts` cria o local no envio. Como `locais` é
--    compartilhado com o módulo Câmeras, ficou sob `t_escrita_operador` —
--    conceder `criar` a um perfil novo funcionava só enquanto ele usasse
--    locais já cadastrados.
--
-- Nada de dado é alterado: nenhum local, anexo ou arquivo é tocado.
-- O módulo Câmeras e as regras da empresa_contratada seguem intactos.
-- ============================================================

-- ---------- 1. Storage do CMAL ----------
-- Espelha exatamente o mapeamento já homologado da tabela
-- `relatorio_anexos`: baixar exige `visualizar`; subir, substituir e
-- remover exigem `editar`. Assim arquivo e registro nunca divergem — não
-- há combinação de permissões que gere arquivo órfão no bucket.
--
-- O DELETE aceita também `excluir` porque a exclusão do relatório passa
-- por aqui: `excluirRelatorio()` remove os arquivos antes de apagar o
-- relatório (a cascata das FKs não alcança o Storage). Sem isso, quem
-- tivesse `excluir` sem `editar` travaria na remoção dos arquivos.
--
-- O bucket é exclusivo do CMAL — o bucket `anexos` do módulo Câmeras tem
-- policies próprias e não é tocado aqui.

drop policy if exists t_anexos_relatorios_leitura on storage.objects;
create policy t_anexos_relatorios_leitura on storage.objects
  for select to authenticated
  using (
    bucket_id = 'anexos-relatorios'
    and (storage.foldername(name))[1] = tenant_do_usuario()::text
    and tem_permissao('cmal_relatorios', 'visualizar')
  );

drop policy if exists t_anexos_relatorios_upload on storage.objects;
create policy t_anexos_relatorios_upload on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'anexos-relatorios'
    and (storage.foldername(name))[1] = tenant_do_usuario()::text
    and tem_permissao('cmal_relatorios', 'editar')
  );

-- Não existia policy de UPDATE: substituir um arquivo era impossível para
-- qualquer papel. Criada agora para o conjunto ficar completo e coerente.
drop policy if exists t_anexos_relatorios_atualizacao on storage.objects;
create policy t_anexos_relatorios_atualizacao on storage.objects
  for update to authenticated
  using (
    bucket_id = 'anexos-relatorios'
    and (storage.foldername(name))[1] = tenant_do_usuario()::text
    and tem_permissao('cmal_relatorios', 'editar')
  )
  with check (
    bucket_id = 'anexos-relatorios'
    and (storage.foldername(name))[1] = tenant_do_usuario()::text
    and tem_permissao('cmal_relatorios', 'editar')
  );

drop policy if exists t_anexos_relatorios_exclusao on storage.objects;
create policy t_anexos_relatorios_exclusao on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'anexos-relatorios'
    and (storage.foldername(name))[1] = tenant_do_usuario()::text
    and (
      tem_permissao('cmal_relatorios', 'editar')
      or tem_permissao('cmal_relatorios', 'excluir')
    )
  );

-- ---------- 2. Catálogo `locais` ----------
-- Policy ADICIONAL, não substituta: `t_escrita_operador` continua
-- existindo e inalterada, então o módulo Câmeras não muda em nada.
-- Policies permissivas se somam (OR), de modo que esta apenas ESTENDE a
-- permissão de inserir a quem a matriz do CMAL autoriza.
--
-- Só INSERT: a ponte texto->id faz find-or-create, nunca atualiza nem
-- apaga local. Editar e excluir local seguem exclusivos de quem já podia,
-- pelo cadastro de Locais do módulo Câmeras.
drop policy if exists t_locais_insercao_cmal on locais;
create policy t_locais_insercao_cmal on locais
  for insert to authenticated
  with check (
    tenant_id = tenant_do_usuario()
    and (
      tem_permissao('cmal_relatorios', 'criar')
      or tem_permissao('cmal_relatorios', 'editar')
    )
  );
