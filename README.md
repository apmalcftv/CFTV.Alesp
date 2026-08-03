# CMal — Central de Monitoramento (Dashboard CFTV ALESP)

Sistema de gestão do circuito de câmeras de segurança (CFTV) da Assembleia
Legislativa do Estado de São Paulo (ALESP). Substitui o controle manual por
planilha, centralizando inventário de câmeras, abertura e acompanhamento de
ordens de serviço (ocorrências), indicadores operacionais em tempo real,
relatórios e visão executiva.

## Objetivo

Dar ao Operador CFTC, às empresas contratadas de manutenção e à gestão da
ALESP um painel único para:

- acompanhar a situação de cada câmera do circuito (operante, degradada,
  inoperante, em manutenção etc.);
- abrir, atribuir e acompanhar ordens de serviço até a conclusão, com SLA e
  histórico auditável;
- visualizar KPIs, gráficos e alertas de disponibilidade do parque;
- gerar relatórios (Excel/PDF) e uma visão executiva por período.

## Tecnologias

- [Next.js 16](https://nextjs.org/) (App Router) + [React 19](https://react.dev/) + TypeScript
- [Tailwind CSS 4](https://tailwindcss.com/) + [shadcn/ui](https://ui.shadcn.com/) (Radix UI)
- [Supabase](https://supabase.com/) — Postgres, Auth, Storage (Postgres RLS multi-tenant)
- [TanStack React Query](https://tanstack.com/query) para cache/estado de servidor
- [Recharts](https://recharts.org/) para os gráficos
- [React Hook Form](https://react-hook-form.com/) + [Zod](https://zod.dev/) para formulários
- [Lucide](https://lucide.dev/) para ícones

## Como executar localmente

Pré-requisitos: Node.js 20+ e uma conta/projeto no [Supabase](https://supabase.com/).

```bash
npm install
npm run dev        # http://localhost:3000
```

Outros scripts disponíveis: `npm run build` (build de produção),
`npm run start` (roda o build) e `npm run lint` (ESLint).

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha com as chaves do seu
projeto Supabase (**Dashboard Supabase → Settings → API Keys**):

```bash
cp .env.example .env.local
```

```
NEXT_PUBLIC_SUPABASE_URL=https://<seu-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<sua-publishable-key>
```

Essas são chaves **públicas** (seguras para uso no navegador) — o acesso aos
dados é controlado por Row Level Security (RLS) no Postgres, não pelas
chaves. Nunca commite `.env.local` nem uma `service_role key` no repositório.

## Estrutura de pastas

```
src/
  app/
    (auth)/        # login, cadastro (páginas públicas)
    (app)/         # área autenticada: dashboard, câmeras, ocorrências,
                    # executivo, relatórios, notificações, cadastros
    pendente/       # tela para contas aguardando aprovação
  components/
    ui/             # primitivas shadcn/ui (button, card, table, dialog...)
    dashboard/       # KPIs, badges, gráficos-wrapper, tabelas do dashboard
    charts/         # wrappers Recharts (barras, linha, área, pizza)
    cadastros/       # componentes reutilizáveis de telas de cadastro (CRUD)
    cameras/         # componentes específicos de Câmeras (import, seleção em massa)
    layout/          # AppShell, sidebar, topbar, theme toggle
  hooks/            # hooks React Query por domínio (câmeras, ocorrências...)
  services/          # chamadas ao Supabase (uma função por operação)
  types/domain.ts     # tipos e enums de domínio (status, papéis, etc.)
  lib/               # utilitários (Supabase client/server, navegação, branding)
supabase/
  migrations/        # schema do banco, versionado e incremental
  tests/             # scripts SQL de validação (RLS, isolamento multi-tenant)
scripts/            # scripts de importação (Node/tsx), fora do build do app
docs/               # documentação complementar (ex.: processo de importação)
```

## Banco de dados (Supabase)

O schema completo vive em `supabase/migrations/`, aplicado incrementalmente.
Para aplicar num projeto Supabase novo:

**Opção A — CLI (recomendado, mantém histórico de migrações):**

```bash
npx supabase login
npx supabase link --project-ref <seu-project-ref>
npx supabase db push
```

**Opção B — SQL Editor:** execute, na ordem, os arquivos de
`supabase/migrations/` no SQL Editor do dashboard do Supabase.

### Primeiro acesso (multi-tenant)

O cadastro exige **aprovação de um administrador** — contas novas nascem com
status `pendente` até serem aprovadas em Cadastros → Usuários por um
`administrador`.

## Papéis de acesso

| Papel | Permissões |
|---|---|
| `administrador` | tudo, inclusive gerenciar usuários, papéis e configurações |
| `operador_cftc` | câmeras, ocorrências e cadastros — sem gerenciar usuários |
| `fiscal_alesp` | leitura (câmeras, ocorrências, notificações) |
| `gestor` | leitura completa (sem edição) |
| `empresa_contratada` | atualiza só as ocorrências atribuídas à própria empresa |

## Deploy

O app é compatível com deploy na [Vercel](https://vercel.com/) (importar o
repositório e configurar as variáveis de ambiente do Supabase no painel do
projeto). Não há pipeline de CI/CD configurado neste repositório — o deploy
hoje é manual.

## Licença

Software proprietário, de uso restrito — desenvolvido para a Assembleia
Legislativa do Estado de São Paulo (ALESP). Todos os direitos reservados.
Não há licença de código aberto associada a este repositório.
