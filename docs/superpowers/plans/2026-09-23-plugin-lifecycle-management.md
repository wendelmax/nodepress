# Plugin Lifecycle Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Completar o lifecycle dos plugins tipados com callbacks de ativação, desativação e uninstall, preservando migrations isoladas e compatibilidade com plugins legados.

**Architecture:** O `PluginService` será o coordenador das transições de estado e continuará usando `NodePressPluginRuntime` para registrar/remover contribuições. O `PluginMigrationRunner` ganhará apenas a operação explícita de esquecer o ledger durante uninstall; migrations continuam transacionais e não haverá DDL automático do core. Um endpoint administrativo exporá uninstall sem adicionar uma nova tela.

**Tech Stack:** TypeScript, Next.js App Router, Prisma 7, Vitest, `HookService`/`NodePressPluginRuntime` existentes.

**Spec:** `docs/superpowers/specs/2026-09-23-plugin-lifecycle-management-design.md`

## Global Constraints

- Callbacks de lifecycle não recebem entrada de requisição nem dados de usuário.
- Migrations usam `Prisma.TransactionClient`, transações e checksums existentes.
- Desativar nunca remove tabelas ou dados.
- Uninstall só aceita plugins inativos e o core não executa `down` nem apaga tabelas.
- Plugins legados continuam no caminho de compatibilidade sem lifecycle tipado.
- Não adicionar modelos específicos de plugins ao `prisma/schema.prisma`.

## Review Focus

- Falha de `onActivate` não pode persistir o plugin ativo nem deixar runtime registrado; cobrir em `PluginService`.
- Falha de persistência depois de `onActivate` deve tentar compensação sem substituir o erro original; cobrir em `PluginService`.
- Falha de `onDeactivate` deve manter plugin ativo e runtime disponível; cobrir em `PluginService`.
- Uninstall de plugin ativo deve ser recusado sem executar callback ou alterar ledger; cobrir em `PluginService` e endpoint.
- Forget do ledger deve afetar somente o plugin solicitado e não quebrar plugins legados; cobrir em `PluginMigrationRunner` e regressão de runtime.

---

### Task 1: Contrato e transições de ativação/desativação

**Files:**
- Modify: `src/plugins/types.ts` — adicionar `PluginLifecycleHook` e os três callbacks opcionais ao `NodePressPlugin`.
- Modify: `src/services/plugin.service.ts` — ordenar callbacks, runtime, persistência e compensações.
- Test: `src/services/__tests__/plugin.service.test.ts` — cobrir ordem e falhas de activation/deactivation.

**Interfaces:**
- Produces `PluginLifecycleHook = () => void | Promise<void>`.
- `PluginService.activate(pluginId)` continua retornando `PluginStatus`.
- `PluginService.deactivate(pluginId)` continua retornando `PluginStatus`.

- [ ] **Step 0: Criar a branch de implementação**

Partindo da branch que contém a especificação e este plano, criar a branch que será publicada:

```bash
git switch -c feat/plugin-lifecycle-management
```

- [ ] **Step 1: Escrever testes vermelhos para a ordem do lifecycle**

Adicionar plugins de teste com callbacks que registram eventos e verificar a ordem:

```ts
const calls: string[] = []
const testPlugin = makePlugin('animals', {
  onActivate: async () => { calls.push('activate') },
  onDeactivate: async () => { calls.push('deactivate') },
})

await service.activate('animals')
expect(calls).toEqual(['runtime', 'activate'])
expect(store.ids).toEqual(['animals'])

await service.deactivate('animals')
expect(calls).toEqual(['runtime', 'activate', 'deactivate', 'runtime-cleanup'])
expect(store.ids).toEqual([])
```

O fake runtime deve registrar `activate` antes de devolver o cleanup e registrar `runtime-cleanup` quando o cleanup for executado.

- [ ] **Step 2: Escrever testes vermelhos para falhas de lifecycle**

Adicionar estes casos ao mesmo arquivo:

```ts
it('does not persist or leave runtime when onActivate fails', async () => {
  const plugin = makePlugin('animals', { onActivate: async () => { throw new Error('activate failed') } })
  await expect(makeService(plugin).activate('animals')).rejects.toThrow('activate failed')
  expect(runtime.calls).toEqual(['animals'])
  expect(runtime.cleanupCalls).toEqual(['animals'])
  expect(store.ids).toEqual([])
})

it('keeps the plugin active when onDeactivate fails', async () => {
  const plugin = makePlugin('animals', { onDeactivate: async () => { throw new Error('deactivate failed') } })
  store.ids = ['animals']
  await expect(makeService(plugin).deactivate('animals')).rejects.toThrow('deactivate failed')
  expect(store.ids).toEqual(['animals'])
  expect(runtime.cleanupCalls).toEqual([])
})
```

Também cobrir persistência falhando depois de `onActivate`: o cleanup do runtime é executado, `onDeactivate` é tentado como compensação e o erro de persistência é o erro propagado.

