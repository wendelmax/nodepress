# Segurança de Submissões — Slice 2 da Issue #76

## Objetivo

Criar um módulo autocontido para proteger submissões públicas contra abuso,
sem integrar ainda com o Form Engine, persistência, webhooks, connectors ou o
pipeline de leads. O módulo deve fornecer contratos estáveis para uma futura
integração server-side e respostas seguras para consumidores de API.

## Escopo e limites

- Honeypot para rejeitar submissões automatizadas sem revelar o motivo ao
  cliente.
- Rate limit atômico por uma chave opaca de origem e, quando disponível, uma
  chave opaca de identidade.
- Consentimento obrigatório opcional, com validação de versão de política.
- Porta de verificação CAPTCHA e adapter HTTP para Cloudflare Turnstile.
- Serviço orquestrador sem efeitos colaterais fora dos adapters injetados.
- Rate limiter em memória apenas para uso autocontido e testes; persistência
  distribuída fica para uma integração futura.
- Documentação do contrato que o Form Engine deverá adaptar.

Ficam explicitamente fora do escopo `prisma/schema.prisma`, migrations, módulo
de formulários, webhooks, connectors e pipeline de leads.

## Arquitetura

O código ficará em `src/security/submissions/`. `contracts.ts` define os tipos
de entrada, política, portas e resultados públicos. `submission-security.service.ts`
executa as verificações em ordem: honeypot, consentimento, rate limit e CAPTCHA.
O serviço não registra entrada, token, segredo, origem ou identidade.

`in-memory-rate-limiter.ts` implementa a porta de rate limit com janela fixa e
operação atômica para todas as chaves fornecidas. As chaves não são devolvidas
nem armazenadas em texto puro. `turnstile.adapter.ts` implementa a porta CAPTCHA
com `fetch` injetável, endpoint padrão do Turnstile e conversão de qualquer erro
de transporte ou resposta inválida em falha de verificação sem detalhes.

## Contratos e comportamento

O serviço recebe `originKey` obrigatório e `identityKey` opcional. Esses valores
são chaves opacas: o adapter de integração é responsável por derivá-los do
contexto confiável da requisição. O serviço nunca interpreta nem retorna esses
valores.

Uma submissão permitida retorna `allowed: true`, código `ALLOWED` e mensagem
estável. Falhas retornam `allowed: false` e somente códigos/mensagens seguros:

- honeypot: `SUBMISSION_REJECTED` e mensagem genérica;
- limite: `RATE_LIMITED`, mensagem de nova tentativa e `retryAfterSeconds`;
- consentimento: `CONSENT_REQUIRED`;
- CAPTCHA ausente/inválido: `CAPTCHA_REQUIRED` ou `CAPTCHA_INVALID`;
- falha inesperada do mecanismo: `SECURITY_UNAVAILABLE`.

Nenhum resultado inclui token CAPTCHA, segredo Turnstile, origem, identidade,
erro do provedor, payload, IP ou user-agent.

## Falha segura

O serviço falha fechado quando uma porta necessária lança exceção. O adapter
Turnstile não lança erros de rede para o consumidor e não inclui o segredo ou o
token em mensagens. O rate limiter só incrementa contadores quando todas as
chaves da submissão ainda estão dentro do limite, evitando consumo parcial.

## Integração futura com o Form Engine

O Form Engine deverá criar um adapter fino que:

1. extrai o campo honeypot e a declaração de consentimento da submissão;
2. deriva `originKey` e `identityKey` sem expor esses valores ao payload;
3. chama `SubmissionSecurityService.protect(input, policy)` antes de persistir;
4. interrompe a persistência quando `allowed` for `false`;
5. traduz o resultado para o envelope HTTP do próprio slice, preservando as
   mensagens públicas sem anexar detalhes internos.

Essa integração não faz parte deste slice.

## Verificação

Os testes cobrirão submissão legítima, honeypot acionado, limite por origem e
identidade, token Turnstile válido e inválido, consentimento ausente e garantias
de não vazamento. O branch também será validado com testes focados, lint e
typecheck.
