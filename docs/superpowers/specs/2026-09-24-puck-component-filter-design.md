# Filtro de componentes Puck por plugins

## Contexto

O NodePress usa `@measured/puck` para editar e renderizar conteúdo visual. A
configuração atual vive em `src/lib/puck/config.tsx` e é consumida por dois
runtimes:

- `PuckBuilder`, um Client Component que precisa manter funções React no bundle
  do navegador;
- `BlockRenderer`, um Server Component que renderiza o conteúdo publicado e
  precisa refletir os plugins ativos no servidor.

O `HookService.applyFilters` é assíncrono e o lifecycle atual ativa plugins no
servidor. Portanto, aplicar o filtro diretamente no objeto exportado não é
suficiente: o editor não pode receber funções React através de props de um
Server Component, e o renderer público não deve depender do estado em memória
do navegador.

## Objetivo

Permitir que plugins adicionem ou substituam componentes Puck por meio de uma
declaração client-safe e do pipeline `puck_registered_components`, mantendo o
mesmo conjunto declarativo de blocos no editor administrativo e na renderização
pública.

Sucesso significa que:

1. componentes base continuam disponíveis;
2. componentes declarados por plugins ativos aparecem no editor;
3. o renderer público aplica o mesmo conjunto declarativo e os filtros
   registrados no lifecycle do plugin;
4. filtros podem adicionar ou substituir chaves sem mutar a configuração base;
5. plugins sem componentes Puck e conteúdo existente continuam funcionando.

## Decisões de arquitetura

### 1. Configuração base pura

`src/lib/puck/config.tsx` continua sendo o módulo da configuração base e passa
a exportar os tipos necessários para uma coleção de componentes Puck. Ele não
executará hooks nem fará acesso a banco, podendo ser importado pelo browser e
servidor.

### 2. Contrato client-safe no manifesto do plugin

`NodePressPlugin` ganhará uma seção opcional para componentes Puck:

```ts
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
  register({ hooks }) {
    hooks.addFilter('puck_registered_components', (components) => components)
  },
}
```

O conteúdo de `puck.components` é código client-safe e será empacotado com o
editor. O callback `register` continua sendo executado pelo runtime ativo no
servidor; ele pode registrar filtros para regras ou substituições server-side.
Para que um componente adicionado apareça tanto no editor quanto no frontend,
ele deve estar em `puck.components`. Um filtro server-side pode fazer ajustes
específicos do renderer, mas não é uma forma de transportar funções React para o
browser. Plugins que importarem APIs exclusivamente server-side não devem
referenciá-las no módulo usado pela seção `puck`.

### 3. Resolver server-side

Será criado um resolver server-only que:

1. garante o carregamento dos plugins ativos;
2. obtém os componentes `puck.components` somente dos plugins ativos;
3. aplica `HookService.applyFilters('puck_registered_components', components)`;
4. devolve a configuração Puck completa.

`BlockRenderer` usará esse resolver apenas quando o conteúdo for Puck. O
resolver será assíncrono e não será importado por Client Components.

### 4. Resolver client-side

O `PuckBuilder` iniciará com a configuração base para manter o editor
renderizável durante o carregamento. Em seguida, consultará o endpoint admin de
plugins para obter os IDs ativos, agregará apenas os `puck.components` desses
plugins e aplicará o mesmo hook `puck_registered_components` no runtime do
navegador. O browser não executará `register` nem tentará reproduzir o
lifecycle server-side.

Enquanto a configuração estendida é carregada, o builder exibirá a
configuração base; após a resolução, o Puck receberá a configuração atualizada.
Falhas na consulta ou no filtro manterão a configuração base e serão registradas
no console sem quebrar a edição existente.

### 5. Não mutação e precedência

Cada resolução começa com uma cópia rasa da coleção base. Componentes de
plugins são mesclados por ID; filtros executam na ordem de prioridade do
`HookService` e podem adicionar, substituir ou remover entradas. Nenhum
resolver mutará `puckConfig.components` globalmente, evitando vazamento entre
requisições e entre instâncias do editor.

## Fluxo de dados

```text
base config
   ├─ server: active plugins → puck.components → HookService filter → BlockRenderer
   └─ client: active plugin IDs → client-safe puck.components → HookService filter → PuckBuilder
```

O endpoint de plugins continua sendo a fonte de verdade dos IDs ativos no
editor. O servidor continua sendo a fonte de verdade dos plugins ativos para a
renderização pública. Assim, a declaração `puck.components` mantém paridade;
filtros adicionais podem ser específicos de cada runtime.

## Compatibilidade e falhas

- Plugins sem `puck` são ignorados.
- Plugins inativos não contribuem com componentes.
- Um filtro que lança erro não deve substituir a configuração base silenciosa;
  o erro será propagado no servidor para expor configuração inválida e, no
  editor, será registrado e fará fallback para os componentes base.
- Conteúdo Puck salvo com componente desconhecido mantém o comportamento
  existente do Puck para componentes não registrados; a mudança não altera o
  formato persistido.
- Não haverá execução de callbacks `register` do plugin no browser.

## Testes e validação

Serão adicionados testes para:

- mesclar componentes client-safe apenas de plugins ativos;
- aplicar o filtro com adição e substituição sem mutar a base;
- resolver a configuração server-side com o lifecycle ativo;
- usar fallback para a configuração base quando a resolução client-side falhar;
- manter o renderer existente usando a configuração resolvida.

A validação final incluirá `npm test`, `npx tsc --noEmit`, `npm run lint`,
`npx prisma validate` e `npm run build`.

## Fora de escopo

- novo formato de persistência para conteúdo Puck;
- instalação ou download remoto de plugins;
- sandbox de código client-side;
- filtragem de permissões dentro dos componentes; plugins continuam responsáveis
  por seus próprios controles de capability.
