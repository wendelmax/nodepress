# Form Submission: migração do legado para o Form Engine — Design

## Objetivo

Tornar o Form Engine a única implementação canônica de captura, segurança e encaminhamento de submissões. O fluxo legado baseado em `Post`/`FormSubmission` será mantido apenas como shim de compatibilidade durante uma janela de depreciação e removido depois que os consumidores forem migrados.

## Contexto atual

- O Form Engine já possui definições tipadas, validação, uploads por port e persistência em `FormDefinition`/`FormEngineSubmission`.
- A segurança de submissões já possui ports para honeypot, rate limit, consentimento e CAPTCHA/Turnstile.
- Leads e delivery já possuem pipeline, assinatura HMAC, idempotência, retries e adapters provider-neutral.
- O endpoint público legado `/api/forms/submit`, `FormEmbed` e o painel de leads ainda gravam/consultam `FormSubmission` diretamente.

## Decisões

### 1. Um único orquestrador

Criar `FormSubmissionOrchestrator` como ponto de composição. Ele recebe uma submissão normalizada, executa segurança antes de persistir, grava a submissão canônica, cria/recupera o lead e publica o evento de delivery. O endpoint novo e o shim legado chamam o mesmo orquestrador; nenhum deles terá regras próprias de spam ou encaminhamento.

### 2. O novo Form Engine é canônico

O fluxo público novo será `POST /api/forms/[id]/submissions`. `FormEmbed` será migrado para esse contrato e passará a obter definições pelo Form Engine. O endpoint aceita valores, uploads, consentimento, honeypot e metadados de origem; respostas de segurança não expõem tokens, chaves ou dados de origem.

### 3. Shim legado com depreciação explícita

`POST /api/forms/submit` continuará aceitando o payload antigo e resolverá o `postId` para uma definição do Form Engine. Ele delegará ao orquestrador e emitirá:

- `Deprecation: true`;
- `Sunset` com uma data configurável;
- `Link: </api/forms/{id}/submissions>; rel="successor-version"`.

O shim não criará novos leads nem chamará connectors diretamente. Logs estruturados registrarão uso do endpoint e do modelo legado para determinar quando a remoção é segura.

### 4. Persistência e idempotência

Adicionar modelos Prisma para leads e entregas, com chaves únicas para `sourceSubmissionId` e `(eventId, targetId)`. A submissão e a criação inicial do lead ocorrerão em transação. Entregas pendentes serão processadas pelo cron existente; cada tentativa atualizará estado, contagem e `nextAttemptAt`. Falhas não serão perdidas nem retornarão sucesso falso ao consumidor.

Os registros legados existentes serão migrados por script idempotente para submissões/leads canônicos. O script preservará o ID de origem e não apagará dados legados durante a fase de depreciação.

### 5. Admin e exportação

`/admin/leads` e `/api/export/leads` lerão o repositório canônico, mantendo filtros por formulário e status. Dados pessoais respeitarão a política de retenção configurada; a exportação continuará sendo uma ação administrativa e não incluirá segredos de delivery.

## Fases de remoção

1. **Migração:** novo orquestrador, rotas canônicas, persistência, admin e testes de integração.
2. **Depreciação:** shim legado ativo com headers, logs e métrica de uso; documentação passa a apontar somente para o Form Engine.
3. **Verificação:** nenhum consumidor interno usa `FormEmbed`/`FormSubmission` legado; script de auditoria confirma ausência de chamadas recentes ao shim.
4. **Remoção:** deletar shim, componentes e queries legadas, remover modelo/tabela antiga apenas após backup e migração validada, e retirar headers/documentação de depreciação.

A fase 4 será um change separado e só poderá ser executada após a janela de depreciação. A issue #76 será encerrada quando as fases 1 e 2 estiverem concluídas; a remoção física ficará rastreada em uma issue de follow-up.

## Segurança e falhas

- Honeypot, rate limit, consentimento e CAPTCHA falham antes da persistência.
- Falha do provider não apaga submissão nem perde o lead; mantém delivery retryable.
- Reenvio do mesmo request com uma chave de idempotência não duplica submissão, lead ou delivery.
- Logs não armazenam payload completo, tokens CAPTCHA, segredos ou chaves de rate limit.
- O shim legado mantém o mesmo formato público de erro durante a depreciação.

## Critérios de aceite

- FormEmbed e a nova rota criam a mesma submissão canônica.
- A rota canônica rejeita spam, consentimento ausente e CAPTCHA inválido sem gravar dados.
- A rota legada delega ao orquestrador, retorna sucesso compatível e emite headers de depreciação.
- Repetição idempotente não duplica submissão, lead ou entrega.
- Falhas de connector são reprocessáveis pelo cron sem bloquear a captura.
- Admin e exportação exibem os leads canônicos com filtros e retenção.
- Testes unitários, integração de rota e Playwright cobrem os fluxos novo e legado.
- A remoção física do legado não faz parte deste change; fica documentada como follow-up.

## Fora de escopo

- Implementação de credenciais reais ou chamadas de produção a HubSpot, Mailchimp e Slack.
- Exclusão imediata de tabelas, componentes ou rotas legadas.
- Construção de um page builder ou alteração do contrato de temas.
