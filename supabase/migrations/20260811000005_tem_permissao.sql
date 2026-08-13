-- ============================================================
-- FASE 2 — Função central de autorização
--
-- Cria `tem_permissao(recurso, acao)`, que a partir da Fase 3 substituirá
-- as listas literais de papéis dentro das policies do CMAL.
--
-- Nesta migration a função é criada e fica ÓRFÃ de propósito: nenhuma
-- policy a consulta ainda, nenhum comportamento muda. Só depois da sua
-- aprovação da Fase 3 é que as policies passam a chamá-la.
--
-- Quatro propriedades deliberadas:
--
-- 1. ADMINISTRADOR EM CURTO-CIRCUITO. O acesso total do administrador é
--    código, não dado. Não existe combinação de caixas desmarcadas na
--    tela de configuração capaz de trancar o administrador fora.
--
-- 2. SECURITY DEFINER É OBRIGATÓRIO, não conveniência. `permissoes_perfil`
--    tem RLS. Sem isto, a policy de uma tabela chamaria esta função, que
--    leria a tabela cuja policy chamaria a função — recursão infinita.
--
-- 3. STABLE permite ao Postgres reaproveitar o resultado para os mesmos
--    argumentos dentro do mesmo comando: não é uma consulta por linha
--    retornada.
--
-- 4. NEGA POR OMISSÃO. Linha ausente ou `permitido = false` resultam em
--    falso. Recurso novo nasce fechado até ser semeado e liberado de
--    propósito. Vale também para quem não está aprovado:
--    `tenant_do_usuario()` exige status 'aprovado' e devolve null para
--    conta pendente, bloqueada, rejeitada ou excluída — nenhuma linha
--    casa e tudo é negado, sem precisar de checagem extra.
-- ============================================================

create or replace function tem_permissao(p_recurso text, p_acao text)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $$
  select case
    when papel_atual() = 'administrador'::papel_usuario then true
    else exists (
      select 1
        from permissoes_perfil
       where tenant_id = tenant_do_usuario()
         and papel     = papel_atual()
         and recurso   = p_recurso
         and acao      = p_acao
         and permitido
    )
  end;
$$;

comment on function tem_permissao(text, text) is
  'Autorização central por (recurso, ação) lendo permissoes_perfil. Administrador sempre verdadeiro. Nega por omissão. Usada nas policies do módulo CMAL a partir da Fase 3.';
