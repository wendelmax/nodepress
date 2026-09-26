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

## Componentes Puck

Plugins podem adicionar blocos ao editor visual e ao renderer público declarando
componentes client-safe no manifesto:

```tsx
import type { NodePressPlugin } from '@/plugins/types'

export const reportsPlugin: NodePressPlugin = {
  id: 'reports',
  name: 'Relatórios',
  version: '1.0.0',
  puck: {
    components: {
      ReportsTable: {
        fields: { title: { type: 'text' } },
        render: ({ title }) => <section>{title}</section>,
      },
    },
  },
}
```

`puck.components` deve conter apenas código que possa ser empacotado no
browser. Plugins que expõem componentes ao editor também precisam ser incluídos
na allowlist `src/plugins/puck-client-registry.ts`; essa lista só pode importar
módulos sem dependências server-only. Somente plugins ativos contribuem com seus
componentes. Depois do merge, o NodePress executa o filtro
`puck_registered_components`, que pode adicionar ou substituir componentes no
runtime correspondente. O editor começa com os componentes base enquanto
consulta os plugins ativos; se essa consulta falhar, ele mantém a configuração
base. O callback `register` do plugin não é executado no browser.

### Contrato de documentos do Builder

Conteúdo visual salvo pelo editor usa o contrato versionado `BuilderDocument`:

```ts
{
  version: 1,
  content: [{ type: 'ReportsTable', props: { title: 'Resumo' } }],
  root: {},
  metadata: {
    editor: 'puck',
    schemaVersion: 1,
    updatedAt: '2026-09-26T00:00:00.000Z',
  },
}
```

Documentos Puck antigos no formato `{ content, root }` são normalizados em
memória e continuam editáveis; eles só recebem `version` e `metadata` quando
forem salvos novamente. O campo `postContent` continua sendo a fronteira de
persistência nesta versão, sem migração em lote.

O editor e o renderer público usam o mesmo parser, os mesmos limites de
tamanho/profundidade e a mesma validação de tipos de componentes. O renderer
resolve apenas componentes presentes na configuração server-side atual, depois
de carregar plugins ativos. Se um plugin for desativado ou um componente for
removido, o documento não é executado nem renderizado parcialmente: a página
exibe um fallback seguro e registra um aviso observável no servidor. Conteúdo
corrompido ou com versão incompatível segue o mesmo fallback.

Falhas na resolução client-side mantêm a configuração base do editor e exibem
um diagnóstico para componentes indisponíveis; nenhum callback `register` é
executado no browser. HTML legado e Editor.js seguem seus próprios caminhos e
não carregam o resolver de plugins. Os contextos `post`, `page`, `template` e
`landing` são aceitos pelo resolver server-side; a primeira versão compartilha
o conjunto atual de componentes entre eles.

Documentos contêm somente dados declarativos. Não inclua JavaScript, funções,
imports ou markup executável no JSON do Builder; extensões devem ser fornecidas
por componentes client-safe registrados no contrato Puck.

O filtro de componentes está detalhado em
[`2026-09-24-puck-component-filter-design.md`](superpowers/specs/2026-09-24-puck-component-filter-design.md).
## Rotas, jobs e comandos

Plugins podem registrar superfícies de runtime pelo contexto:

```ts
register({ routes, jobs, commands }) {
  routes.add({
    id: 'reports.health',
    method: 'GET',
    path: '/health',
    handler: async (_request, context) => Response.json({
      ok: true,
      requestId: context.requestId,
    }),
  })

  jobs.add({
    id: 'reports.sync',
    handler: (payload, context) => syncReports(payload, context),
  })

  commands.add({
    id: 'reports.reindex',
    handler: (args, context) => reindexReports(args, context),
  })
}
```

Rotas ficam disponíveis sob `/api/plugins/<path>` e recebem um
`NodePressContext`. O método HTTP e o caminho precisam ser únicos entre todos os
plugins ativos; barras finais são normalizadas e um conflito falha durante o
registro, evitando que a ordem de ativação escolha silenciosamente um handler.

Jobs e comandos são executados por seus IDs através do runtime interno. Um ID
desconhecido produz erro explícito. Todas as contribuições continuam vinculadas
ao lifecycle do plugin e são removidas quando ele é desativado.

## Capabilities

O manifesto declara as capabilities que o plugin pode usar. O runtime expõe
essa declaração pelo contexto:

```ts
register({ capabilities }) {
  if (capabilities.has('reports.read')) {
    capabilities.require('reports.read')
  }
}
```

`require` lança um erro explícito quando a capability não foi declarada. Menus
que informam `capability` também passam por essa validação, inclusive os itens
filhos; assim, um plugin não consegue publicar uma superfície protegida por uma
permissão que não possui no manifesto. A mesma API será usada pelas futuras
interfaces de settings, secrets e serviços de domínio.

## Storage namespaced

Plugins podem persistir configurações e estado pequeno sem acessar o Prisma
diretamente:

```ts
register({ storage }) {
  await storage.set('configuration', {
    currency: 'BRL',
    capture: 'automatic',
  })

  const configuration = await storage.get<{
    currency: string
    capture: string
  }>('configuration')

  await storage.delete('temporary-state')
}
```

Os dados são armazenados em `np_plugin_storage` com chave composta pelo ID do
plugin e pela chave informada. O plugin só consegue ler, atualizar ou apagar
as chaves da própria namespace; chaves vazias ou inválidas são rejeitadas antes
de acessar o banco. O valor precisa ser JSON serializável.

Secrets não usam essa API. O backend de secrets deverá oferecer criptografia,
auditoria e capabilities próprias antes de ser exposto aos plugins.

## Bloco PostShowcase

O bloco built-in `PostShowcase` exibe conteúdo publicado dentro do editor Puck
e em páginas públicas. Ele aceita os campos:

- `postType`: `post`, `page` ou um tipo registrado por plugin ativo;
- `limit`: quantidade de itens entre 1 e 12;
- `category`: slug opcional da taxonomia `category`;
- `layout`: `grid`, `list` ou `carousel`;
- `showExcerpt` e `showDate`: controles de apresentação.

No editor, o campo de tipo consulta `GET /api/content-types` e o preview busca
`GET /api/posts/showcase?type=...&limit=...&category=...`. A API aplica sempre
as mesmas regras de segurança: somente conteúdo publicado, tipos ativos e DTO
público reduzido. Falhas, ausência de categoria e listas vazias resultam em um
estado neutro no bloco, sem quebrar o editor.

Na renderização pública, o NodePress resolve os itens no servidor antes de
chamar o `Render` do Puck. Consultas iguais no mesmo documento são
deduplicadas. HTML legado e conteúdo Editor.js não passam por essa resolução.
O componente não importa Prisma nem módulos server-only, e os dados resolvidos
não são persistidos no conteúdo editável.

O JSON persistido contém apenas configuração:

```json
{
  "type": "PostShowcase",
  "props": {
    "postType": "animal",
    "limit": 6,
    "category": "adocao",
    "layout": "grid",
    "showExcerpt": true,
    "showDate": true
  }
}
```

`items` é transitório e só aparece nos props usados durante a renderização
pública ou no estado local do preview. Títulos, resumos e URLs são renderizados
como props React; o bloco não usa `dangerouslySetInnerHTML`.

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
