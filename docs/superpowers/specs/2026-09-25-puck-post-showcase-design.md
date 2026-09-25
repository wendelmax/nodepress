# Bloco Puck PostShowcase

## Contexto

A issue #19 pede um bloco Puck capaz de exibir conteúdo publicado de forma
dinâmica. O bloco precisa funcionar em dois runtimes diferentes:

- no editor administrativo, que é um Client Component e precisa mostrar uma
  prévia atualizada;
- no renderer público, que deve consultar o banco no servidor e entregar uma
  página renderizada sem depender de um fetch do navegador.

O Puck exige que a função `render` de um componente produza um elemento React
de forma síncrona. Portanto, uma consulta Prisma não será colocada diretamente
na definição do componente. A consulta server-side será feita antes do
`Render` do Puck e os itens resolvidos serão injetados somente na árvore de
renderização pública.

## Objetivo

Adicionar um componente built-in `PostShowcase` que permita configurar:

- `postType`: `post`, `page` ou um tipo registrado por plugin ativo;
- `limit`: quantidade de itens, limitada entre 1 e 12;
- `category`: slug opcional da taxonomia `category`;
- `layout`: `grid`, `list` ou `carousel`;
- `showExcerpt`: exibição opcional do resumo;
- `showDate`: exibição opcional da data de publicação.

O bloco deverá listar somente conteúdo publicado, filtrado pelo tipo e pela
categoria selecionados, e funcionar tanto no preview do editor quanto em
páginas publicadas.

## Critérios de sucesso

1. `PostShowcase` aparece no catálogo do editor Puck.
2. O editor mostra itens reais através de uma API de leitura client-safe.
3. O renderer público consulta os itens no servidor antes de renderizar o Puck.
4. Rascunhos, itens privados e tipos inativos nunca aparecem.
5. O filtro por `postType`, categoria e limite é aplicado de forma consistente
   nos dois runtimes.
6. Falha ou ausência de dados produz estado vazio/error amigável sem quebrar a
   página ou o editor.
7. O conteúdo persistido continua contendo somente as propriedades de
   configuração; os itens resolvidos não são salvos no JSON do post.

## Contrato de dados

O componente usará uma configuração client-safe compartilhada:

```ts
type PostShowcaseProps = {
  postType: string
  limit: number
  category?: string
  layout: 'grid' | 'list' | 'carousel'
  showExcerpt: boolean
  showDate: boolean
  items?: PostShowcaseItem[]
}

type PostShowcaseItem = {
  id: number
  title: string
  slug: string
  excerpt: string
  date: string
  thumbnailUrl?: string
}
```

`items` é transitório: pode ser recebido pelo renderer público após a consulta
server-side, mas não será exposto como field editável nem persistido pelo Puck.
No editor, quando `items` não estiver presente, o componente buscará os dados
na API.

## Arquitetura

### Componente e configuração Puck

`puckConfig` receberá uma definição `PostShowcase` com fields client-safe e
defaults estáveis. A função de renderização será um componente React que apenas
apresenta os props recebidos; ela não importará Prisma, `PostService` ou APIs
server-only.

O field `postType` usará a lista de tipos disponíveis fornecida por um endpoint
client-safe baseado no `contentTypeRegistry`. Os tipos core `post` e `page`
estarão sempre disponíveis; tipos de plugins só serão listados enquanto o
plugin estiver ativo.

### Consulta compartilhada

Será criado um método de leitura em `PostService` (ou serviço dedicado de
showcase) que:

1. valida o tipo solicitado contra os tipos core e o registry de tipos ativos;
2. limita a quantidade solicitada ao intervalo 1–12;
3. aplica `postStatus = 'publish'` e o `postType` selecionado;
4. quando houver categoria, resolve os IDs relacionados pela taxonomia
   `category` e filtra por esses IDs;
5. ordena por data de publicação decrescente;
6. retorna somente o DTO público de `PostShowcaseItem`, sem conteúdo completo,
   metadados arbitrários ou dados privados do autor.

A consulta retornará itens vazios quando a categoria não existir. Um tipo
inválido ou inativo será rejeitado para evitar que a API sirva conteúdo de um
CPT não habilitado.

### API de preview

Será adicionado `GET /api/posts/showcase` com os parâmetros:

```text
?type=post&limit=6&category=adocao
```

O endpoint será público para permitir a prévia e a renderização client-safe,
mas sempre aplicará a mesma regra de conteúdo publicado do serviço de consulta.
Parâmetros inválidos retornam `400`; falhas inesperadas retornam o formato de
erro público já usado pela aplicação.

Um endpoint separado de tipos de conteúdo, ou extensão equivalente de uma rota
existente, fornecerá as opções de `postType` ao campo externo do Puck sem
importar o registry server-only no bundle do editor.

### Renderização pública

Antes de chamar `<Render>` em `BlockRenderer`, o renderer percorrerá os nós Puck
e detectará os componentes `PostShowcase`. Para cada combinação distinta de
`postType`, `limit` e `category`, resolverá os itens no servidor e acrescentará
`items` aos props transitórios do nó.

O `Render` continuará recebendo uma configuração Puck normal e um componente
client-safe. Como os itens já estarão nos props, a saída inicial pública não
precisará buscar dados no browser. Conteúdo HTML e Editor.js não passará por
essa resolução.

### Preview no editor

Quando `items` não estiver presente, `PostShowcase` buscará a API com os fields
atuais. Mudanças nos fields cancelam a consulta anterior e iniciam outra. O
estado de loading terá uma apresentação simples; erro ou lista vazia exibirá um
estado neutro sem lançar exceção para o Puck.

## Segurança e compatibilidade

- Apenas posts publicados serão retornados.
- O tipo será validado contra os tipos ativos; não haverá SQL construído a
  partir de entrada do usuário.
- O DTO não incluirá `postContent`, metadados arbitrários ou credenciais.
- Títulos, resumos e URLs serão renderizados por props React, sem
  `dangerouslySetInnerHTML`.
- O JSON existente do Puck continuará válido; `items` é removido/ignorado fora
  do ciclo de renderização.
- Se uma categoria for removida, o bloco continuará válido e mostrará estado
  vazio, em vez de expor conteúdo sem o filtro solicitado.

## Testes e validação

Serão adicionados testes para:

- consulta apenas de conteúdo publicado;
- filtro por tipo e categoria;
- limite mínimo/máximo e ordenação por data;
- rejeição de tipo inativo ou inválido;
- projeção do DTO sem conteúdo privado;
- endpoint com parâmetros válidos e inválidos;
- definição e defaults do componente Puck;
- preview client-side com loading, sucesso, erro e cancelamento;
- resolução server-side de nós `PostShowcase` sem afetar HTML/Editor.js;
- renderização com lista vazia e os três layouts.

A validação final incluirá `npm test`, `npx tsc --noEmit`, `npm run lint`,
`npx prisma validate`, `npm run build` e `git diff --check`.

## Fora de escopo

- seleção de taxonomias além de `category`;
- paginação, busca textual ou ordenação configurável pelo usuário;
- cache persistente ou revalidação granular de cada showcase;
- edição de dados dos posts dentro do componente Puck;
- alteração do formato de posts já publicados.
