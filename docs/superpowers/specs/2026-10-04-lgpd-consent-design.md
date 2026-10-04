# Plugin nativo de consentimento LGPD — MVP

## Objetivo

Adicionar ao NodePress um plugin oficial `lgpd-consent` que implemente um fluxo técnico de consentimento granular, com bloqueio de analytics e scripts externos até autorização, revisão/revogação e registro mínimo versionado. O recurso não promete conformidade jurídica automática; política, bases legais e textos continuam sendo responsabilidade do operador do site.

## Escopo

- Categorias `necessary`, `analytics`, `preferences` e `marketing`.
- `necessary` sempre autorizada; as demais começam desabilitadas.
- Banner client-side multilíngue usando o idioma do site (`pt-BR`, `en-US`, `es-ES`, `fr-FR`, `de-DE`, `it-IT`) com fallback em português.
- Ações de rejeitar opcionais, aceitar tudo e salvar preferências.
- Botão persistente para reabrir preferências e revogar autorizações.
- GA4 e analytics interno condicionados a `analytics`.
- API client-side para widgets registrarem scripts por categoria.
- Opções administrativas `lgpd_policy_url`, `lgpd_policy_version` e `lgpd_retention_days`.
- Migration do plugin criando `np_lgpd_consents`; cada evento armazena somente versão, categorias, idioma, decisão e timestamp.

## Arquitetura

O manifesto `lgpd-consent` usa o Plugin SDK para registrar rotas, página administrativa e um slot público. A configuração fica no `OptionService`, já usado pelo NodePress para opções globais; a tabela de eventos é criada pela migration do plugin, fora do schema de domínio do core, conforme o contrato de lifecycle.

O layout público carrega o componente do slot após `ensureActivePluginsLoaded`. O componente não emite scripts não essenciais no HTML inicial: lê o cookie mínimo, mostra o banner quando não há decisão e injeta/remover scripts somente após mudanças autorizadas. A instalação nova inclui o plugin na lista de plugins ativos para que a proteção exista desde a primeira visita.

## Dados e retenção

O cookie `np_lgpd_consent` contém apenas JSON compacto com `policyVersion`, categorias e data de decisão. O servidor não recebe IP, user-agent, caminho ou identificador de visitante. O registro do banco é append-only por decisão; novos saves/revogações criam eventos separados. A retenção configurada em dias é aplicada durante novas gravações e por um comando do plugin.

## Limitações explícitas

- O bloqueio cobre integrações conectadas à API de consentimento e o GA4/analytics internos existentes; HTML arbitrário de conteúdo não é um sandbox de scripts.
- Revogação impede novas cargas e remove tags administradas pelo componente, mas não pode desfazer dados já enviados a terceiros.
- O MVP não escolhe base legal, não audita textos de política e não substitui aconselhamento jurídico.
