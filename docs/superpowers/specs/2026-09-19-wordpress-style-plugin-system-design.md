# Sistema de Plugins e Menus no Estilo WordPress

## Objetivo

Transformar o sistema atual de plugins e temas do NodePress em uma extensão de primeira classe, inspirada no ciclo de vida do WordPress. Um plugin deverá poder declarar metadados, hooks, menus administrativos e públicos, permissões e migrations próprias, com ativação persistida e execução idempotente.

## Contexto atual

- Plugins são carregados por imports estáticos em `src/plugins/registry.ts`.
- `HookService` já oferece actions e filters com prioridade.
- Plugins existentes (`hello-dolly` e `seo-optimizer`) devem continuar funcionando.
- Temas são registrados estaticamente em `src/themes/registry.ts`.
- O banco é PostgreSQL acessado por Prisma.
- A opção `active_plugins` já é usada para decidir se o plugin de SEO deve executar.

## Escopo

### Incluído

1. Contrato tipado de plugin com manifesto, lifecycle e contribuições.
2. Registro compatível com plugins legados baseados em import e `HookService`.
3. Ativação e desativação persistidas.
4. Migrations por plugin, versionadas, transacionais e idempotentes.
5. Tabela de controle das migrations executadas.
6. Agregador de menus administrativos e públicos.
7. Ordenação determinística, deduplicação e validação de itens de menu.
8. Testes unitários para lifecycle, migrations e menus.
9. Documentação e exemplos para criação de um plugin.

### Fora do escopo desta etapa

- Upload de plugins pelo painel.
- Marketplace ou instalação remota de plugins.
- Sandboxing de código de terceiros.
- Rollback automático ao desativar um plugin.
- Exclusão automática de dados ao desinstalar um plugin.
- Migração automática do schema completo do NodePress para um schema Prisma separado por plugin.

## Decisões de arquitetura

### Manifesto

Cada plugin novo expõe um manifesto semelhante a:

```ts
export const animalsPlugin: NodePressPlugin = {
  id: 'animals',
  name: 'Animals',
  version: '1.0.0',
  permissions: ['animals.read', 'animals.manage'],
  migrations: [animalsMigrationV1],
  register({ hooks, menus }) {
    hooks.addAction('init', initializeAnimals, 10)
    menus.addAdmin({
      id: 'animals',
      label: 'Animais',
      href: '/admin/animals',
      icon: 'PawPrint',
      capability: 'animals.read',
      position: 30,
    })
  },
}
```

O `id` será estável e único. A versão será informativa para o plugin; o controle de migrations usará IDs próprios e imutáveis.

### Lifecycle

O lifecycle será explícito:

1. Descobrir plugins registrados.
2. Validar manifestos e detectar IDs duplicados.
3. Ler plugins ativos da opção persistida.
4. Executar migrations pendentes dos plugins que serão ativados.
5. Registrar hooks e menus apenas depois de migrations concluídas.
6. Persistir a ativação.

Desativar remove hooks e menus do runtime e atualiza a opção persistida, mas preserva tabelas e dados. Uma futura operação de desinstalação poderá executar uma rotina destrutiva separada, sempre com confirmação explícita.

### Compatibilidade legada

`src/plugins/registry.ts` continuará sendo o ponto de descoberta durante a primeira versão. O registry poderá importar módulos legados e manifestos novos. Os módulos legados continuarão registrando callbacks diretamente no `HookService`; plugins novos usarão a API de contexto.

Plugins legados não terão migrations ou menus automaticamente inferidos.

### Migrations

Cada migration terá um ID único no escopo do plugin e duas operações:

```ts
export interface PluginMigration {
  id: string
  up(tx: Prisma.TransactionClient): Promise<void>
  down?(tx: Prisma.TransactionClient): Promise<void>
}
```

O sistema criará uma tabela de controle `np_plugin_migrations` contendo plugin, migration, checksum, timestamps e versão do plugin. A execução:

- ordenará migrations pela ordem declarada;
- ignorará migrations já aplicadas com o mesmo checksum;
- recusará alteração silenciosa do checksum de uma migration aplicada;
- executará cada lote dentro de uma transação;
- não ativará o plugin se qualquer migration falhar;
- não fará rollback automático na desativação.

Como o sistema atual usa Prisma, o MVP usará o `Prisma.TransactionClient` para migrations TypeScript. A criação de tabelas, índices e constraints será feita via `tx.$executeRaw` com SQL parametrizado e nomes controlados pelo código, evitando entrada de usuário em identificadores.

### Agregador de menus

O agregador terá duas superfícies independentes:

- `admin`: navegação do painel;
- `public`: menus renderizados pelo tema no site.

Cada item terá `id`, `label`, `href` ou `children`, `position`, `capability`, `icon` opcional e `parentId` opcional. O agregador:

- coleta contribuições apenas de plugins ativos;
- aplica filtros de menu antes da ordenação final;
- ordena por `position` e depois por `id` para resultado determinístico;
- agrupa filhos pelo `parentId`;
- remove itens duplicados pelo `id` mantendo a primeira contribuição válida;
- omite itens cuja capability não é permitida ao usuário;
- rejeita ciclos e referências para pais inexistentes;
- retorna uma árvore imutável para consumo pelo painel ou pelo tema.

O plugin não poderá injetar HTML arbitrário no agregador. Renderização e ícones continuarão sob responsabilidade dos componentes do NodePress.

### Temas

O registry de temas continuará existindo, mas passará a expor uma interface de resolução de tema ativo. O tema consumirá o menu público agregado por uma propriedade de contexto ou função de consulta. O MVP manterá os componentes atuais (`SinglePost`, `SinglePage` e `Archive`) e não criará um marketplace de temas.

## Segurança e operação

- IDs de plugin, migration, menu e capability serão validados no registro.
- Plugins serão código confiável do processo Node.js; não haverá isolamento.
- Menus administrativos serão filtrados por capability no servidor e novamente na interface.
- Migrations usarão transações e logs estruturados.
- Falhas de migration bloquearão ativação e indicarão plugin/migration responsáveis.
- Desativação não apagará dados.

## Critérios de aceitação

1. Um plugin novo pode ser registrado sem editar múltiplos pontos de lifecycle.
2. Um plugin pode criar uma tabela própria na ativação inicial.
3. Reiniciar o processo não reaplica uma migration concluída.
4. Alterar o checksum de uma migration aplicada encerra com erro explícito.
5. Falha em uma migration não deixa a ativação persistida nem alterações parciais.
6. Desativar um plugin remove seus menus e hooks sem remover dados.
7. Plugins ativos contribuem para menus admin e público.
8. Menus são ordenados, deduplicados e filtrados por capability.
9. Ciclos de menu são rejeitados.
10. `hello-dolly` e `seo-optimizer` continuam funcionando.
11. Temas atuais continuam renderizando sem alteração de contrato.

## Resultado esperado

O NodePress terá uma base extensível no estilo WordPress para plugins mantidos no código-fonte, com migrations e menus reais, sem prometer instalação remota ou sandboxing que ainda não existem.
