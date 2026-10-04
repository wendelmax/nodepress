# Audit Log e Baseline de Segurança Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar o audit log administrativo da issue #72 com persistência segura, consultas protegidas, retenção e instrumentação dos fluxos administrativos prioritários.

**Architecture:** Um contrato independente do Prisma será exposto por `AuditLogService`, que sanitiza e normaliza eventos antes de persistir em `np_audit_logs`. As mutações e eventos de autenticação chamarão o serviço de forma não bloqueante; uma API somente leitura para administradores fornecerá filtros, paginação e exportação.

**Tech Stack:** Next.js App Router, TypeScript, Prisma 7/PostgreSQL, NextAuth/Auth.js, Vitest e a suíte Node existente.

**Spec:** `docs/superpowers/specs/2026-10-03-audit-log-security-design.md`

## Global Constraints

- O registro é append-only e não pode derrubar a operação principal quando o armazenamento falhar.
- Nenhum `password`, token, cookie, segredo, chave privada ou credencial pode ser persistido em metadata.
- O ator deve ser derivado da sessão; nunca de um `actorUserId` enviado pelo cliente.
- Somente administradores podem consultar ou exportar eventos.
- Paginação e filtros devem ter limites explícitos.
- O IP persistido deve ser resumido; IPv4 termina em `.0` e IPv6 é reduzido aos primeiros grupos com `::`.
- A limpeza de retenção é a única exclusão permitida e deve ocorrer em lotes.
- Eventos públicos e leituras públicas ficam fora do MVP.

## Review Focus

- Metadata aninhada com chaves sensíveis em diferentes capitalizações — a sanitização deve ser recursiva e case-insensitive.
- Payloads muito grandes ou arrays extensos — a auditoria deve limitar tamanho sem falhar a requisição.
- Requests sem `x-request-id` e com cabeçalhos de proxy múltiplos — deve haver correlação gerada e IP normalizado de forma previsível.
- Tentativa de consultar/exportar como usuário autenticado não administrador — deve retornar `403` sem executar consulta.
- Falha de conexão ou erro do Prisma ao registrar — a operação de negócio deve continuar e o erro deve ser apenas reportado ao logger.

---

### Task 1: Contrato, sanitização e normalização de contexto

**Files:**
- Create: `src/audit/types.ts`
- Create: `src/audit/sanitize.ts`
- Create: `src/audit/context.ts`
- Test: `src/audit/__tests__/sanitize.test.ts`
- Test: `src/audit/__tests__/context.test.ts`

**Interfaces:**
- Produces `AuditEvent`, `AuditQuery`, `AuditRequestContext`, `sanitizeAuditMetadata(value)`, `summarizeIp(value)` e `resolveAuditRequestContext(request)` para as tarefas seguintes.

- [ ] **Step 1: Write the failing tests**

  Testar sanitização recursiva case-insensitive de `password`, `secret`, `token`, `authorization`, `cookie`, `apiKey`, `accessKey`, `privateKey` e `userPass`; truncamento de strings/payloads; preservação de valores comuns; normalização de IPv4, IPv6, IP ausente e primeiro valor de `x-forwarded-for`; geração de `correlationId` quando `x-request-id` não existir.

- [ ] **Step 2: Run the focused tests to verify they fail**

  Run: `npx vitest run src/audit/__tests__/sanitize.test.ts src/audit/__tests__/context.test.ts`
  Expected: FAIL because the audit contract and helpers do not exist.

- [ ] **Step 3: Implement the minimal contract and helpers**

  Criar tipos sem dependência do Prisma. A sanitização deve retornar uma cópia serializável, substituir valores sensíveis por `[REDACTED]` e aplicar um limite documentado para strings e coleções. O contexto deve limitar tamanho do request ID, resumir IP e evitar confiar em valores inválidos.

- [ ] **Step 4: Run the focused tests to verify they pass**

  Run: `npx vitest run src/audit/__tests__/sanitize.test.ts src/audit/__tests__/context.test.ts`
  Expected: PASS.

