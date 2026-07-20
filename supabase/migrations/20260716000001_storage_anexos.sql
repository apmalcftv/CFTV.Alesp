-- ============================================================
-- Fase 2 — Storage para anexos de ocorrências (fotos/vídeos)
-- Bucket privado; path de cada objeto: {tenant_id}/{ocorrencia_id}/{arquivo}
-- Espelha a RLS da tabela anexos: leitura por tenant, escrita por
-- admin/operador, e por 'empresa' apenas nas OS da própria empresa.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('anexos', 'anexos', false)
on conflict (id) do nothing;

create policy "t_anexos_leitura" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'anexos'
    and (storage.foldername(name))[1] = tenant_do_usuario()::text
  );

create policy "t_anexos_upload" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'anexos'
    and (storage.foldername(name))[1] = tenant_do_usuario()::text
    and (
      papel_atual() in ('admin', 'operador')
      or (
        papel_atual() = 'empresa'
        and exists (
          select 1 from ocorrencias o
          where o.id::text = (storage.foldername(name))[2]
            and o.empresa_id = empresa_do_usuario()
        )
      )
    )
  );

create policy "t_anexos_exclusao" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'anexos'
    and (storage.foldername(name))[1] = tenant_do_usuario()::text
    and papel_atual() in ('admin', 'operador')
  );
