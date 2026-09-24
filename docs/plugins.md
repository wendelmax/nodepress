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

## Páginas administrativas dinâmicas

Plugins podem registrar uma página própria no painel usando o hook
`admin_plugin_page_<slug>`. O retorno pode ser um Server Component ou Client
Component React, e múltiplos handlers para o mesmo slug são renderizados na
ordem de prioridade:

```tsx
register({ hooks }) {
  hooks.addAction('admin_plugin_page_reports', () => <ReportsDashboard />)
}
```

A página fica disponível em `/admin/plugins/<slug>`. Se nenhum handler estiver
registrado para o slug, o painel mostra um fallback amigável. A rota herda a
autenticação e o layout administrativo; o plugin continua responsável por
verificar capabilities dentro do próprio conteúdo quando necessário.

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

## Lifecycle

Plugins podem declarar callbacks opcionais para controlar recursos próprios:

```ts
export const reportsPlugin: NodePressPlugin = {
  id: 'reports',
  name: 'Relatórios',
  version: '1.0.0',
  migrations: [createReports],
  async onActivate() {
    // Inicializa integrações externas depois das migrations.
  },
  async onDeactivate() {
    // Libera recursos externos; o NodePress remove hooks e menus depois.
  },
  async onUninstall() {
    // Remove dados/tabelas do plugin, se essa for a política do produto.
  },
  register({ hooks, menus }) {
    // contribuições reversíveis do runtime
  },
}
```

A ativação executa migrations, registra as contribuições de runtime, chama
`onActivate` e só então persiste o plugin em `active_plugins`. Se uma etapa
falhar, a ativação não é persistida e as contribuições já registradas são
removidas. No carregamento inicial, plugins persistidos ativos repetem o
`onActivate` depois de carregar suas migrations.

A desativação chama `onDeactivate` antes de remover hooks, menus e outras
contribuições. Ela preserva as tabelas e os dados do plugin. Se o callback
falhar, o plugin continua ativo para permitir nova tentativa.

Para uma remoção explícita, o plugin deve estar inativo e um administrador pode
chamar:

```text
POST /api/admin/plugins/<id>/uninstall
```

O NodePress chama `onUninstall` e remove apenas o ledger de migrations do
plugin, permitindo uma futura ativação que execute novamente migrations
idempotentes. O core não executa `down` nem apaga tabelas automaticamente; a
limpeza de dados é responsabilidade do próprio plugin.

## Ativação e desativação

Use a tela de plugins ou os endpoints autenticados:

- `GET /api/admin/plugins` lista plugins registrados e estado ativo.
- `POST /api/admin/plugins/<id>/activate` executa migrations pendentes, registra hooks/menus e persiste a ativação.
- `POST /api/admin/plugins/<id>/deactivate` remove contribuições em runtime e preserva migrations/tabelas/dados.

As operações são serializadas por plugin. Falhas de migration não persistem estado ativo; falhas ao salvar o estado desfazem os hooks e menus já registrados.

## Plugins legados

`hello-dolly` e `seo-optimizer` são mantidos como módulos legados em `src/plugins/legacy.ts`. Eles continuam sendo importados pelos efeitos colaterais atuais, sem manifesto, migration ou toggle do novo lifecycle. Isso preserva o comportamento existente; plugins novos devem usar o contrato tipado acima.
