# Blocos de layout responsivo do Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar `Section`, `Container`, `Columns` e `Stack` ao Builder Puck, com slots aninháveis, schema responsivo validado, CSS isolado e renderização acessível no editor e no site público.

**Architecture:** O contrato será implementado em um módulo client-safe de layout com schema/normalização, geração de CSS variables e definições Puck. A configuração base registrará os quatro componentes; os resolvers client/server existentes os distribuirão automaticamente ao editor e ao renderer. A validação de props de layout será integrada ao contrato do documento para bloquear publicação inválida e retornar fallback seguro no renderer.

**Tech Stack:** TypeScript, React 19, `@measured/puck` 0.20.2, Vitest em ambiente Node, Next.js 16, CSS variables e CSS escopado por atributos.

**Spec:** `docs/superpowers/specs/2026-09-26-layout-blocks-responsive-design.md`

## Global Constraints

- Usar os slots nativos do Puck (`type: "slot"`) para conteúdo aninhado.
- Breakpoints fixos: desktop acima de `1024px`, tablet `641px–1024px`, mobile até `640px`.
- `desktop` é obrigatório em valores responsivos; `tablet` e `mobile` herdam desktop quando ausentes.
- Espaçamento permitido: inteiros de `0` a `256`, convertidos para `px`.
- Gap permitido: inteiros de `0` a `128`, convertidos para `px`.
- Largura máxima permitida: `full`, `sm`, `md`, `lg`, `xl`, `2xl` ou `screen`.
- Não aceitar `style`, `className`, CSS textual, `dangerouslySetInnerHTML` ou URL de stylesheet vindos do documento.
- Componentes de layout devem ser client-safe e server-renderable pelo `Render` do Puck.
- Documentos HTML, Editor.js e Puck existentes devem continuar nas mesmas branches de compatibilidade.
- Não adicionar dependências para resolver o layout.

## Review Focus

- Slot aninhado com componente desconhecido: a validação deve percorrer props/slots recursivamente e retornar todos os tipos desconhecidos sem quebrar o documento.
- Responsivo parcial ou com chaves extras: valores ausentes devem herdar desktop; chaves desconhecidas, números fracionários e limites excedidos devem ser rejeitados.
- Props de layout vindas diretamente da API, sem passar pelo formulário do Puck: a validação do documento deve aplicar as mesmas regras dos fields.
- Conteúdo inválido no renderer público: o documento deve produzir fallback seguro e nunca montar CSS arbitrário ou chamar `Render` com props inválidas.
- Acessibilidade e isolamento: tags fora da allowlist, `ariaLabel` vazio e atributos/estilos fora do escopo devem ser tratados sem markup inválido nem vazamento para elementos irmãos.

---

### Task 1: Criar o schema tipado e o validador de layout

**Files:**
- Create: `src/lib/puck/layout/schema.ts`
- Test: `src/lib/puck/layout/__tests__/schema.test.ts`
- Modify: `src/lib/puck/document.ts`
- Test: `src/lib/puck/__tests__/document.test.ts`

**Interfaces:**
- Produces `Breakpoint`, `Responsive<T>`, `LayoutTag`, `LayoutVisibility`, os tipos de props dos quatro blocos, `normalizeResponsive<T>(value: T | Responsive<T>): Responsive<T>`, `validateLayoutProps(type: string, props: unknown): LayoutValidationResult` e `validateBuilderLayoutDocument(document: BuilderDocument): LayoutDocumentValidation`.
- `LayoutValidationResult` deve expor `valid: true` ou `valid: false` com `errors: string[]`; `LayoutDocumentValidation` deve acumular o caminho do node e o tipo do componente.
- `document.ts` usará `validateBuilderLayoutDocument` em `canPublishBuilderDocument` sem alterar a detecção de HTML/Editor.js.

- [ ] **Step 1: Escrever os testes falhando para normalização e limites**

  Cobrir: valor simples normalizado para `desktop`, herança de tablet/mobile, espaçamento `0` e `256`, gap `128`, largura máxima permitida, tags semânticas permitidas e visibilidade booleana.

- [ ] **Step 2: Escrever os testes falhando para entradas inválidas**

  Cobrir: `desktop` ausente, chaves extras em responsive, decimal/negativo/acima do limite, token de largura desconhecido, cor com `url()`/função CSS, tag fora da allowlist e props contendo `style` ou `className`.

- [ ] **Step 3: Escrever os testes falhando para documentos aninhados**

  Construir um documento com `Section` → `Container` → `Columns` → `Stack` e verificar validação recursiva de props dentro de arrays de slots, incluindo caminho de erro e múltiplos erros no mesmo documento.

