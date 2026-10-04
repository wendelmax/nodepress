# SEO Suite

O SEO Suite é o plugin nativo de descoberta e otimização do NodePress. Ele não altera `postContent`; apenas lê os metadados e gera as superfícies SEO da página.

## Campos por conteúdo

Os campos são armazenados em `PostMeta`:

- `_seo_title`
- `_seo_description`
- `_seo_canonical`
- `_seo_robots`
- `_seo_og_image`
- `_seo_twitter_title`
- `_seo_twitter_description`
- `_seo_schema` (JSON-LD adicional validado como objeto)

Quando não há override, o plugin usa título, excerpt, imagem destacada e configurações globais do site.

## Configuração global

Em `Configurações > SEO & Analytics`:

- `seo_sitemap_enabled` controla `/sitemap.xml`.
- `seo_robots_disallow` aceita caminhos locais separados por linha ou vírgula.
- `seo_redirects` aceita regras JSON com `source`, `target` local e `status` 301/302.

Redirects externos, auto-redirects, loops e cadeias maiores que dez saltos são rejeitados.

## Integração com temas

O plugin registra o slot público `theme.breadcrumbs`. Temas podem renderizá-lo através do runtime de slots sem alterar o conteúdo original. O tema default mantém um fallback mínimo quando o plugin está desativado.

O plugin também gera JSON-LD básico para artigos e páginas, com escape de `<` antes de inserir o script na resposta HTML.
