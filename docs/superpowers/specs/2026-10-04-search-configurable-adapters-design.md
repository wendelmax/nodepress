# Busca configurável com adapters — Issue #73

## Objetivo

Adicionar uma API de busca extensível ao NodePress, com adapter local baseado em PostgreSQL/Prisma, conteúdo público seguro, configuração e saúde administrativas, reindexação idempotente e isolamento por tenant para conteúdo que já possui tenant.

## Escopo

- Buscar posts, páginas, conteúdo genérico publicado, taxonomias e tipos de conteúdo.
- Aceitar filtros por tipo, status, autor, categoria e tag; paginação; ordenação; relevância; tolerância a acentos e termos aproximados; destaque seguro dos termos.
- Expor `GET /api/search` para consumidores públicos.
- Expor `GET/PATCH /api/admin/search` para saúde/configuração e `POST /api/admin/search/reindex` para reconstrução do índice.
- Reusar `Option` para configuração e `requireAdmin` para autorização administrativa.
- Não adicionar dependência de Meilisearch/OpenSearch. O contrato deixa esses adapters como extensão futura.

## Arquitetura

`SearchService` valida e normaliza a consulta, aplica configuração e delega a um `SearchAdapter`. O adapter local (`PrismaSearchAdapter`) lê as fontes do PostgreSQL por Prisma e mantém uma projeção idempotente em `np_search_documents`; a busca consulta essa projeção, reindexando sob demanda quando ainda não existe índice.

O contrato não expõe Prisma: adapters futuros implementam `search`, `health` e `reindex` com os mesmos tipos de domínio. A projeção usa uma chave de origem única por entidade, substituição transacional por escopo de tenant e filtros públicos aplicados novamente na leitura para não vazar conteúdo que mudou de estado.

## Segurança e compatibilidade

- A rota pública exige consulta não vazia, limita tamanho de página e nunca aceita filtro `status` que permita draft/trash; resultados públicos são somente publicados.
- Configuração e reindexação exigem sessão com papel `admin` pelo helper administrativo existente.
- Tenant não é aceito como parâmetro livre pela rota pública. O serviço pode receber `tenantId` de um contexto confiável; a rota usa `NODEPRESS_TENANT_ID`/`TENANT_ID` quando a instalação é explicitamente configurada.
- Posts e taxonomias legados continuam globais; `ContentRecord` respeita `tenantId` no índice e na consulta.

## Dados e configuração

Será criado o modelo/migration `SearchDocument` com `sourceKey` único, tipo, tenant, estado de publicação, conteúdo indexável, URL, data, autor e metadados necessários para filtros. Opções permitidas: `search_adapter`, `search_enabled`, `search_page_size` e `search_max_page_size`, com defaults locais seguros.

## Testes

Testes unitários cobrirão normalização, relevância, acentos, destaque, filtros, paginação e reindexação idempotente. Testes de rota cobrirão publicação, rejeição de parâmetros inseguros, permissões admin, configuração, saúde e propagação de tenant. O conjunto existente, TypeScript, Prisma, lint e build serão executados ao final.
