-- ============================================================
-- Preenche branding.logo_url do tenant CFTV Alesp com a logo oficial.
--
-- Correção pontual de dado, não de schema: o campo já existia (jsonb
-- livre em `tenants.branding`), só estava vazio — nunca foi preenchido
-- desde a criação do tenant. Login e sidebar já sabiam ler esse campo;
-- só não tinham o que mostrar.
--
-- jsonb_set toca SOMENTE a chave logo_url, preservando cores, descricao,
-- dominio_email, nome_sistema, rodape e subtitulo exatamente como estão.
--
-- Escopo por id: hoje só existe o tenant Alesp, mas a atualização é
-- restrita a ele mesmo assim — nenhum outro tenant é tocado, mesmo que
-- venham a existir no futuro.
--
-- URL relativa (/icons/icon-512.png, não um domínio fixo): resolve
-- contra a própria origem onde a página está sendo servida — funciona em
-- produção, preview e qualquer domínio futuro sem precisar de nova
-- migration. O arquivo é o mesmo já usado como ícone 512x512 do PWA.
-- ============================================================

update tenants
   set branding = jsonb_set(branding, '{logo_url}', '"/icons/icon-512.png"'::jsonb, true)
 where id = 'dca48923-1194-4359-aa47-de55dfe7fc07';
