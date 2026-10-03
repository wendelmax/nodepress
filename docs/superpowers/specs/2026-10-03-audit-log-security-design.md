# Audit Log e Baseline de Segurança

**Issue:** #72  
**Data:** 2026-10-03  
**Status:** Proposta aprovada para especificação

## Objetivo

Adicionar uma trilha de auditoria confiável para ações administrativas e eventos de autenticação, sem transformar a auditoria em dependência crítica do fluxo principal. O resultado deve permitir investigar quem fez o quê, em qual recurso, quando e dentro de qual requisição, sem persistir credenciais ou segredos.

## Escopo do MVP

- Persistência append-only de eventos de auditoria.
- Registro de login bem-sucedido, falha de autenticação e logout.
- Registro das mutações administrativas de posts, usuários, opções/configurações, plugins e temas.
- Identificação opcional de tenant, ator, recurso, sucesso/fracasso, correlação de requisição e IP resumido.
- Sanitização de metadados antes da persistência.
- Endpoint administrativo paginado com filtros por ação, recurso, ator, sucesso e intervalo de datas.
- Exportação dos eventos filtrados em JSON e CSV.
- Retenção configurável por quantidade de dias, com rotina explícita de limpeza.
- Testes unitários do domínio de auditoria e testes de rota/integração dos filtros, autorização e falha isolada do armazenamento.

## Fora do escopo do MVP

- Segundo fator de autenticação completo.
- Revogação de sessões já emitidas.
- Interface administrativa completa de configuração da política de segurança.
- Envio para SIEM, webhook ou fila externa.
- Auditoria de leituras públicas e de cada renderização de página.
- Garantia de entrega exatamente uma vez em caso de indisponibilidade do banco.

Esses itens podem ser derivados do mesmo contrato em issues posteriores.

## Contrato do evento

Cada evento terá uma forma estável e independente da tabela que originou a operação:

```ts
type AuditEvent = {
  action: string
  resourceType: string
  resourceId?: string
  actorUserId?: number
  tenantId?: string
  success: boolean
  correlationId?: string
  ipSummary?: string
  metadata?: Record<string, unknown>
  occurredAt?: Date
}
```

`action` seguirá nomes pontuados e legíveis, por exemplo `auth.login.succeeded`, `auth.login.failed`, `post.created`, `user.updated`, `plugin.activated` e `settings.updated`. `resourceType` e `resourceId` serão separados para permitir filtros e evitar que consumidores dependam de uma string composta.

O serviço fornecerá `record(event)` e uma forma de criar o contexto de requisição. A implementação será tolerante a falhas: erros de persistência serão registrados no logger e não serão propagados para o fluxo de negócio.

## Modelo de persistência

Adicionar o modelo `AuditLog` no Prisma, mapeado para `np_audit_logs`, com:

- `id` inteiro autoincremental;
- `actorUserId` opcional;
- `tenantId` opcional;
- `action` e `resourceType` indexáveis;
- `resourceId` opcional;
- `success` booleano;
- `correlationId` opcional e indexável;
- `ipSummary` opcional;
- `metadata` JSON;
- `occurredAt` com default de agora;
- `createdAt` para retenção e ordenação física.

Índices cobrirão `occurredAt`, `action`, `resourceType`, `actorUserId`, `tenantId` e `success`. O registro não terá operação de update/delete na API administrativa. A limpeza de retenção será a única exclusão suportada e ficará em serviço separado, com limite por lote.

## Privacidade e sanitização

Antes de persistir `metadata`, o serviço removerá recursivamente chaves sensíveis, sem diferenciar maiúsculas/minúsculas, incluindo `password`, `pass`, `secret`, `token`, `authorization`, `cookie`, `apiKey`, `accessKey`, `privateKey` e `userPass`. Valores longos terão limite para impedir que payloads inteiros sejam gravados no log.

O IP será resumido: IPv4 terá o último octeto substituído por `0`; IPv6 será reduzido aos primeiros grupos e receberá `::`. Nenhuma senha, token de sessão, cookie ou segredo de plugin será armazenado.

## Integração com a aplicação

As integrações serão feitas após a operação principal, usando o mesmo `correlationId` da requisição quando disponível:

- autenticação: callbacks/autorizações registram sucesso e falha sem expor o identificador secreto;
- posts e usuários: rotas de criação, atualização e exclusão registram o resultado e o ID do recurso;
- opções/configurações: rotas de alteração registram somente os nomes das chaves alteradas;
- plugins: ativação, desativação e desinstalação registram o plugin;
- temas: ativação e alteração registram o tema.

Eventos de erro de validação ou autorização serão registrados quando houver contexto suficiente. Eventos públicos e leituras não administrativas não serão adicionados no MVP.

## API administrativa

Criar uma rota protegida por papel `admin` para listar auditoria com:

- `page` e `pageSize` limitados;
- `action`, `resourceType`, `resourceId`, `actorUserId`, `success`;
- `from` e `to` em ISO-8601;
- ordenação decrescente por `occurredAt` e `id`.

Adicionar formato de exportação via `format=json|csv`, reutilizando exatamente os mesmos filtros. A resposta não exibirá metadados sensíveis porque a sanitização ocorre antes da persistência; ainda assim a API aplicará uma segunda projeção segura antes de serializar.

## Retenção

O serviço aceitará uma política de retenção em dias, com valor padrão documentado. A operação `pruneOlderThan(date)` executará exclusões em lotes e retornará a quantidade removida. Não haverá job agendado obrigatório no MVP; a rotina ficará pronta para ser conectada ao executor de jobs já existente.

## Segurança e autorização

- Somente administradores consultarão ou exportarão os logs.
- O sistema não confiará em `actorUserId` enviado pelo cliente; o ator virá da sessão.
- Filtros e paginação serão validados e limitados para evitar consultas sem limite.
- Falha do audit log não poderá alterar status, resposta ou commit da operação auditada.
- O endpoint não permitirá alterar ou apagar eventos.

## Verificação

Os testes devem demonstrar:

1. sanitização recursiva de segredos e truncamento de metadados;
2. normalização de IPv4/IPv6;
3. gravação com todos os campos e defaults esperados;
4. falha do armazenamento sendo absorvida pelo serviço;
5. filtros, paginação e exportação;
6. acesso negado para não administradores;
7. eventos emitidos pelos fluxos administrativos prioritários;
8. retenção removendo somente registros anteriores ao limite;
9. regressão da suíte existente e compilação/lint.

## Decisões e trade-offs

O MVP usa persistência síncrona disparada de forma não bloqueante, em vez de fila externa, porque o projeto ainda não possui uma infraestrutura de entrega durável para eventos. Isso mantém a implantação simples e preserva o fluxo principal, ao custo de poder perder eventos durante indisponibilidade do banco. O contrato foi separado do Prisma para permitir trocar a implementação por fila/SIEM futuramente sem alterar as integrações.