- [ ] **Step 4: Rodar os testes focados e confirmar falha**

  Run: `npx vitest run src/lib/puck/layout/__tests__/schema.test.ts src/lib/puck/__tests__/document.test.ts`

  Expected: FAIL porque o schema e a validação de layout ainda não existem.

- [ ] **Step 5: Implementar tipos, normalização e validação**

  Manter a validação pura e sem imports server-only. Normalizar defaults apenas em memória; o validador deve rejeitar objetos com chaves desconhecidas e produzir erros determinísticos para facilitar mensagens do editor e testes.

- [ ] **Step 6: Integrar a validação ao contrato de documento**

  Fazer `canPublishBuilderDocument` retornar `false` para documento Puck com props inválidas dos componentes de layout. Não rejeitar componentes de plugin desconhecidos nessa função, pois essa responsabilidade continua em `validateBuilderComponents`.

- [ ] **Step 7: Rodar os testes focados e confirmar passagem**

  Run: `npx vitest run src/lib/puck/layout/__tests__/schema.test.ts src/lib/puck/__tests__/document.test.ts`

  Expected: PASS, incluindo os testes antigos de compatibilidade.

- [ ] **Step 8: Commitar**

  ```bash
  git add src/lib/puck/layout/schema.ts src/lib/puck/layout/__tests__/schema.test.ts src/lib/puck/document.ts src/lib/puck/__tests__/document.test.ts
  git commit -m "feat: validate responsive builder layout props"
  ```

### Task 2: Criar estilos responsivos isolados

**Files:**
- Create: `src/lib/puck/layout/styles.ts`
- Create: `src/lib/puck/layout/styles.css`
- Modify: `src/app/(web)/globals.css`
- Test: `src/lib/puck/layout/__tests__/styles.test.ts`

**Interfaces:**
- Produces `layoutStyleVariables(input: ValidatedLayoutStyleInput): React.CSSProperties`, `layoutDataAttributes(type: LayoutComponentType): Record<string, string>` e os seletores CSS escopados por `[data-nodepress-layout]`.
- `styles.css` será importado pelo módulo client-safe de componentes, sem regras baseadas em classes/valores fornecidos pelo usuário.

- [ ] **Step 1: Escrever testes falhando para variables e herança**

  Verificar que padding/gap/max-width/visibility geram variables desktop/tablet/mobile, que ausência de tablet/mobile usa desktop e que cores chegam apenas após validação.

- [ ] **Step 2: Escrever teste falhando de isolamento**

  Verificar que os atributos gerados são constantes (`data-nodepress-layout` e `data-nodepress-layout-type`) e que nenhum nome de classe ou regra CSS é derivado de input persistido.

- [ ] **Step 3: Rodar os testes focados e confirmar falha**

  Run: `npx vitest run src/lib/puck/layout/__tests__/styles.test.ts`

  Expected: FAIL porque o conversor de styles ainda não existe.

- [ ] **Step 4: Implementar conversão e CSS escopado**

  Emitir somente CSS variables com nomes constantes. Usar media queries fixas para tablet/mobile e mapear tokens de max-width para uma tabela interna. Não gerar `<style>` com conteúdo persistido. Importar `styles.css` em `src/app/(web)/globals.css` para que editor e renderer público recebam as mesmas regras.

- [ ] **Step 5: Rodar os testes focados e confirmar passagem**

  Run: `npx vitest run src/lib/puck/layout/__tests__/styles.test.ts`

  Expected: PASS.

- [ ] **Step 6: Commitar**

  ```bash
  git add src/lib/puck/layout/styles.ts src/lib/puck/layout/styles.css 'src/app/(web)/globals.css' src/lib/puck/layout/__tests__/styles.test.ts
  git commit -m "feat: add scoped responsive layout styles"
  ```

### Task 3: Implementar os quatro componentes Puck

**Files:**
- Create: `src/lib/puck/layout/components.tsx`
- Test: `src/lib/puck/layout/__tests__/components.test.ts`

**Interfaces:**
- Produces `layoutComponents`, um objeto compatível com `PuckComponents`, contendo `Section`, `Container`, `Columns` e `Stack`.
- Cada definição deve usar fields `type: "slot"` conforme o contrato: `content` para Section/Container/Stack e `column1`–`column4` para Columns.
- Cada render deve aceitar os tipos de props do `schema.ts`, usar `normalizeResponsive`, `layoutStyleVariables` e os atributos de layout, e não importar APIs server-only.

- [ ] **Step 1: Escrever testes falhando de catálogo e defaults**

  Verificar os quatro IDs, fields de slot, defaults válidos e allowlist de tags. Confirmar que `Columns` possui quatro slots estáveis.

