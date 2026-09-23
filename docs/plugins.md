# Desenvolvendo plugins NodePress

O sistema de plugins é inspirado no WordPress, mas usa módulos TypeScript compilados junto com a aplicação. Plugins são confiáveis e executam no mesmo processo do NodePress; não existe instalação remota ou sandbox.

## Manifesto e registro

Crie um diretório em `src/plugins/<id>/index.ts` e exporte um `NodePressPlugin`. O `id` usa letras minúsculas, números e hífens; a versão deve ser semver-like. Registre o manifesto no array `registeredPlugins` de `src/plugins/registry.ts`.

```ts
import type { NodePressPlugin } from '@/plugins/types'

export const reportsPlugin: NodePressPlugin = {
  id: 'reports',
  name: 'Relatórios',
  version: '1.0.0',
  permissions: ['reports.read', 'reports.manage'],
  register({ hooks, menus }) {
    hooks.addAction('admin_top_bar', () => 'Relatórios')
    menus.addAdmin({
      id: 'reports',
      label: 'Relatórios',
      href: '/admin/reports',
      capability: 'reports.read',
      position: 40,
    })
    menus.addPublic({
      id: 'reports-public',
      label: 'Relatórios públicos',
      href: '/reports',
      position: 40,
    })
  },
}
```

`register` recebe o ID do plugin, registradores reversíveis de hooks e registradores de menus. O runtime remove hooks e menus ao desativar o plugin. Se um hook precisar ser removido antes, guarde a função retornada por `addAction` ou `addFilter` e chame-a.

## Menus e capabilities

Use `menus.addAdmin` para a navegação do painel e `menus.addPublic` para a navegação pública do tema. Cada item tem `id`, `label`, `href` opcional, `position`, `icon`, `capability` e `parentId` opcional. Filhos podem ser declarados em `children` ou registrados separadamente com `parentId`.

O agregador ordena irmãos por posição e ID, deduplica IDs mantendo a primeira contribuição, valida pais/ciclos e filtra itens protegidos. Menus públicos com capability não aparecem para visitantes. A API também está disponível em `GET /api/menus?surface=admin|public`; a superfície administrativa exige sessão admin.

## Migrations

Migrations são executadas antes da ativação e recebem um `Prisma.TransactionClient`. Cada `(pluginId, migrationId)` é registrado em `np_plugin_migrations` com checksum SHA-256. A mesma migration é ignorada quando o checksum não mudou; se o código mudar depois de aplicado, a ativação falha para evitar drift silencioso.

```ts
import type { Prisma } from '@prisma/client'
import type { PluginMigration } from '@/plugins/types'

export const createReports: PluginMigration = {
  id: '001-create-reports',
  async up(tx: Prisma.TransactionClient) {
    await tx.$executeRaw`
      CREATE TABLE IF NOT EXISTS "np_reports" (
        "id" SERIAL PRIMARY KEY,
        "title" VARCHAR(180) NOT NULL
      )
    `
  },
}
```

Liste a migration no manifesto:

```ts
export const reportsPlugin = {
  // ...id, name e version
  migrations: [createReports],
  register() { /* ... */ },
}
```

As migrations são transacionais: se alguma falhar, nenhuma linha da migration ledger é persistida e o plugin não é ativado. O campo `down` é opcional para ferramentas futuras; desativar o plugin não executa rollback e nunca apaga dados.

## Ativação e desativação

Use a tela de plugins ou os endpoints autenticados:

- `GET /api/admin/plugins` lista plugins registrados e estado ativo.
- `POST /api/admin/plugins/<id>/activate` executa migrations pendentes, registra hooks/menus e persiste a ativação.
- `POST /api/admin/plugins/<id>/deactivate` remove contribuições em runtime e preserva migrations/tabelas/dados.

As operações são serializadas por plugin. Falhas de migration não persistem estado ativo; falhas ao salvar o estado desfazem os hooks e menus já registrados.

## Plugins legados

`hello-dolly` e `seo-optimizer` são mantidos como módulos legados em `src/plugins/legacy.ts`. Eles continuam sendo importados pelos efeitos colaterais atuais, sem manifesto, migration ou toggle do novo lifecycle. Isso preserva o comportamento existente; plugins novos devem usar o contrato tipado acima.