O caso deve usar um `FakeStore` configurado para lançar em `setActivePluginIds` e afirmar:

```ts
it('compensates onActivate when persisting activation fails', async () => {
  const calls: string[] = []
  const plugin = makePlugin('animals', {
    onActivate: async () => { calls.push('activate') },
    onDeactivate: async () => { calls.push('compensate') },
  })
  const store = new FakeStore({ failWrites: true })
  const service = makeService(plugin, { store })

  await expect(service.activate('animals')).rejects.toThrow('persist failed')
  expect(calls).toEqual(['activate', 'compensate'])
  expect(runtime.cleanupCalls).toEqual(['animals'])
})
```

- [ ] **Step 3: Rodar somente os testes do serviço para confirmar RED**

Run: `npx vitest run src/services/__tests__/plugin.service.test.ts`

Expected: FAIL porque `NodePressPlugin` ainda não possui callbacks e `PluginService` ainda não executa a nova ordem.

- [ ] **Step 4: Implementar o contrato mínimo**

Em `src/plugins/types.ts`, adicionar:

```ts
export type PluginLifecycleHook = () => void | Promise<void>

export interface NodePressPlugin {
  // campos existentes...
  onActivate?: PluginLifecycleHook
  onDeactivate?: PluginLifecycleHook
  onUninstall?: PluginLifecycleHook
}
```

Plugins sem esses campos devem continuar válidos.

- [ ] **Step 5: Implementar ativação com compensação**

Em `PluginService.activate`, manter a validação de dependências e migrations; depois de `runtime.activate`, executar `plugin.onActivate?.()` e só então persistir `active_plugins`. Guardar o cleanup e um booleano indicando que `onActivate` terminou. No `catch`, executar o cleanup; se o callback terminou, tentar `onDeactivate` em bloco separado, registrar eventual erro de compensação com `console.error` e relançar o erro original.

- [ ] **Step 6: Implementar desativação segura**

Em `PluginService.deactivate`, executar `onDeactivate` antes de remover runtime e estado persistido. Se o callback lançar, não chamar runtime cleanup nem `setActivePluginIds`. Manter a serialização existente por plugin.

- [ ] **Step 7: Rodar os testes do serviço para GREEN**

Run: `npx vitest run src/services/__tests__/plugin.service.test.ts`

Expected: todos os testes existentes e novos passam.

- [ ] **Step 8: Commitar a unidade de lifecycle**

```bash
git add src/plugins/types.ts src/services/plugin.service.ts src/services/__tests__/plugin.service.test.ts
git commit -m "feat: add plugin activation lifecycle hooks"
```

### Task 2: Forget de migrations e operação de uninstall

**Files:**
- Modify: `src/plugins/migration-runner.ts` — adicionar `forget(pluginId)` e `deleteMany` ao port do banco.
- Modify: `src/services/plugin.service.ts` — adicionar `uninstall(pluginId)` protegido por lock e estado inativo.
- Modify: `src/services/__tests__/plugin.service.test.ts` — testar uninstall e callbacks.
- Modify: `src/plugins/__tests__/migration-runner.test.ts` — testar remoção isolada do ledger.

**Interfaces:**
- `PluginMigrationRunner.forget(pluginId: string): Promise<void>` remove somente linhas `pluginId` do ledger.
- `PluginService.uninstall(pluginId: string): Promise<PluginStatus>` exige plugin conhecido e inativo.
- `PluginServiceOptions.runner` passa a exigir `Pick<PluginMigrationRunner, 'runPending' | 'forget'>`.

- [ ] **Step 1: Escrever teste vermelho para forget isolado**

Estender `FakeMigrationDatabase` com `deleteMany` e adicionar rows de dois plugins. Verificar que `runner.forget('animals')` remove apenas rows de `animals`.

- [ ] **Step 2: Rodar o teste do migration runner para confirmar RED**

Run: `npx vitest run src/plugins/__tests__/migration-runner.test.ts`

Expected: FAIL porque `PluginMigrationRunner.forget` e `deleteMany` ainda não existem.

- [ ] **Step 3: Implementar forget mínimo**

Adicionar ao contrato:

```ts
pluginMigration: {
  findMany(...): Promise<AppliedPluginMigration[]>
  deleteMany(args: { where: { pluginId: string } }): Promise<unknown>
}
```

Implementar `forget` usando `database.pluginMigration.deleteMany({ where: { pluginId } })`. Não executar `down` e não tocar em tabelas do plugin.

- [ ] **Step 4: Escrever testes vermelhos para uninstall**

Adicionar casos em `plugin.service.test.ts`:

```ts
it('runs onUninstall and forgets migrations for an inactive plugin', async () => {
  const calls: string[] = []
  const plugin = makePlugin('animals', { onUninstall: async () => { calls.push('uninstall') } })
  const runner = new FakeRunner({ onForget: (id) => calls.push(`forget:${id}`) })

  const result = await new PluginService({ plugins: [plugin], store, runner, runtime }).uninstall('animals')

  expect(result.active).toBe(false)
  expect(calls).toEqual(['uninstall', 'forget:animals'])
})

it('rejects uninstall for an active plugin', async () => {
  store.ids = ['animals']
  await expect(service.uninstall('animals')).rejects.toThrow(/active/i)
  expect(plugin.onUninstall).not.toHaveBeenCalled()
})
```

