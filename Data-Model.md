# Arquitetura e modelo de dados

## Camadas

```text
Browser
  -> Next.js App Router / Proxy
      -> páginas públicas e painel administrativo
      -> Route Handlers (/api)
          -> serviços de domínio
              -> Prisma + PostgreSQL
              -> storage local/S3
              -> provedores de autenticação e IA
```

## Estrutura de código

- `src/app`: páginas públicas, painel e APIs.
- `src/components/admin`: componentes do painel.
- `src/lib`: autenticação, autorização, Prisma, i18n e utilitários.
- `src/services`: regras de negócio e acesso aos dados.
- `src/plugins`: registro e extensões.
- `src/themes`: temas públicos.
- `prisma/schema.prisma`: modelo PostgreSQL.

## Entidades principais

- `np_users` e `np_usermeta`: contas e metadados/permissões.
- `np_posts` e `np_postmeta`: posts, páginas, revisões e metadados.
- `np_comments` e `np_commentmeta`: comentários e metadados.
- `np_terms`, `np_term_taxonomy` e relacionamentos: categorias e tags.
- `np_options`: configurações do site.
- `np_form_submissions`: submissões de formulários.
- `np_analytics_events`: visitantes e visualizações.

O schema completo está no arquivo `prisma/schema.prisma`.

## Schema e backups

O instalador pode executar `npx prisma db push --accept-data-loss` na instalação inicial. Em produção, faça backup e revise alterações antes de atualizar o schema.