- [ ] **Step 2: Escrever testes falhando de renderização semântica**

  Usar `React.createElement`/`react-dom/server` no ambiente Node para renderizar cada definição com props default e verificar `data-nodepress-layout`, tag configurada, `aria-label` somente quando preenchido e presença dos slots no output.

- [ ] **Step 3: Escrever testes falhando de Columns e Stack**

  Verificar que Columns oculta slots acima do total escolhido, empilha conforme o modo mobile e que Stack produz direction/gap/wrap pelas variables/atributos esperados.

- [ ] **Step 4: Rodar os testes focados e confirmar falha**

  Run: `npx vitest run src/lib/puck/layout/__tests__/components.test.ts`

  Expected: FAIL porque as definições ainda não existem.

- [ ] **Step 5: Implementar os componentes client-safe**

  Usar elementos semânticos selecionados por tabela fechada e slots recebidos pelo Puck. O render de Columns deve manter os quatro slots no contrato, mas renderizar somente os ativos. Defaults devem ser suficientes para inserir o bloco no editor sem props incompletas.

- [ ] **Step 6: Rodar os testes focados e confirmar passagem**

  Run: `npx vitest run src/lib/puck/layout/__tests__/components.test.ts`

  Expected: PASS.

- [ ] **Step 7: Commitar**

  ```bash
  git add src/lib/puck/layout/components.tsx src/lib/puck/layout/__tests__/components.test.ts
  git commit -m "feat: add semantic responsive layout components"
  ```

### Task 4: Registrar layout na configuração base e validar árvores Puck

**Files:**
- Modify: `src/lib/puck/config.tsx`
- Modify: `src/lib/puck/document.ts`
- Test: `src/lib/puck/__tests__/components.test.ts`
- Test: `src/lib/puck/__tests__/document.test.ts`

**Interfaces:**
- `puckConfig.components` passará a incluir `...layoutComponents` sem mutar o objeto base em runtime.
- `validateBuilderComponents` deverá percorrer o documento completo, incluindo arrays de slots aninhados, preservando a ordem única dos tipos desconhecidos.

- [ ] **Step 1: Escrever teste falhando de registro**

  Verificar que `puckConfig.components` contém `Section`, `Container`, `Columns` e `Stack` e que uma configuração derivada preserva os componentes base sem compartilhar mutação com outra resolução.

- [ ] **Step 2: Escrever teste falhando de componentes desconhecidos aninhados**

  Inserir um tipo desconhecido dentro de `Section.props.content` e outro dentro de `Columns.props.column2`; verificar que ambos aparecem em `unknownTypes` uma única vez.

- [ ] **Step 3: Rodar os testes focados e confirmar falha**

  Run: `npx vitest run src/lib/puck/__tests__/components.test.ts src/lib/puck/__tests__/document.test.ts`

  Expected: FAIL porque os layout components ainda não estão registrados e a validação atual só visita o nível raiz.

- [ ] **Step 4: Registrar componentes e tornar a validação recursiva**

  Fazer a configuração importar o objeto de layout e mesclá-lo estaticamente. Na validação, caminhar apenas por dados JSON (`Record`/arrays), sem executar props nem interpretar funções, para manter o contrato seguro.

- [ ] **Step 5: Rodar os testes focados e confirmar passagem**

  Run: `npx vitest run src/lib/puck/__tests__/components.test.ts src/lib/puck/__tests__/document.test.ts`

  Expected: PASS.

- [ ] **Step 6: Commitar**

  ```bash
  git add src/lib/puck/config.tsx src/lib/puck/document.ts src/lib/puck/__tests__/components.test.ts src/lib/puck/__tests__/document.test.ts
  git commit -m "feat: register layout blocks in builder config"
  ```

### Task 5: Integrar bloqueio de publicação e fallback público

**Files:**
- Create: `src/lib/puck/publish.ts`
- Modify: `src/components/admin/PuckBuilder.tsx`
- Modify: `src/themes/default/components/BlockRenderer.tsx`
- Test: `src/themes/default/components/__tests__/BlockRenderer.test.ts`
- Test: `src/lib/puck/__tests__/publish.test.ts`

**Interfaces:**
- Produces `isBuilderPublishAllowed(initialData: unknown, componentIds: ReadonlySet<string>): boolean` in `src/lib/puck/publish.ts`, combining parse, recursive component validation and layout schema validation while preserving the existing empty-document behavior.
- `PuckBuilder` usará `isBuilderPublishAllowed(initialData: unknown, componentIds: ReadonlySet<string>): boolean`, extraída como helper puro e coberta sem DOM, para bloquear props de layout inválidas antes de chamar `onPublish`.
- `BlockRenderer` validará documento de layout depois de resolver a configuração e antes de `resolvePostShowcaseData`/`Render`, usando `data-builder-error="invalid-layout"` para o novo caso.