- [ ] **Step 5: Commit**

  `git add src/audit && git commit -m "feat: add audit event safety primitives"`

### Task 2: Persistência, consulta, exportação e retenção

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20261003000000_add_audit_logs/migration.sql`
- Create: `src/audit/service.ts`
- Create: `src/audit/export.ts`
- Test: `src/audit/__tests__/service.test.ts`
- Test: `src/audit/__tests__/export.test.ts`

**Interfaces:**
- Consumes `AuditEvent`, `AuditQuery` and sanitizers from Task 1.
- Produces `AuditLogService.record(event): Promise<void>`, `list(query): Promise<{items,total,page,pageSize}>`, `export(query, format): Promise<{body,contentType,filename}>` and `pruneOlderThan(date, batchSize): Promise<number>`.

- [ ] **Step 1: Write the failing tests**

  Cobrir criação com defaults, passagem dos campos sanitizados ao Prisma, absorção de falha de persistência, filtros/paginação limitados, ordenação por `occurredAt`/`id`, CSV com escaping e retenção em lotes.

- [ ] **Step 2: Run the focused tests to verify they fail**

  Run: `npx vitest run src/audit/__tests__/service.test.ts src/audit/__tests__/export.test.ts`
  Expected: FAIL because the service, model and serializers are missing.

- [ ] **Step 3: Add the Prisma model and migration**

  Adicionar `AuditLog` mapeado a `np_audit_logs`, com os campos e índices definidos na especificação. A migration deve ser reversível apenas no sentido de rollback técnico; nenhuma rota da aplicação poderá apagar eventos.

- [ ] **Step 4: Implement the service and export serializer**

  O serviço receberá uma dependência de persistência compatível com o client Prisma para ser testável. `record` sanitiza, captura erros e loga sem rejeitar. `list` aplica `pageSize` máximo, filtros validados e ordenação estável. O CSV deve incluir cabeçalho e escapar vírgulas, aspas e quebras de linha.

- [ ] **Step 5: Run the focused tests to verify they pass**

  Run: `npx vitest run src/audit/__tests__/service.test.ts src/audit/__tests__/export.test.ts`
  Expected: PASS.

- [ ] **Step 6: Commit**

  `git add prisma src/audit && git commit -m "feat: persist and query audit logs"`

### Task 3: Integração com autenticação e mutações administrativas

**Files:**
- Modify: `src/auth.ts`
- Modify: `src/app/api/posts/route.ts`
- Modify: `src/app/api/posts/[id]/route.ts`
- Modify: `src/app/api/users/route.ts`
- Modify: `src/app/api/users/[id]/route.ts`
- Modify: `src/app/api/settings/route.ts`
- Modify: `src/app/api/options/route.ts`
- Modify: `src/app/api/admin/plugins/[pluginId]/activate/route.ts`
- Modify: `src/app/api/admin/plugins/[pluginId]/deactivate/route.ts`
- Modify: `src/app/api/admin/theme-templates/[templateId]/activate/route.ts`
- Modify: `src/services/option.service.ts`
- Modify: `src/services/plugin.service.ts`
- Modify: `src/services/theme-template.service.ts`
- Test: `src/audit/__tests__/integration.test.ts`

**Interfaces:**
- Consumes `AuditLogService.record` and `resolveAuditRequestContext` from Tasks 1–2.
- Produces eventos `auth.login.succeeded`, `auth.login.failed`, `auth.logout`, `post.*`, `user.*`, `settings.updated`, `plugin.activated`, `plugin.deactivated`, `plugin.uninstalled` e `theme.activated`.

- [ ] **Step 1: Write the failing integration tests**

  Exercitar os handlers/métodos com dependências isoladas e verificar ação, recurso, ID, ator, sucesso e nomes de chaves alteradas. Verificar também que uma falha do audit log não altera a resposta de sucesso nem transforma um erro de negócio em outro erro.

- [ ] **Step 2: Run the focused tests to verify they fail**

  Run: `npx vitest run src/audit/__tests__/integration.test.ts`
  Expected: FAIL because the flows ainda não emitem eventos.

- [ ] **Step 3: Implement event emission at operation boundaries**

  Usar o ator da sessão e o contexto da requisição. Registrar sucesso depois da mutação; registrar falha nos caminhos de autenticação, validação e autorização quando houver contexto seguro. Para plugins/temas, manter a semântica do serviço e registrar somente após a transição confirmada.

- [ ] **Step 4: Run the focused tests to verify they pass**

  Run: `npx vitest run src/audit/__tests__/integration.test.ts`
  Expected: PASS.

- [ ] **Step 5: Commit**

  `git add src/auth.ts src/app/api src/services src/audit/__tests__/integration.test.ts && git commit -m "feat: audit administrative mutations"`

### Task 4: API administrativa de consulta e exportação

**Files:**
- Create: `src/app/api/admin/audit-logs/route.ts`
- Create: `src/app/api/admin/audit-logs/__tests__/route.test.ts`

**Interfaces:**
- Consumes `requireAdmin` e `AuditLogService.list/export`.
- Produces `GET /api/admin/audit-logs` com os filtros da especificação e `format=json|csv`.

- [ ] **Step 1: Write the failing route tests**

  Testar `403` para não administrador, `200` com paginação/filtros para administrador, rejeição de datas inválidas/tamanho inválido e headers corretos para JSON/CSV.

- [ ] **Step 2: Run the focused route tests to verify they fail**

  Run: `npx vitest run src/app/api/admin/audit-logs/__tests__/route.test.ts`
  Expected: FAIL because the route does not exist.

- [ ] **Step 3: Implement the protected route**

  Reutilizar `requireAdmin`; converter query params para `AuditQuery`; retornar mensagens de erro sem vazar SQL/stack trace. O ator nunca será aceito como campo de body para consulta; filtros de ator serão somente parâmetros de busca validados.

- [ ] **Step 4: Run the focused route tests to verify they pass**

  Run: `npx vitest run src/app/api/admin/audit-logs/__tests__/route.test.ts`
  Expected: PASS.

- [ ] **Step 5: Commit**

  `git add src/app/api/admin/audit-logs && git commit -m "feat: expose protected audit log API"`

### Task 5: Documentação operacional e validação da entrega

**Files:**
- Modify: `README.md`
- Modify: `env.example`

**Interfaces:**
- Documenta o modelo de retenção, a rota de consulta/exportação, os nomes de ações e a política de redaction.

- [ ] **Step 1: Add operational documentation**

  Documentar os filtros, exportação, política padrão de retenção e a opção de logger/configuração necessária, sem incluir valores secretos reais.

- [ ] **Step 2: Run the full verification**

  Run: `npm test`; `npm run lint`; `npm run build`.
  Expected: all commands exit with code `0` and no test failures, lint errors or build errors.

- [ ] **Step 3: Commit**

  `git add README.md env.example && git commit -m "docs: document audit log operations"`

### Task 6: Review final e abertura do PR

**Files:**
- Review only: branch diff, migrations, tests and API contract.

- [ ] **Step 1: Check the complete diff and test evidence**

  Run: `git diff origin/main...HEAD --check`; `git diff --stat origin/main...HEAD`; `npm test`; `npm run lint`; `npm run build`.

- [ ] **Step 2: Confirm requirements against the spec**

  Confirmar append-only, redaction, IP resumido, correlação, eventos prioritários, autorização admin, filtros, JSON/CSV e retenção em lote.

- [ ] **Step 3: Push the branch and open the PR**

  `git push -u origin codex/audit-security-baseline`

  Abrir PR referenciando `Closes #72`, anexar os comandos e resultados de validação e não mesclar sem CI verde.
