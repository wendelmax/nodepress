# Landing Pages

O plugin nativo `landing-pages` cria páginas de campanha independentes do template padrão, usando documentos Puck e o renderer do tema ativo.

## Ativação

Ative `landing-pages` na tela de plugins ou pela API administrativa existente. Para preview assinado, defina `LANDING_PAGES_PREVIEW_SECRET`; em desenvolvimento o plugin também aceita `AUTH_SECRET` ou `NEXTAUTH_SECRET`.

## API administrativa

- `GET /api/admin/landing-pages` lista páginas.
- `POST /api/admin/landing-pages` cria uma página com `title`, `slug`, `document`, `publishAt`, `timezone` e `seo`.
- `PUT /api/admin/landing-pages/:id` atualiza o conteúdo.
- `POST /api/admin/landing-pages/:id/publish` publica ou agenda a página.
- `DELETE /api/admin/landing-pages/:id` arquiva a página.
- `POST /api/admin/landing-pages/:id/preview` gera token temporário.

Uma página publicada fica disponível em `/:slug` somente após o horário agendado. Rascunhos e páginas futuras só podem ser acessados pela URL de preview com token válido.

## Maintenance mode

As opções `landing_pages_maintenance` e `landing_pages_allowlist` controlam a manutenção. A allowlist pode ser JSON (`["203.0.113.7"]`) ou uma lista separada por vírgulas. O modo não bloqueia login, administração, APIs ou setup; IPs exatos e previews válidos também passam.

O plugin não cria uma implementação paralela de forms ou analytics: documentos Puck continuam usando os blocos e hooks já registrados pelo NodePress.