O fake runner deverá registrar `forget` para permitir verificar a ordem sem banco real.

- [ ] **Step 5: Rodar os testes de serviço para confirmar RED**

Run: `npx vitest run src/services/__tests__/plugin.service.test.ts`

Expected: FAIL porque `PluginService.uninstall` ainda não existe.

- [ ] **Step 6: Implementar uninstall**

Adicionar `uninstall` usando `withPluginLock`: resolver plugin, ler IDs ativos, rejeitar se o ID estiver ativo, executar `plugin.onUninstall?.()`, chamar `runner.forget(pluginId)` e retornar status inativo. Se o callback falhar, não chamar `forget`; se `forget` falhar, propagar o erro sem mascará-lo. Atualizar `FakeRunner` para aceitar `onForget?: (pluginId: string) => void` e implementar o método `forget` no fake e no runner real.

- [ ] **Step 7: Rodar testes do runner e serviço para GREEN**

Run: `npx vitest run src/plugins/__tests__/migration-runner.test.ts src/services/__tests__/plugin.service.test.ts`

Expected: todos os testes passam, incluindo isolamento do ledger e guard de plugin ativo.

- [ ] **Step 8: Commitar migrations e uninstall**

```bash
git add src/plugins/migration-runner.ts src/plugins/__tests__/migration-runner.test.ts src/services/plugin.service.ts src/services/__tests__/plugin.service.test.ts
git commit -m "feat: add plugin uninstall lifecycle"
```

### Task 3: Endpoint administrativo e documentação

**Files:**
- Create: `src/app/api/admin/plugins/[pluginId]/uninstall/route.ts` — endpoint admin seguindo os endpoints activate/deactivate.
- Modify: `docs/plugins.md` — documentar callbacks, ordem e uninstall.

**Interfaces:**
- POST `/api/admin/plugins/<id>/uninstall` retorna `PluginStatus` em sucesso.
- Respostas de erro usam `errorResponse(error, 'Plugin uninstall failed', { pluginId })`.

- [ ] **Step 1: Criar o endpoint**

Usar o mesmo padrão de autenticação:

```ts
import { requireAdmin } from '../../_shared'
import { errorResponse } from '@/core/errors'

export async function POST(_request: Request, { params }: { params: Promise<{ pluginId: string }> }) {
  const result = await requireAdmin()
  if ('response' in result) return result.response
  const { pluginId } = await params
  try {
    return Response.json(await result.service.uninstall(pluginId))
  } catch (error) {
    return errorResponse(error, 'Plugin uninstall failed', { pluginId })
  }
}
```

- [ ] **Step 2: Documentar o contrato**

Em `docs/plugins.md`, adicionar exemplo de manifesto com `onActivate`, `onDeactivate`, `onUninstall`, explicar que migrations rodam antes de ativação, que desativação preserva dados e que uninstall exige plugin inativo e delega remoção de dados ao próprio plugin.

- [ ] **Step 3: Validar endpoint por typecheck/lint**

Run: `npx tsc --noEmit` and `npm run lint`

Expected: exit code 0, sem novo erro.

- [ ] **Step 4: Commitar endpoint e documentação**

```bash
git add "src/app/api/admin/plugins/[pluginId]/uninstall/route.ts" docs/plugins.md
git commit -m "docs: expose plugin uninstall lifecycle"
```

### Task 4: Verificação integrada e entrega

**Files:**
- Verify: all files from Tasks 1–3; não adicionar arquivos gerados ou `artifacts/`.

- [ ] **Step 1: Executar a suíte completa**

Run: `npm test`

Expected: todos os testes Node e Vitest passam, incluindo os novos casos de lifecycle.

- [ ] **Step 2: Executar validações de projeto**

Run:

```bash
npx prisma validate
npx tsc --noEmit
npm run lint
npm audit --audit-level=high --omit=dev --omit=optional
npm run build
```

Expected: todos terminam com exit code 0; o build pode emitir apenas os avisos já conhecidos quando o banco local não está disponível.

- [ ] **Step 3: Revisar diff e estado do Git**

Run: `git diff origin/main...HEAD --check` and `git status --short`

Expected: nenhum erro de whitespace; apenas os arquivos da issue estão rastreados e artefatos locais permanecem não rastreados.

- [ ] **Step 4: Publicar o PR**

```bash
git push -u origin feat/plugin-lifecycle-management
gh pr create --base main --head feat/plugin-lifecycle-management --title "feat: add plugin lifecycle management" --body "Fixes #11"
```

Antes de relatar conclusão, acompanhar `gh pr checks <number> --watch` e confirmar CI verde.
