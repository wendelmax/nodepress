# Lifecycle de plugins e migrations isoladas

## Objetivo

Completar o lifecycle dos plugins tipados do NodePress para que ativação,
desativação e desinstalação sejam operações explícitas, persistidas e
reversíveis no runtime, mantendo migrations e tabelas de domínio fora do
schema Prisma do core.

## Contexto atual

- `NodePressPlugin` já possui manifesto, `register`, dependências e migrations.
- `PluginMigrationRunner` já executa migrations pendentes em transação, grava
  checksum em `np_plugin_migrations` e rejeita alterações silenciosas.
- `PluginService` já persiste `active_plugins`, valida dependências, carrega
  plugins ativos e coordena cleanup do runtime.
- `NodePressPluginRuntime` registra hooks, menus, content types e extensões
  com callbacks de cleanup.
- Plugins legados (`hello-dolly` e `seo-optimizer`) ainda são carregados por
  efeito colateral e não participam do lifecycle tipado.

## Escopo

### Incluído

1. Hooks opcionais `onActivate`, `onDeactivate` e `onUninstall` no contrato
   `NodePressPlugin`.
2. Execução ordenada dos hooks no `PluginService`, com compensação de runtime
   quando a ativação falhar.
3. Operação administrativa de uninstall para plugins inativos.
4. Limpeza do ledger de migrations após uninstall bem-sucedido, permitindo uma
   ativação futura que reaplique migrations idempotentes.
5. Preservação do `PluginMigrationRunner` como executor transacional de DDL e
   DML do plugin, sem adicionar tabelas específicas ao `schema.prisma` do core.
6. Testes unitários para ordem, falhas, cleanup, uninstall e migrations.

### Fora do escopo

- Upload, marketplace ou descoberta remota de plugins.
- Sandboxing de código Node.js de terceiros.
- Rollback automático de migrations ao desativar.
- Remoção automática de tabelas ou dados do plugin pelo core.
- Conversão imediata dos plugins legados para o manifesto tipado.
- Nova interface visual de uninstall no painel; a primeira entrega expõe a
  operação como endpoint administrativo.

## Contrato do plugin

O manifesto será expandido sem quebrar plugins existentes:

```ts
export interface NodePressPlugin {
  id: string
  name: string
  version: string
  onActivate?: () => void | Promise<void>
  onDeactivate?: () => void | Promise<void>
  onUninstall?: () => void | Promise<void>
  migrations?: PluginMigration[]
  register(context: PluginContext): void | Promise<void>
}
```

Os callbacks não recebem dados de requisição nem entrada de usuário. O plugin
usa closures e suas próprias migrations para acessar seus recursos. Callbacks
devem ser idempotentes, pois uma falha de persistência pode exigir nova
tentativa administrativa.

## Transições de estado

### Ativação

1. Validar plugin e dependências.
2. Executar migrations pendentes em transação.
3. Registrar contribuições no runtime.
4. Executar `onActivate`.
5. Persistir o ID em `active_plugins`.

Se qualquer etapa após o runtime falhar, o runtime é desfeito e o plugin não é
persistido como ativo. Se `onActivate` já tiver produzido efeitos externos, o
serviço tenta `onDeactivate` como compensação e preserva o erro original.

### Desativação

1. Executar `onDeactivate`.
2. Remover hooks, menus e demais contribuições do runtime.
3. Remover o ID de `active_plugins`.

Se `onDeactivate` falhar, a operação aborta antes do cleanup e o plugin
continua marcado como ativo para permitir nova tentativa. A desativação nunca
remove tabelas ou dados.

### Desinstalação

O endpoint administrativo só aceita plugins inativos:

1. Validar que o plugin existe e não está ativo.
2. Executar `onUninstall`, se definido.
3. O plugin remove seus próprios dados/tabelas, quando aplicável.
4. Remover o ledger de migrations desse plugin.

O core não executa `down` automaticamente nem apaga tabelas por convenção.
Se o callback falhar, o ledger permanece intacto. Se a limpeza do ledger falhar
após o callback, a operação retorna erro e exige intervenção/reexecução; não há
rollback genérico para efeitos externos.

## Migrations e isolamento

`PluginMigrationRunner` continuará recebendo `Prisma.TransactionClient` e
executando cada lote dentro de `prisma.$transaction`. Plugins podem usar
`tx.$executeRaw` com SQL parametrizado para criar tabelas, índices e constraints
com nomes estáticos e prefixados pelo plugin (`np_<plugin>_...`).

O core controla apenas o ledger `np_plugin_migrations`, checksum, ordem e
transação. Ele não conhece os modelos nem executa SQL fornecido pelo usuário.
Migrations aplicadas continuam protegidas contra alteração de checksum; o
uninstall é o único fluxo que remove seus registros do ledger.

## Compatibilidade e runtime

Plugins tipados continuam sendo registrados somente durante `runtime.activate`,
e o cleanup existente impede que hooks e menus permaneçam após desativação.
`loadActive` continuará ativando apenas IDs persistidos. Os plugins legados
continuarão funcionando pelo caminho de compatibilidade atual e não ganharão
automaticamente callbacks de lifecycle nesta etapa.

## API administrativa

Será adicionado um endpoint autenticado por administrador:

```text
POST /api/admin/plugins/:pluginId/uninstall
```

Ativação e desativação existentes permanecerão compatíveis. Erros de lifecycle
serão convertidos pelo mesmo `errorResponse` usado pelos endpoints atuais, sem
expor stack trace ou SQL.

## Critérios de aceitação

1. Plugins antigos sem callbacks continuam ativando e desativando.
2. `onActivate` ocorre depois das migrations e antes da persistência.
3. Falha de `onActivate` não persiste o plugin ativo nem deixa runtime registrado.
4. `onDeactivate` ocorre antes de remover o estado persistido.
5. Falha de `onDeactivate` mantém o plugin ativo e seus recursos disponíveis.
6. `onUninstall` só é executado para plugin inativo.
7. Uninstall bem-sucedido remove o ledger, sem o core apagar tabelas do plugin.
8. Migrations continuam idempotentes, transacionais e protegidas por checksum.
9. Hooks e menus de plugins tipados desaparecem após desativação.
10. Plugins legados existentes continuam funcionando.
