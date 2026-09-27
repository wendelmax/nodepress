# Landing Pages e Maintenance Mode

## Objetivo

Entregar o primeiro plugin nativo para campanhas, páginas independentes do template padrão e operação de coming soon/maintenance, reutilizando o modelo de conteúdo e o builder Puck já presentes no NodePress.

## Escopo desta entrega

- Registrar o content type `landing-page` com título, slug, documento Puck, status, publicação agendada e timezone.
- Resolver uma landing page pública por slug somente quando publicada e quando `publishAt` já tiver ocorrido.
- Expor preview temporário assinado para rascunhos e páginas agendadas, sem tornar o conteúdo público.
- Implementar maintenance/coming soon configurável por opções do plugin, preservando login e rotas administrativas.
- Permitir allowlist por IP e um token de preview para administradores.
- Expor API administrativa para criar, editar, publicar, agendar, arquivar e gerar preview.
- Renderizar blocos Puck por meio do renderer do tema ativo, com fallback seguro quando o documento não for válido.
- Registrar eventos de visualização e submissões por meio das capacidades existentes, sem duplicar forms/leads.
- Manter rollback de conteúdo por revisões imutáveis no próprio plugin.

## Fora de escopo

- Marketplace, instalação de ZIP e editor visual próprio.
- Integrações externas de analytics, CRM e e-mail; o plugin emite hooks para integrações futuras.
- Bypass de autenticação ou acesso direto ao banco pelo código de apresentação.

## Contratos

O plugin terá id `landing-pages`, permissões explícitas (`landing-pages.manage`, `landing-pages.preview`, `landing-pages.settings`) e usará `ContentService` para validação/isolamento de registros. O conteúdo da landing page ficará em `data.document`, `data.publishAt`, `data.timezone`, `data.seo` e `data.revision`; versões anteriores serão persistidas como revisões do plugin.

Preview usará token HMAC com expiração curta e payload mínimo `{ landingPageId, expiresAt }`. A validação será feita antes de qualquer leitura/renderização de rascunho. Maintenance será aplicado apenas no handler público, nunca nas rotas `/login`, `/admin`, `/api`, `/setup-config` ou `/api/auth`.

## Critérios de aceite

1. Uma landing page publicada só é resolvida após o horário agendado no timezone configurado.
2. Rascunhos/agendados não são acessíveis por slug sem token válido e não aparecem no sitemap/listagens públicas.
3. Token expirado, adulterado ou de outro conteúdo retorna `404`.
4. Maintenance bloqueia a página pública, mas mantém login, admin e APIs operacionais; IP allowlisted e preview válido passam.
5. Publicar, agendar, arquivar e rollback são operações idempotentes e cobertas por testes.
6. O plugin pode ser desativado sem alterar o comportamento público existente.

## Verificação

Testes unitários para publicação/horário, token/rollback e allowlist; testes de rota para acesso público e maintenance; `npm test`, `npx tsc --noEmit`, `npm run lint`, `npx prisma validate` e `npm run build` antes do PR.
