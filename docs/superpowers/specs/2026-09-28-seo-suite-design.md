# SEO Suite nativo

## Objetivo

Substituir o plugin SEO legado por uma extensão nativa, reversível e compatível com o SDK de plugins. O plugin deve enriquecer metadata e descoberta sem alterar o conteúdo original dos posts.

## Decisões

- O contrato SEO usa `PostMeta` existente, sem nova tabela para o MVP.
- Campos aceitos: `_seo_title`, `_seo_description`, `_seo_canonical`, `_seo_robots`, `_seo_og_image`, `_seo_twitter_title`, `_seo_twitter_description` e `_seo_schema`.
- `SeoService` concentra normalização, metadata do Next, canonical, robots, schema, breadcrumbs, sitemap e redirects.
- Sitemap e robots continuam sendo os entrypoints App Router, mas usam o domínio do plugin.
- Redirects são armazenados na option `seo_redirects` como JSON validado; somente caminhos locais são aceitos para evitar open redirect.
- Redirect resolution detecta loops e limita cadeias para evitar redirecionamentos infinitos.
- Breadcrumbs são expostos por um slot público `theme.breadcrumbs`; o tema pode renderizá-lo e o plugin não modifica `postContent`.
- O plugin é incluído no registry e fica ativo por padrão apenas quando `active_plugins` ainda não foi configurado, preservando a compatibilidade com instalações existentes.

## Aceite coberto

- Metadata por conteúdo: title, description, canonical, Open Graph, Twitter e robots.
- Sitemap XML via `src/app/sitemap.ts` e robots.txt configurável via `src/app/robots.ts`.
- JSON-LD básico para Article, WebPage, Organization e BreadcrumbList.
- Redirects 301/302 com validação de loop.
- Testes unitários para metadata, canonical, sitemap, redirects e não mutação do conteúdo.
- Migração sem alteração destrutiva dos campos SEO existentes.
