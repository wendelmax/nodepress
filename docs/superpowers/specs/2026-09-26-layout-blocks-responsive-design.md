# Blocos de layout e responsividade do Builder

## Contexto

A fundação do Builder já persiste documentos Puck versionados, resolve os
componentes registrados para o editor e renderiza o mesmo documento no site
público. A próxima dependência do roadmap (#78) é oferecer uma base de layout
componível para que temas e plugins possam construir páginas responsivas sem
recorrer a HTML ou CSS arbitrários.

O contrato deve ser pequeno o bastante para permanecer estável, mas expressivo
o suficiente para cobrir os padrões presentes em page builders populares:
seções de largura total, containers centralizados, composição em colunas e
agrupamento de elementos.

## Objetivos

- Adicionar ao catálogo base do Puck os blocos `Section`, `Container`,
  `Columns` e `Stack`.
- Permitir aninhamento por meio dos slots nativos do Puck no editor e no
  renderer público.
- Modelar propriedades visuais com valores tipados e responsivos para
  desktop, tablet e mobile.
- Manter a folha de estilos isolada por atributos dos blocos, sem permitir
  injeção de CSS arbitrário pelo conteúdo persistido.
- Validar o schema antes da publicação e produzir fallback seguro para
  documentos inválidos no renderer público.
- Preservar documentos Puck já existentes sem migração obrigatória.
- Cobrir o comportamento com testes de contrato, renderização e acessibilidade.

## Fora de escopo

- Um editor livre de CSS, JavaScript ou HTML.
- Um sistema completo de design tokens administrável pelo usuário.
- Um page builder separado do Puck.
- Um componente `Grid` genérico nesta primeira entrega; `Columns` cobre a
  composição em colunas mais comum.
- Alteração do formato dos documentos legados HTML ou Editor.js.
- Controle de responsividade por breakpoint arbitrário definido pelo usuário.

## Decisão de arquitetura

Os blocos serão componentes base do `puckConfig`, compartilhados pelo resolver
client-side e server-side já existente. Cada bloco usará `type: "slot"` para
receber conteúdo Puck aninhado. O renderer público continuará usando a mesma
configuração resolvida pelo servidor, garantindo paridade entre edição,
preview e publicação.

O código será separado em:

```text
src/lib/puck/layout/
├── schema.ts       # tipos, defaults e validação normalizada
├── styles.ts       # conversão de valores validados em CSS variables
└── components.tsx  # definições Puck e renderizações client-safe
```

O módulo não poderá importar Prisma, APIs server-only ou serviços de negócio.
Os componentes serão registrados na configuração base e permanecerão
disponíveis quando não houver plugins ativos.

## Contrato responsivo

As propriedades responsivas usarão um objeto com chaves fixas:

```ts
type Responsive<T> = {
  desktop: T
  tablet?: T
  mobile?: T
}
```

`desktop` é obrigatório para que o valor persistido seja determinístico.
`tablet` e `mobile`, quando ausentes, herdam o valor de desktop. O conjunto
de breakpoints é fixo e pertence ao runtime:

```text
desktop: acima de 1024px
tablet: 641px–1024px
mobile: até 640px
```

Os estilos serão aplicados por CSS variables declaradas no elemento do bloco e
por seletores escopados a `[data-nodepress-layout]`. O CSS estático define a
precedência dos breakpoints; o conteúdo fornece somente valores validados para
as variables. Isso evita montar regras CSS a partir de strings persistidas.

Valores simples poderão ser aceitos como atalho somente quando o componente
normalizar o valor para `{ desktop: value }`; a forma serializada e publicada
deverá ser normalizada para o contrato responsivo.

Tipos permitidos na primeira versão:

- espaçamento: números inteiros entre `0` e `256`, convertidos para `px`;
- gap: números inteiros entre `0` e `128`, convertidos para `px`;
- largura máxima: tokens `full`, `sm`, `md`, `lg`, `xl`, `2xl` ou `screen`;
- alinhamento: `left`, `center`, `right`;
- direção: `row` ou `column`;
- visibilidade: booleano por breakpoint;
- cores: tokens da plataforma ou valores hexadecimais válidos, sem funções CSS
  nem URLs.

Valores desconhecidos, números fora dos limites e objetos com chaves extras
serão rejeitados pelo validador. O validador não deve confiar apenas nos
fields do Puck, pois documentos podem chegar pela API ou ter sido produzidos
por uma versão anterior.

## Blocos

### `Section`

Representa uma seção de largura total. Terá um único slot `content` e
propriedades para:

- tag semântica limitada a `section`, `div`, `main`, `article` ou `aside`;
- `ariaLabel` opcional;
- padding responsivo;
- background e overlay controlados por tokens/cores permitidos;
- borda, raio e visibilidade por breakpoint.

O conteúdo interno não será automaticamente centralizado; essa responsabilidade
fica clara ao combinar `Section` com `Container`.

### `Container`

Representa a área legível centralizada dentro de uma seção ou página. Terá um
slot `content` e propriedades para:

- largura máxima por token responsivo;
- alinhamento horizontal;
- padding horizontal responsivo;
- tag semântica limitada e `ariaLabel` opcional;
- visibilidade por breakpoint.

### `Columns`

Representa uma composição de 2 a 4 colunas. Terá quatro slots estáveis,
`column1` até `column4`, e propriedades para:

- número de colunas ativo entre 2 e 4;
- gap responsivo;
- alinhamento vertical;
- comportamento em telas menores: manter colunas ou empilhar;
- visibilidade por breakpoint.

Slots acima do número ativo serão ignorados na renderização, mas permanecem
estáveis no documento para não causar perda de conteúdo quando a quantidade de
colunas for alterada no editor. O modo de empilhamento em mobile é explícito e
não depende de CSS escrito pelo usuário.

### `Stack`

Representa um agrupamento de conteúdo em um único slot `content`. Terá:

- direção responsiva `row` ou `column`;
- gap responsivo;
- alinhamento horizontal e vertical;
- `wrap` controlado;
- tag semântica limitada e `ariaLabel` opcional;
- visibilidade por breakpoint.

`Stack` é a opção para agrupamentos simples; `Columns` permanece responsável
por colunas independentes e composição de página.

## Acessibilidade

- Tags configuráveis serão escolhidas de uma lista fechada para evitar markup
  inválido ou comportamento inesperado.
- `ariaLabel` será opcional e aplicado somente quando preenchido.
- O bloco `Heading` existente continuará responsável por níveis de heading.
- O bloco `Image` continuará exigindo `alt`; a validação de layout não deverá
  mascarar essa obrigação.
- Links e botões continuarão usando os contratos atuais de label/href.
- Testes verificarão landmark/role semântico quando aplicável, propagação de
  `aria-label` e ausência de atributos inválidos.

## Compatibilidade e segurança

- A introdução dos blocos não altera o shape de documentos Puck existentes.
- Documentos sem os novos componentes continuam válidos.
- Um documento que contenha props inválidas nos novos blocos não será
  publicado; o renderer público retornará o fallback já usado pelo Builder.
- A validação de componentes existente continuará verificando tipos
  registrados; a nova validação será aplicada apenas aos props dos blocos de
  layout conhecidos.
- Nenhuma prop aceitará `style`, `className`, CSS textual, `dangerouslySetInnerHTML`
  ou URL de stylesheet.
- Os atributos `data-nodepress-layout` e as CSS variables serão gerados pelo
  runtime. Os nomes das variables serão constantes do código.
- Os componentes permanecerão client-safe para o editor e server-renderable
  por meio do `Render` do Puck.

## Testes e critérios de aceite

1. Cada bloco aparece no catálogo base com defaults válidos.
2. Um documento com `Section` contendo `Container`, `Columns` e `Stack` pode
   ser criado, serializado, reaberto e renderizado sem perder slots.
3. Props responsivas válidas geram variables para desktop/tablet/mobile, com
   herança previsível quando tablet/mobile não forem informados.
4. Props inválidas são recusadas pela validação e não são publicadas.
5. O renderer público usa os mesmos componentes e produz o fallback seguro para
   documentos inválidos.
6. Os seletores de layout só afetam elementos marcados com os atributos de
   layout e não alteram elementos fora dos blocos.
7. Testes de acessibilidade cobrem tags semânticas, `aria-label`, heading,
   imagem e link nos cenários relevantes.
8. A suíte existente de Builder, posts e páginas permanece verde.

## Evolução posterior

Depois desta base, as issues de builder poderão adicionar controles visuais
mais ricos, presets de seções, grid genérico, templates e componentes de
marketplace sem expor CSS arbitrário nem quebrar documentos publicados.
