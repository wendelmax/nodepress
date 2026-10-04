# Backup, Restore e Migração Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar o MVP seguro de backup, restore e migração da issue #75 no
NodePress, sem expor segredos e sem sobrescrever dados existentes.

**Architecture:** Criar um domínio `src/backup` com envelope JSON determinístico,
manifesto/checksums/compatibilidade, adapters de dados e serviço transacional.
As rotas existentes `/api/export`, `/api/import` e `/api/cron` permanecem como
fachadas; storage e auditoria são injetados para preservar a arquitetura atual.

**Tech Stack:** TypeScript, Next.js route handlers, Prisma, Node `crypto`/`fs`,
AWS SDK S3 já instalado, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-04-backup-restore-migration-design.md`

## Global Constraints

- Formato do pacote: `nodepress-backup`, `formatVersion: 1`.
- Checksums: SHA-256 sobre JSON canônico e conteúdo de cada artefato.
- Restore é dry-run/validação primeiro e insert-only; nunca sobrescreve
  registros existentes.
- Secrets, hashes de senha, tokens, chaves e credenciais não entram no pacote.
- Tema/plugin são metadados; código não é exportado nem instalado.
- Storage local fica fora de `public/`; S3-compatible usa objetos privados.
- Nenhuma dependência nova e nenhum scheduler/fila durável novo.

## Review Focus

- Pacote adulterado: checksum declarado divergente precisa abortar antes de
  qualquer consulta/mutação — Task 1.
- Manifesto incompatível ou desconhecido: deve retornar erro estável e não
  assumir compatibilidade — Task 1.
- Segredos em opções, usuários ou extensões: devem ser removidos e testados —
  Task 2.
- Falha depois de enviar mídia: objetos criados nesta operação precisam ser
  apagados e o banco não pode persistir — Task 4.
- Chamada de import sem confirmação: deve permanecer sem mutação mesmo quando o
  dry-run é válido — Task 4.

---

### Task 1: Contrato do pacote, manifesto e integridade

**Files:**
- Create: `src/backup/types.ts`
- Create: `src/backup/canonical-json.ts`
- Create: `src/backup/integrity.ts`
- Create: `src/backup/compatibility.ts`
- Test: `src/backup/__tests__/package.test.ts`

**Interfaces:**
- Produces `NodePressBackupPackage`, `BackupManifest`, `BackupSection`,
  `canonicalize(value)`, `sha256(value)`, `createManifest(input)` e
  `validatePackageIntegrity(pkg, currentVersion)`.

- [ ] **Step 1: Escrever testes vermelhos** para manifesto v1, checksum
  determinístico, alteração de payload e manifesto incompatível.
- [ ] **Step 2: Rodar** `npx vitest run src/backup/__tests__/package.test.ts` e
  confirmar falhas por módulos/contratos ausentes.
- [ ] **Step 3: Implementar** tipos, canonicalização e validação de integridade
  com mensagens/códigos determinísticos.
- [ ] **Step 4: Rodar o teste focado** e confirmar PASS.

### Task 2: Sanitização e storage de mídia

**Files:**
- Create: `src/backup/sanitize.ts`
- Create: `src/backup/storage.ts`
- Modify: `src/storage/StorageDriver.ts`
- Modify: `src/storage/LocalDriver.ts`
- Modify: `src/storage/S3Driver.ts`
- Test: `src/backup/__tests__/sanitize.test.ts`
- Test: `src/backup/__tests__/storage.test.ts`

**Interfaces:**
- Produces `sanitizeBackupData`, `BackupStorage`, `createLocalBackupStorage`
  e `createDriverBackupStorage`.
- `StorageDriver` gains `read(fileUrl): Promise<Buffer>`; existing upload/delete
  behavior remains compatível.

- [ ] **Step 1: Escrever testes vermelhos** para remoção de credenciais e
  leitura/escrita local com rejeição de path traversal.
- [ ] **Step 2: Rodar os testes focados** e confirmar falhas esperadas.
- [ ] **Step 3: Implementar** sanitização recursiva específica para backup e
  leitura dos drivers local/S3 sem ACL pública.
- [ ] **Step 4: Rodar os testes focados** e confirmar PASS.

### Task 3: Exportação e planejamento de importação

**Files:**
- Create: `src/backup/data.ts`
- Create: `src/backup/exporter.ts`
- Create: `src/backup/importer.ts`
- Test: `src/backup/__tests__/export-import.test.ts`

**Interfaces:**
- Produces `BackupDataSource`, `BackupDataWriter`, `BackupService.export()` e
  `BackupService.planImport()`.
- Export supports `scope?: { sections?: BackupSection[]; includeMedia?: boolean }`;
  import supports `dryRun`, `confirm`, URL replacement and `AbortSignal`.

- [ ] **Step 1: Escrever testes vermelhos** para round-trip, escopo parcial,
  URLs normalizadas, dry-run sem writer e conflitos insert-only.
- [ ] **Step 2: Rodar o teste focado** e confirmar falhas por implementação
  ausente.
- [ ] **Step 3: Implementar** adapters Prisma para as seções suportadas,
  exportação em lotes e plano de importação sem mutação.
- [ ] **Step 4: Rodar o teste focado** e confirmar PASS.

### Task 4: Restore transacional, rollback e auditoria/progresso

**Files:**
- Modify: `src/backup/importer.ts`
- Create: `src/backup/service.ts`
- Test: `src/backup/__tests__/restore-failure.test.ts`

**Interfaces:**
- Produces `BackupOperationProgress`, `BackupOperationAudit` e métodos
  `restore(pkg, options)`/`dryRun(pkg, options)`.
- Usa uma transação Prisma e lista de objetos criados para cleanup no catch.

- [ ] **Step 1: Escrever testes vermelhos** para confirmação obrigatória,
  falha Prisma com rollback, falha de storage com cleanup e abort.
- [ ] **Step 2: Rodar o teste focado** e confirmar falhas esperadas.
- [ ] **Step 3: Implementar** sequência validate → media → transaction → audit,
  com cleanup reversível e eventos de progresso sanitizados.
- [ ] **Step 4: Rodar os testes focados** e confirmar PASS.

### Task 5: Rotas, cron e tela administrativa

**Files:**
- Modify: `src/app/api/export/route.ts`
- Modify: `src/app/api/import/route.ts`
- Modify: `src/app/api/cron/route.ts`
- Modify: `src/app/(web)/admin/(dashboard)/tools/import-export/page.tsx`
- Test: `src/app/api/__tests__/backup-routes.test.ts`

- [ ] **Step 1: Escrever testes vermelhos** para autenticação, dry-run,
  confirmação e download do manifesto.
- [ ] **Step 2: Rodar o teste focado** e confirmar falhas esperadas.
- [ ] **Step 3: Implementar** fachadas usando `requireAdmin`/`auth`, respostas
  estáveis e fluxo visual dry-run → confirmação.
- [ ] **Step 4: Rodar testes focados** e confirmar PASS.

### Task 6: Documentação e verificação final

**Files:**
- Modify: `docs/operations.md`
- Modify: `docs/infrastructure.md`
- Modify: `README.md`

- [ ] **Step 1: Documentar** formato, limitações, restore, cron, storage e
  exclusão de segredos.
- [ ] **Step 2: Rodar** `npm test`, `npm run lint` e `npx tsc --noEmit`.
- [ ] **Step 3: Inspecionar** `git diff --check` e `git status --short`,
  confirmando que somente a issue #75 foi alterada.
