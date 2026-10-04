# APIs

As APIs ficam sob `/api` e são implementadas como Route Handlers do Next.js.

## Principais grupos

| Grupo | Rotas |
| --- | --- |
| Auth | `/api/auth/[...nextauth]`, `/api/auth/config` |
| Conteúdo | `/api/posts`, `/api/categories`, `/api/tags`, `/api/comments` |
| Usuários | `/api/users`, `/api/users/:id` |
| Configuração | `/api/options`, `/api/settings`, `/api/menus`, `/api/themes` |
| Formulários | `/api/forms/submit`, `/api/export/leads` |
| Mídia | `/api/media`, `/api/storage/test-connection` |
| Importação/exportação | `/api/import`, `/api/export` |
| Automação | `/api/cron`, `/api/revalidate` |
| IA | `/api/ai/providers`, `/api/ai/generate` |
| Analytics | `/api/analytics/track`, `/api/analytics/reset` |
| Busca | `/api/search`, `/api/admin/search`, `/api/admin/search/reindex` |

## Regras gerais

- Rotas administrativas exigem sessão válida.
- Operações de outros usuários exigem papel administrativo.
- O endpoint de cron exige `CRON_SECRET` por Bearer token ou query string.
- Valide payloads e trate respostas de erro antes de integrar clientes externos.

## Busca

`GET /api/search?q=termo` retorna somente conteúdo publicado, com `type`,
`status=publish`, `authorId`, `category`, `tag`, `page`, `pageSize`, `sort` e
`highlight` como filtros/opções. A resposta inclui relevância, paginação e
fragmentos destacados; a instalação pode definir `NODEPRESS_TENANT_ID` (ou
`TENANT_ID`) para restringir conteúdo genérico ao tenant configurado.

`GET /api/admin/search` retorna configuração e saúde do adapter. `PATCH` aceita
`adapter`, `enabled`, `pageSize` e `maxPageSize`; exige papel `admin`.
`POST /api/admin/search/reindex` reconstrói o índice local e aceita
`{"tenantId":"..."}` para reindexação administrativa de um tenant.

Para contratos completos, consulte os Route Handlers em `src/app/api` e os tipos em `packages/contracts` quando presentes no repositório.
