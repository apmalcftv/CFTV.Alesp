# Importação da planilha CFTV → Banco de dados

Documentação do pipeline da Fase 1 (migração da planilha "Câmeras
inoperantes/com novidades" para o Supabase).

## Fluxo

```
planilha_cftv.xlsx
   │
   │  node scripts/importar-planilha.mts [caminho.xlsx]
   │  (parser + normalização + regras aprovadas em FASE1_MIGRACAO.md)
   ▼
supabase/import/planilha_import.sql   ← SQL idempotente (upserts)
supabase/import/import_log.md         ← relatório: corrigidos/ambíguos/inválidos
   │
   │  executar o SQL no Supabase (uma das opções):
   │   a) SQL Editor do dashboard (colar e executar)
   │   b) psql "<connection-string>" -f supabase/import/planilha_import.sql
   ▼
banco populado (câmeras, locais, ocorrências, histórico)
```

**Pré-requisitos:** as migrações de `supabase/migrations/` aplicadas até a
`20260714000003_multitenant` (a importação depende de `import_chave`, das
constraints UNIQUE por tenant e da tabela `tenants`).

**Multi-tenant:** todo registro pertence a um tenant. O script aceita o slug
como 2º argumento (padrão `alesp`):
`node scripts/importar-planilha.mts planilha.xlsx cliente-x` — o tenant precisa
existir antes (função `criar_tenant('cliente-x', 'Nome')`). O SQL gerado
valida isso e aborta se o tenant não existir.

## Estrutura do código

| Arquivo | Papel |
|---|---|
| `scripts/importar-planilha.mts` | CLI: lê o xlsx, chama o parser, escreve SQL + log |
| `src/services/import/tipos.mts` | Tipagens do pipeline |
| `src/services/import/extracao.mts` | Regras declarativas de extração do texto livre (defeito, local, hora, data, impedimento, técnico, substituição) |
| `src/services/import/parser-planilha.mts` | Orquestração: normaliza datas, aplica correções aprovadas, consolida inventário, deriva status |
| `src/services/import/gerar-sql.mts` | Gera upserts SQL idempotentes |

Os arquivos `.mts` rodam direto no Node 26 (type stripping) e ficam fora do
build do Next.js.

## Regras de dados (aprovadas em 14/07/2026)

- **Texto original preservado** integralmente em `ocorrencias.descricao`.
- **D1** — 4 correções de data fundamentadas (`0801/2024`→08/01/2025,
  `15/25/2025`→15/05/2025, e 2 anos digitados errados corrigidos pela regra
  "solução ~1 ano antes da abertura").
- **D3** — resolvidas sem data de solução → `encerrada_em = NULL` (fora do MTTR).
- Sem data de abertura → usa a data de solução; sem ambas → data mínima do
  dataset (registrado no log).
- Hora e data reais da falha extraídas do texto quando presentes
  ("desde 23/12 às 06h47min") e compostas no `aberta_em`.
- Solução no mesmo dia da abertura → `encerrada_em = aberta_em` (MTTR 0).
- OS abertas com impedimento (obra/andaime/Infraestrutura) →
  status `aguardando_terceiros` + campo `impedimento`.
- Substituições ("Substituida pela 199") → cria a câmera nova e liga
  `cameras.substituida_por`; a antiga fica `desativada`.
- Prioridade: todas `media` (coluna Grau estava 100% vazia) — editável depois.
- Prédio único **Complexo ALESP** (decisão D2) — reclassificar pela tela de
  cadastros quando existir.

## Idempotência (reprocessar sem duplicar)

- `ocorrencias.import_chave` = md5 de `câmera|data-bruta|texto` (valores
  **brutos** da planilha — estável mesmo se as regras de extração evoluírem).
- Reimportar a mesma planilha: nada muda (upsert atualiza com os mesmos valores).
- Planilha editada (ex.: OS ganhou data de solução): a linha é **atualizada** —
  se o status mudou, o trigger de auditoria registra o evento na timeline.
- Linha com **texto alterado** gera chave nova → vira OS nova (a antiga
  permanece). Evite editar o texto de linhas antigas; use o sistema.
- Câmeras: upsert por `numero`. Catálogos: upsert por nome (constraints UNIQUE).

## Como importar uma planilha nova no futuro

1. Salve o arquivo (ex.: `planilha_cftv.xlsx`) e rode:
   `node scripts/importar-planilha.mts caminho/para/planilha.xlsx`
2. **Leia `supabase/import/import_log.md`** — seção "Ambiguidades (revisar)".
3. Execute `supabase/import/planilha_import.sql` no SQL Editor (ou psql).
4. Confira os totais com as consultas de validação abaixo.

## Como corrigir erros

- **Classificação errada (defeito/local):** ajuste as regras em
  `src/services/import/extracao.mts`, rode o script de novo e reexecute o SQL —
  os upserts corrigem os registros existentes (exceto local de câmera já
  alterado manualmente no sistema; nesse caso corrija pelo sistema).
- **Data errada:** adicione a correção em `CORRECOES_DATA`
  (`parser-planilha.mts`), regenere e reexecute.
- **Registro que não deveria existir:** exclua pelo sistema (a exclusão não
  volta na reimportação, a menos que a linha ainda esteja na planilha).

## Consultas de validação (SQL Editor)

```sql
select 'cameras' tabela, count(*) from cameras
union all select 'ocorrencias', count(*) from ocorrencias
union all select 'abertas', count(*) from ocorrencias where status not in ('concluida','cancelada')
union all select 'locais', count(*) from locais
union all select 'eventos_timeline', count(*) from ocorrencia_eventos
union all select 'empresas', count(*) from empresas
union all select 'sem_data_solucao', count(*) from ocorrencias where status='concluida' and encerrada_em is null;

-- Esperado após a 1ª importação:
-- cameras 67 · ocorrencias 111 · abertas 7 · locais 33 · eventos_timeline 111
-- empresas 1 · sem_data_solucao 16
```