- [ ] **Step 1: Escrever teste falhando de fallback para layout inválido**

  Mockar uma configuração que contenha os quatro componentes e passar um documento com padding fora do limite; verificar que `Render` e `resolvePostShowcaseData` não são chamados e que o fallback sinaliza `invalid-layout`.

- [ ] **Step 2: Escrever teste falhando de publicação bloqueada**

  Cobrir `isBuilderPublishAllowed` com documento inicial Puck contendo props inválidas e verificar `false`; cobrir documento válido, HTML e Editor.js para preservar os comportamentos atuais. O callback do componente deverá consumir esse helper.

- [ ] **Step 3: Rodar os testes focados e confirmar falha**

  Run: `npx vitest run src/themes/default/components/__tests__/BlockRenderer.test.ts src/lib/puck/__tests__/publish.test.ts`

  Expected: FAIL porque o renderer ainda não conhece o erro de schema de layout e o editor só verifica compatibilidade de formato.

- [ ] **Step 4: Integrar os gates sem alterar branches legadas**

  Implementar o helper em `src/lib/puck/publish.ts`, usar o resultado no `PuckBuilder` e manter HTML e Editor.js fora do resolver Puck. Para Puck, validar tipos aninhados e props de layout antes de enriquecer PostShowcase; no editor, exibir status acionável e impedir publicação quando houver erro.

- [ ] **Step 5: Rodar os testes focados e confirmar passagem**

  Run: `npx vitest run src/themes/default/components/__tests__/BlockRenderer.test.ts src/lib/puck/__tests__/publish.test.ts src/lib/puck/__tests__/document.test.ts`

  Expected: PASS.

- [ ] **Step 6: Commitar**

  ```bash
  git add src/lib/puck/publish.ts src/components/admin/PuckBuilder.tsx src/themes/default/components/BlockRenderer.tsx src/themes/default/components/__tests__/BlockRenderer.test.ts src/lib/puck/__tests__/publish.test.ts
  git commit -m "feat: guard invalid layout documents"
  ```

### Task 6: Documentar contrato e executar validação da entrega

**Files:**
- Modify: `docs/plugins.md`
- Modify: `docs/superpowers/plans/2026-09-26-layout-blocks-responsive.md` (marcar etapas concluídas durante execução)
- Test: `src/lib/puck/layout/__tests__/` (ajustes descobertos pela integração)

**Interfaces:**
- A documentação pública deve explicar os quatro blocos, slots, breakpoints, limites de valores, herança responsiva e regra de não aceitar CSS arbitrário.
- Nenhuma dependência nova deve aparecer no lockfile.

- [ ] **Step 1: Escrever/ajustar teste de acessibilidade e isolamento integrado**

  Verificar semântica, `aria-label`, ausência de atributos de estilo arbitrários e que o CSS dos blocos não afeta um elemento irmão não marcado.

- [ ] **Step 2: Atualizar a documentação de plugins/Builder**

  Adicionar uma seção curta descrevendo o contrato para temas/plugins que adicionarem componentes Puck, incluindo a exigência de permanecer client-safe.

- [ ] **Step 3: Rodar verificação focada**

  Run: `npx vitest run src/lib/puck/layout src/lib/puck/__tests__ src/themes/default/components/__tests__/BlockRenderer.test.ts`

  Expected: PASS.

- [ ] **Step 4: Rodar a suíte completa**

  Run: `npm test`

  Expected: PASS sem regressão nos testes existentes.

- [ ] **Step 5: Rodar validações estáticas e build**

  Run: `npx tsc --noEmit`

  Expected: PASS.

  Run: `npx prisma validate`

  Expected: PASS.

  Run: `npm run lint`

  Expected: PASS sem novos erros nos arquivos de layout.

  Run: `npm run build`

  Expected: PASS; avisos de fallback de banco durante geração estática devem ser avaliados, mas não podem alterar o exit code.

- [ ] **Step 6: Revisar diff e status**

  Run: `git diff --check; git status --short; git diff --stat origin/main...HEAD`

  Confirmar que `artifacts/` e arquivos fora do escopo não foram adicionados.

- [ ] **Step 7: Commitar documentação e ajustes finais**

  ```bash
  git add docs/plugins.md src/lib/puck src/components/admin/PuckBuilder.tsx src/themes/default/components docs/superpowers/plans/2026-09-26-layout-blocks-responsive.md
  git commit -m "docs: document responsive builder layout blocks"
  ```

## Handoff

Depois de concluir as tarefas e a verificação, solicitar revisão do branch
`codex/builder-layout-responsive` antes de abrir o PR da issue #78. O PR deve
incluir a referência `Closes #78`, listar os quatro blocos, os gates de
publicação/fallback e os comandos de validação executados.
