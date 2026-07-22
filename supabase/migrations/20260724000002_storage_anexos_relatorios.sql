-- ============================================================
-- Storage para anexos do módulo "Relatórios de Ocorrências" (CMAL)
-- Bucket privado próprio (não reaproveita o bucket "anexos" do módulo
-- de manutenção — mantém a independência entre os dois módulos).
-- Path de cada objeto: {tenant_id}/{relatorio_id}/{arquivo}
-- ============================================================

insert into storage.buckets (id, name, public)
values ('anexos-relatorios', 'anexos-relatorios', false)
on conflict (id) do nothing;

create policy "t_anexos_relatorios_leitura" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'anexos-relatorios'
    and (storage.foldername(name))[1] = tenant_do_usuario()::text
    and papel_atual() in ('administrador','operador_cftc','fiscal_alesp','gestor')
  );

create policy "t_anexos_relatorios_upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'anexos-relatorios'
    and (storage.foldername(name))[1] = tenant_do_usuario()::text
    and papel_atual() in ('administrador','operador_cftc')
  );

create policy "t_anexos_relatorios_exclusao" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'anexos-relatorios'
    and (storage.foldername(name))[1] = tenant_do_usuario()::text
    and papel_atual() in ('administrador','operador_cftc')
  );
