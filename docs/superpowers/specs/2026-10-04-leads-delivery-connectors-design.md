# Leads, Delivery e Connectors — Slice 3

## Objetivo

Adicionar um pipeline autocontido que transforma uma submissão compatível em um lead, publica eventos de domínio e entrega esses eventos a connectors configuráveis com assinatura, idempotência, retry com backoff e reprocessamento. O slice prepara as fronteiras para a integração futura com o módulo de formulários sem alterar esse módulo.

## Escopo e restrições

- A base é `origin/main` após o merge do PR #100.
- O código fica restrito a `src/modules/leads`, `src/modules/delivery`, `src/modules/connectors` e seus testes/documentação de design.
- Não alterar `prisma/schema.prisma`, migrations, módulo de formulários ou módulo de segurança.
- Não usar credenciais reais nem fazer chamadas a HubSpot, Mailchimp ou Slack nos testes.
- Persistência e transporte são ports; adapters em memória/stub permitem uso local e testes determinísticos.

## Arquitetura

### Leads

`LeadPipelineService` recebe `SubmissionInput`, um contrato local compatível com eventos de submissão. Ele normaliza os dados sem assumir o módulo de formulários, cria ou recupera um lead por `sourceSubmissionId` e publica um `LeadEvent` somente quando há uma mudança efetiva.

O lead possui status ordenado (`new`, `contacted`, `qualified`, `converted`, `lost`) e versão monotônica. Transições só avançam no fluxo permitido, exceto a saída explícita para `lost`; estados terminais não podem ser reabertos implicitamente. O repositório em memória ordena por criação e ID estável.

### Delivery

`DeliveryService` cria registros de entrega por par `(eventId, targetId)`. O registro passa por `pending`, `retryable`, `delivered` ou `failed`. Cada tentativa é persistida no adapter de store, e uma falha transitória calcula `nextAttemptAt` com backoff exponencial; uma falha permanente não é repetida. `reprocess` reinicia explicitamente um registro falho ou retryable, preservando a identidade do evento.

O envelope é serializável e contém ID, tipo, sequência do lead, timestamps e payload. Webhooks de saída usam HMAC-SHA256 sobre o corpo JSON, com cabeçalho `X-NodePress-Signature: sha256=<hex>`. A verificação usa comparação em tempo constante e rejeita assinatura inválida.

### Connectors

`LeadConnector` é o port comum para destinos. HubSpot, Mailchimp e Slack são adapters configuráveis que mapeiam o evento para um request provider-neutral e dependem de um `ConnectorTransport` injetado. Sem configuração de destino, o adapter retorna `disabled` sem lançar nem tentar rede; com transporte configurado, o teste pode observar o request sem qualquer credencial real.

## Fluxo

```text
SubmissionInput
      │
      ▼
LeadPipelineService ──► LeadRepositoryPort
      │
      └───────────────► LeadEventPublisherPort
                              │
                              ▼
                       DeliveryService
                              │
                 ┌────────────┴────────────┐
                 ▼                         ▼
          Webhook signer              LeadConnector
                                      ├─ HubSpot
                                      ├─ Mailchimp
                                      └─ Slack
```

## Tratamento de falhas

- Evento repetido para o mesmo destino retorna o registro existente e não duplica a entrega.
- Falha transitória atualiza tentativas e agenda a próxima execução sem bloquear o processo chamador.
- Falha permanente marca a entrega como `failed` imediatamente.
- `reprocess` permite nova tentativa manual de uma entrega não entregue.
- O slice não adiciona rota HTTP, job scheduler ou persistência Prisma; essas são camadas de composição posteriores.

## Testes de aceite do slice

- Assinatura válida, assinatura adulterada e segredo incorreto.
- Idempotência do lead e da entrega.
- Backoff, contagem de tentativas e transição para falha permanente.
- Reprocessamento de entrega falha/retryable.
- Ordem de criação/eventos e transições de status do lead.
- Mapeamento dos três connectors e comportamento disabled sem configuração.

