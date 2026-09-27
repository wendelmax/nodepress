# Landing Pages e Maintenance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Entregar o plugin nativo `landing-pages` com publicação agendada, preview assinado, maintenance mode e rollback, integrado ao builder/tema existente.

**Architecture:** O plugin registra o content type `landing-page` e usa `ContentService`/`ContentRecord` como armazenamento canônico. Regras de publicação, assinatura de preview e allowlist ficam em módulos puros; as rotas administrativas adaptam autenticação e persistência; a rota pública resolve landing pages antes do fallback de posts e aplica maintenance somente ao tráfego público.

**Tech Stack:** Next.js App Router, TypeScript, Prisma `ContentRecord`, Plugin SDK, Puck, Vitest, HMAC SHA-256.

**Spec:** `docs/superpowers/specs/2026-09-27-landing-pages-maintenance-design.md`

## Global Constraints

- O plugin id é `landing-pages` e suas permissões são `landing-pages.manage`, `landing-pages.preview` e `landing-pages.settings`.
- Rascunhos e páginas futuras nunca são resolvidos por slug sem token válido.
- Maintenance não bloqueia `/login`, `/admin`, `/api`, `/setup-config` nem `/api/auth`.
- O documento é validado pelo renderer Puck do tema ativo; conteúdo inválido usa fallback seguro.
- Não adicionar dependência externa nem acesso arbitrário ao banco pelo plugin.

## Review Focus

- Token adulterado/expirado ou referente a outro registro deve retornar `404`.
- Horário de publicação com timezone inválido ou data futura não deve vazar o conteúdo.
- Allowlist deve aceitar somente IPs exatos normalizados, sem wildcard implícito.
- Maintenance deve preservar autenticação, administração e APIs.
- Desativação do plugin deve remover o content type e não alterar o fallback público.

---

### Task 1: Regras puras de landing page, preview e maintenance

**Files:**
- Create: `src/plugins/landing-pages/domain.ts`
- Test: `src/plugins/landing-pages/__tests__/domain.test.ts`

**Interfaces:**
- Produces `isLandingPagePublished(record, now)`, `createPreviewToken(id, secret, now, ttlSeconds)`, `verifyPreviewToken(token, secret, now)`, `isMaintenanceBypassed(pathname, input)`.

- [ ] Escrever testes para publicação imediata/agendada, token válido/adulterado/expirado e exceções de maintenance.
- [ ] Rodar `npx vitest run src/plugins/landing-pages/__tests__/domain.test.ts` e confirmar falha por módulo ausente.
- [ ] Implementar o módulo puro usando HMAC SHA-256, comparação constante e parsing estrito de data/timezone.
- [ ] Rodar o teste novamente e confirmar todos os casos verdes.
- [ ] Commitar `feat: add landing page publication and preview rules`.

### Task 2: Plugin e serviço de conteúdo com rollback

**Files:**
- Create: `src/plugins/landing-pages/index.ts`
- Create: `src/plugins/landing-pages/service.ts`
- Create: `src/plugins/landing-pages/__tests__/service.test.ts`
- Modify: `src/plugins/registry.ts`

**Interfaces:**
- Consumes domain functions from Task 1.
- Produces `LandingPageService` with `create`, `update`, `publish`, `archive`, `rollback`, `findPublicBySlug`, `findPreviewById` and `landingPageContentType`.

- [ ] Escrever testes com repositório/store em memória para criação, publicação idempotente, rollback e proteção de rascunho.
- [ ] Rodar os testes e observar falha pela ausência do serviço/plugin.
- [ ] Implementar o serviço sobre as interfaces de `ContentRepository` e `PluginStorage`, salvando revisões imutáveis por página.
- [ ] Registrar o content type e menu administrativo no plugin e adicioná-lo ao registry.
- [ ] Rodar os testes específicos e o conjunto de testes de plugins.
- [ ] Commitar `feat: add native landing pages plugin`.

### Task 3: APIs administrativas e preview

**Files:**
- Create: `src/app/api/admin/landing-pages/_shared.ts`
- Create: `src/app/api/admin/landing-pages/route.ts`
- Create: `src/app/api/admin/landing-pages/[id]/route.ts`
- Create: `src/app/api/admin/landing-pages/[id]/publish/route.ts`
- Create: `src/app/api/admin/landing-pages/[id]/preview/route.ts`
- Test: `src/app/api/admin/landing-pages/__tests__/route.test.ts`

**Interfaces:**
- Consumes `LandingPageService` from Task 2 and follows `requireAdmin` behavior.
- Produces JSON endpoints for list/create, update/archive, publish/schedule and preview token generation.

- [ ] Escrever testes de autenticação, criação, publicação, preview e respostas para payload inválido.
- [ ] Rodar a suíte de rotas e confirmar falhas esperadas.
- [ ] Implementar handlers com `landing-pages.manage`/`landing-pages.preview` e sem expor documentos não publicados.
- [ ] Rodar os testes de rota e o conjunto completo.
- [ ] Commitar `feat: expose landing page admin and preview api`.

### Task 4: Renderização pública e maintenance mode

**Files:**
- Create: `src/lib/public-access.ts`
- Create: `src/themes/default/components/LandingPageRenderer.tsx`
- Modify: `src/app/(web)/[...slug]/page.tsx`
- Modify: `src/app/(web)/page.tsx`
- Modify: `src/app/(web)/login/page.tsx` only if shared guard is needed
- Test: `src/lib/__tests__/public-access.test.ts`

**Interfaces:**
- Consumes `LandingPageService.findPublicBySlug`, `findPreviewById`, `isMaintenanceBypassed` and `BlockRenderer`.
- Produces public landing rendering and a reusable `assertPublicAccess(requestLike)` guard.

- [ ] Escrever testes para bloquear/permitir maintenance conforme rota, IP e preview.
- [ ] Rodar os testes e observar falha por módulo ausente.
- [ ] Implementar o guard sem tocar em rotas administrativas/auth/API e renderizar landing page antes do fallback de post/page.
- [ ] Renderizar `data.document` com `BlockRenderer`, usar SEO do documento e retornar `notFound` para preview inválido.
- [ ] Rodar testes, typecheck, lint e build.
- [ ] Commitar `feat: render landing pages and maintenance mode`.

### Task 5: Verificação e pacote para PR

**Files:**
- Modify: `README.md` or `docs/plugins/landing-pages.md` if documentation is needed.

- [ ] Rodar `npm test`.
- [ ] Rodar `npx tsc --noEmit`.
- [ ] Rodar `npm run lint`.
- [ ] Rodar `npx prisma validate`.
- [ ] Rodar `npm run build`.
- [ ] Rodar `git diff --check` e revisar o diff contra `origin/main`.
- [ ] Commitar documentação/ajustes finais, fazer push e abrir PR vinculando #81.
