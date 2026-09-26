# Builder Foundation baseada em Puck

## Contexto

O NodePress já usa `@measured/puck` para editar conteúdo visual e possui um
pipeline de componentes fornecidos por plugins ativos. O editor administrativo
e o renderer público já compartilham componentes base e componentes client-safe
de plugins, mas ainda tratam o documento visual como JSON não versionado.

Isso dificulta evoluir o schema, detectar documentos inválidos, oferecer
preview confiável e diferenciar conteúdo visual de configurações do tema. A
fundação precisa consolidar o Puck como capability oficial, preservando HTML
legado, Editor.js e documentos Puck já publicados.

## Objetivo

Criar um contrato versionado e runtime-safe para documentos visuais que seja
usado pelo editor, preview, persistência e renderer público.

Sucesso significa que:

1. documentos Puck podem ser salvos, reabertos e publicados sem perda;
2. documentos antigos continuam renderizando;
3. versões incompatíveis ou conteúdo corrompido geram fallback controlado;
4. o frontend público renderiza a partir do documento persistido, sem depender
   do editor no browser;
5. plugins ativos continuam contribuindo componentes pelo contrato existente;
6. posts, páginas, templates e landing pages podem compartilhar a mesma base.

## Decisões de arquitetura

### 1. Documento canônico versionado

O formato canônico será:

```ts
interface BuilderDocument {
  version: 1
  content: unknown[]
  root: Record<string, unknown>
  metadata: {
    editor: 'puck'
    schemaVersion: 1
    updatedAt?: string
  }
}
```

`content` e `root` mantêm o formato esperado pelo Puck. `metadata` é ignorado
na renderização do Puck e permite evolução do contrato sem confundir versões de
conteúdo com versões do pacote.

O parser aceitará também o formato legado `{ content, root }` e o normalizará
para a versão canônica em memória. A primeira migração não reescreverá todos os
posts automaticamente; a serialização ocorrerá quando o documento for salvo.

### 2. Módulo puro de documento

Será criado um módulo sem acesso a banco, hooks ou componentes React para:

- detectar se um valor é um documento Puck;
- normalizar o formato legado;
- validar a versão e a estrutura mínima;
- serializar o formato canônico;
- retornar erros classificados sem lançar durante o render público.

O módulo será importável no servidor, nos testes e em utilitários de validação.
O editor poderá mostrar um diagnóstico legível para documentos inválidos.

### 3. Resolução de configuração

O resolver server-side continuará carregando os componentes base e os
componentes Puck de plugins ativos. O resolver client-side continuará usando a
allowlist client-safe e os IDs ativos obtidos pelo endpoint administrativo.

Nenhum callback de lifecycle de plugin será executado no browser. A configuração
base não será mutada e um componente desconhecido não poderá injetar código
arbitrário no renderer.

### 4. Fluxo de edição, preview e publicação

```text
persisted value
      │
      ▼
parse + normalize + validate
      │
      ├── editor: BuilderDocument → Puck
      ├── preview: BuilderDocument → server renderer
      └── publish: validate → serialize → persist
```

O preview usará a mesma configuração server-side e os mesmos componentes do
frontend público. O editor poderá carregar a configuração client-side depois de
iniciar com a configuração base, mantendo o fallback atual em caso de erro.

### 5. Compatibilidade de conteúdo

A ordem de detecção continuará sendo:

1. documento Puck válido;
2. documento Editor.js válido;
3. HTML legado;
4. fallback de conteúdo inválido, sem executar markup não confiável.

O comportamento atual de HTML legado e Editor.js não será alterado por uma
falha de validação de Puck.

### 6. Contextos permitidos

Na primeira versão, a fundação aceitará os mesmos componentes registrados na
configuração Puck atual, além dos componentes client-safe de plugins ativos.
O contexto (`post`, `page`, `template` ou `landing`) será uma entrada explícita
do resolver, mas regras específicas de visibilidade, templates e breakpoints
ficarão para as issues #78–#81.

## Interfaces propostas

```ts
type BuilderParseResult =
  | { kind: 'puck'; document: BuilderDocument }
  | { kind: 'editorjs'; document: unknown }
  | { kind: 'html'; content: string }
  | { kind: 'invalid'; reason: string }

function parseBuilderDocument(value: unknown): BuilderParseResult
function serializeBuilderDocument(document: BuilderDocument): string
function isBuilderDocument(value: unknown): value is BuilderDocument
```

As funções devem ser puras, determinísticas e não expor segredos ou dados de
runtime nas mensagens de erro.

## Persistência e migração

- O campo de conteúdo existente continuará sendo a fonte de persistência na
  primeira entrega.
- Documentos legados serão lidos e normalizados sem migração destrutiva.
- Documentos salvos novamente receberão `version: 1` e `metadata`.
- Uma versão futura deverá introduzir um migrador explícito, por exemplo
  `migrateBuilderDocument(document, targetVersion)`.
- Falha de migração impedirá publicação e manterá a última versão publicada.

## Segurança e falhas

- O renderer público nunca executará JavaScript vindo do documento.
- Componentes precisam estar presentes na configuração resolvida; componentes
  desconhecidos serão reportados como incompatíveis.
- A entrada JSON será limitada em tamanho e profundidade antes da renderização.
- Erros de parse não devem derrubar páginas HTML/Editor.js já existentes.
- Falhas do resolver client-side mantêm a configuração base e exibem aviso no
  editor.
- Falhas server-side devem produzir erro observável e fallback público seguro.

## Testes e validação

Serão adicionados testes para:

- normalização do documento legado;
- aceitação do documento canônico;
- rejeição de versão desconhecida;
- rejeição de `content` ou `root` inválidos;
- serialização determinística;
- preservação de HTML e Editor.js;
- fallback quando componente Puck não está registrado;
- paridade entre configuração client-side e server-side;
- publicação usando documento validado.

A validação final incluirá `npm test`, `npx tsc --noEmit`, `npm run lint`,
`npx prisma validate` e `npm run build`.

## Fora de escopo

- biblioteca completa de blocos e responsividade (#78);
- patterns, templates e importação de kits (#79);
- Theme Builder (#80);
- landing pages e maintenance mode (#81);
- colaboração, comentários e modo cliente (#82);
- execução de JavaScript customizado ou sandbox completo (#83);
- alteração do modelo de banco ou criação de uma tabela de documentos visuais.

## Critérios de aceite

- [ ] Contrato `BuilderDocument` versionado documentado e testado.
- [ ] Parser aceita documentos legados e canônicos.
- [ ] Editor e renderer público usam o mesmo pipeline de validação.
- [ ] Conteúdo Editor.js e HTML permanece compatível.
- [ ] Componentes de plugins ativos continuam disponíveis.
- [ ] Documento incompatível não derruba o frontend nem sobrescreve conteúdo
  publicado.
- [ ] Suíte de testes, TypeScript, lint, Prisma e build passam.
