-- ============================================================
-- Leitura contextual dos relacionamentos da OS para Empresa Contratada
--
-- CAUSA RAIZ: a RLS de `ocorrencias` já deixa a Empresa Contratada ver a
-- própria OS (t_leitura, escopo por empresa + status). Mas a lista de
-- OS/Câmeras busca câmera, local, prédio, defeito e empresa como
-- relacionamentos embutidos do PostgREST (`camera:cameras(...)`,
-- `empresa:empresas(...)`, `tipo_defeito:tipos_defeito(...)`), e cada um
-- desses é filtrado PELA RLS DA PRÓPRIA TABELA RELACIONADA — que hoje só
-- libera `visualizar` para quem tem o recurso correspondente do catálogo
-- (`cameras_inventario`, `cameras_empresas`, `cameras_locais`,
-- `cameras_predios`, `cameras_defeitos`) marcado `true` na matriz. Empresa
-- Contratada tem esses 5 recursos `false` (correto — ela não gerencia
-- Cadastros), então o PostgREST devolve a OS com os relacionamentos nulos.
--
-- SOLUÇÃO: policies SELECT ADICIONAIS (permissivas — somam por OR com a
-- `t_leitura` já homologada, nunca a substituem), exclusivas do papel
-- `empresa_contratada`, liberando cada tabela relacionada SOMENTE quando o
-- registro está referenciado por uma OS que ela já está autorizada a ver.
-- O escopo repete literalmente o mesmo critério de `ocorrencias.t_leitura`:
-- `empresa_id = empresa_do_usuario()` e
-- `status in ('aberta','em_andamento','aguardando_aceite')`.
--
-- NÃO SECURITY DEFINER: desnecessário aqui. Cada policy nova faz um
-- `exists (select ... from ocorrencias ...)` direto, exatamente como as
-- policies `t_empresa_anexos`/`t_empresa_eventos` já fazem hoje (ver
-- 20260813000002). `ocorrencias.t_leitura` não referencia `cameras`,
-- `locais`, `predios`, `tipos_defeito` nem `empresas` — então ler
-- `ocorrencias` de dentro da policy de qualquer uma dessas tabelas não
-- fecha ciclo, é uma cadeia direcionada (DAG), nunca uma referência de
-- volta:
--
--     predios ← locais ← cameras ← ocorrencias
--     tipos_defeito ← ocorrencias
--     empresas ← ocorrencias
--
-- Para `locais` e `predios`, o EXISTS precisa atravessar `cameras`
-- (e `locais`, no caso de `predios`) via JOIN dentro da própria subquery.
-- Isso reavalia a RLS dessas tabelas intermediárias (comportamento padrão
-- do Postgres para qualquer leitura, inclusive dentro de uma subquery de
-- policy) — mas como a condição é a mesma linha de OS, o resultado é
-- consistente: a câmera que aparece nessa subquery é exatamente a mesma
-- que a policy nova de `cameras` já libera.
--
-- NÃO TOCADO: `t_leitura` de nenhuma das 6 tabelas, matriz de permissões,
-- `permissoes_perfil`, `permissoes_catalogo`, `t_empresa_atualiza_os`,
-- trigger `valida_transicao_empresa`, INSERT/UPDATE/DELETE de qualquer
-- tabela. Estas policies são SOMENTE SELECT.
-- ============================================================

-- ---------- cameras ----------
drop policy if exists t_leitura_os_empresa_contratada on cameras;
create policy t_leitura_os_empresa_contratada on cameras
  for select to authenticated
  using (
    tenant_id = tenant_do_usuario()
    and papel_atual() = 'empresa_contratada'::papel_usuario
    and exists (
      select 1 from ocorrencias o
      where o.camera_id = cameras.id
        and o.empresa_id = empresa_do_usuario()
        and o.status = any (array['aberta'::ocorrencia_status,
                                   'em_andamento'::ocorrencia_status,
                                   'aguardando_aceite'::ocorrencia_status])
    )
  );

-- ---------- empresas (somente a própria) ----------
drop policy if exists t_leitura_os_empresa_contratada on empresas;
create policy t_leitura_os_empresa_contratada on empresas
  for select to authenticated
  using (
    tenant_id = tenant_do_usuario()
    and papel_atual() = 'empresa_contratada'::papel_usuario
    and empresas.id = empresa_do_usuario()
    and exists (
      select 1 from ocorrencias o
      where o.empresa_id = empresas.id
        and o.status = any (array['aberta'::ocorrencia_status,
                                   'em_andamento'::ocorrencia_status,
                                   'aguardando_aceite'::ocorrencia_status])
    )
  );

-- ---------- tipos_defeito ----------
drop policy if exists t_leitura_os_empresa_contratada on tipos_defeito;
create policy t_leitura_os_empresa_contratada on tipos_defeito
  for select to authenticated
  using (
    tenant_id = tenant_do_usuario()
    and papel_atual() = 'empresa_contratada'::papel_usuario
    and exists (
      select 1 from ocorrencias o
      where o.tipo_defeito_id = tipos_defeito.id
        and o.empresa_id = empresa_do_usuario()
        and o.status = any (array['aberta'::ocorrencia_status,
                                   'em_andamento'::ocorrencia_status,
                                   'aguardando_aceite'::ocorrencia_status])
    )
  );

-- ---------- locais (via câmera da OS) ----------
drop policy if exists t_leitura_os_empresa_contratada on locais;
create policy t_leitura_os_empresa_contratada on locais
  for select to authenticated
  using (
    tenant_id = tenant_do_usuario()
    and papel_atual() = 'empresa_contratada'::papel_usuario
    and exists (
      select 1
        from ocorrencias o
        join cameras c on c.id = o.camera_id
       where c.local_id = locais.id
         and o.empresa_id = empresa_do_usuario()
         and o.status = any (array['aberta'::ocorrencia_status,
                                    'em_andamento'::ocorrencia_status,
                                    'aguardando_aceite'::ocorrencia_status])
    )
  );

-- ---------- predios (via local da câmera da OS) ----------
drop policy if exists t_leitura_os_empresa_contratada on predios;
create policy t_leitura_os_empresa_contratada on predios
  for select to authenticated
  using (
    tenant_id = tenant_do_usuario()
    and papel_atual() = 'empresa_contratada'::papel_usuario
    and exists (
      select 1
        from ocorrencias o
        join cameras c on c.id = o.camera_id
        join locais l on l.id = c.local_id
       where l.predio_id = predios.id
         and o.empresa_id = empresa_do_usuario()
         and o.status = any (array['aberta'::ocorrencia_status,
                                    'em_andamento'::ocorrencia_status,
                                    'aguardando_aceite'::ocorrencia_status])
    )
  );
