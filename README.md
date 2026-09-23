# NodePress

> CMS open source moderno, construído com Next.js, PostgreSQL e autenticação local ou Keycloak.

NodePress é um CMS inspirado no WordPress para publicação e gestão de sites. Ele combina painel administrativo, temas, plugins, editor visual e APIs em uma aplicação Next.js.

## Funcionalidades

- Posts e páginas com rascunho, publicação, agendamento e lixeira.
- Histórico de revisões com restauração de versões anteriores.
- Editor visual com [Puck](https://github.com/measuredco/puck) e editor de blocos.
- Categorias, tags, comentários, menus e tipos de conteúdo personalizados.
- Campos personalizados no estilo ACF.
- Formulários, leads e exportação CSV.
- SEO, Open Graph, sitemap, robots.txt e integração opcional com Google Analytics 4.
- Analytics interno de visualizações e visitantes.
- Sistema de temas e plugins baseado em hooks (`addAction` / `addFilter`).
- Biblioteca de mídia local ou compatível com S3, R2, MinIO e Spaces.
- Assistente de IA com OpenAI, Anthropic, Gemini, Ollama e endpoints compatíveis.
- Importação e exportação de dados em JSON.
- Integração opcional com o serviço Admissions.
- Interface administrativa em inglês e português do Brasil.
- Autenticação administrativa local, Keycloak/Navant ID ou híbrida usando Auth.js.

## Stack

| Camada | Tecnologia |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) com App Router |
| Linguagem | TypeScript |
| Banco de dados | PostgreSQL |
| ORM | [Prisma](https://www.prisma.io) |
| Autenticação | Auth.js/NextAuth + conta local e/ou Keycloak |
| UI | React 19, Tailwind CSS, Puck |

## Requisitos

- Node.js 20 ou superior.
- npm 10 ou superior.
- PostgreSQL 14 ou superior, local ou hospedado.
- Keycloak é opcional. Configure-o apenas para os modos `keycloak` ou `hybrid`.

## Desenvolvimento local

1. Clone o repositório:

   ```bash
   git clone https://github.com/wendelmax/nodepress.git
   cd nodepress
   ```

2. Instale as dependências:

   ```bash
   npm ci --legacy-peer-deps
   ```

   O parâmetro `--legacy-peer-deps` é necessário devido ao peer dependency antigo do `react-quill` com React 19.

3. Crie o arquivo de ambiente:

   ```bash
   cp env.example .env
   ```

   No PowerShell:

   ```powershell
   Copy-Item env.example .env
   ```

4. Preencha no `.env` pelo menos `DATABASE_URL`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL` e `AUTH_MODE`. Para `keycloak` ou `hybrid`, preencha também as variáveis do Keycloak. Veja a seção [Configuração do ambiente](#configuração-do-ambiente).

5. Gere o cliente Prisma:

   ```bash
   npx prisma generate
   ```

6. Inicie o servidor:

   ```bash
   npm run dev
   ```

7. Abra <http://localhost:3000>.

### Assistente de instalação

Se `DATABASE_URL` não estiver definido, o NodePress direcionará para `/setup-config` para configurar o banco. Depois, `/admin/install` cria as tabelas e o registro administrativo inicial.

### Modos de autenticação

`AUTH_MODE` controla os provedores disponíveis:

- `local` (padrão): login por usuário/e-mail e senha armazenada com bcrypt. Keycloak não é necessário.
- `keycloak`: somente Navant ID/Keycloak. O campo de senha não aparece no instalador.
- `hybrid`: disponibiliza os dois métodos. Um login Keycloak existente é vinculado primeiro por `keycloakSub` e, como fallback, por e-mail.

No modo local ou híbrido, o instalador solicita a senha da primeira conta administradora. No modo Keycloak, informe o e-mail que será usado pelo primeiro login federado.

Para listar contas locais ainda sem vínculo ou fazer uma associação explícita:

```bash
npm run auth:migrate-keycloak -- --list
npm run auth:migrate-keycloak -- --email=admin@example.com --sub=keycloak-sub --dry-run
npm run auth:migrate-keycloak -- --email=admin@example.com --sub=keycloak-sub
```

## Configuração do ambiente

O arquivo [`env.example`](env.example) contém todos os nomes de variáveis esperados. As principais são:

| Variável | Obrigatória | Finalidade |
|---|---:|---|
| `DATABASE_URL` | Sim | Conexão PostgreSQL |
| `NEXTAUTH_SECRET` | Sim | Assinatura da sessão |
| `NEXTAUTH_URL` | Sim | URL pública da aplicação |
| `AUTH_MODE` | Sim | `local`, `keycloak` ou `hybrid` |
| `NEXT_PUBLIC_KEYCLOAK_URL` | Keycloak/hybrid | URL base do Keycloak |
| `AUTH_KEYCLOAK_REALM` | Keycloak/hybrid | Realm usado pelo cliente |
| `AUTH_KEYCLOAK_ID` | Keycloak/hybrid | Client ID do NodePress |
| `AUTH_KEYCLOAK_SECRET` | Keycloak/hybrid | Secret do cliente Keycloak |
| `CRON_SECRET` | Para agendamento | Protege a rota de publicação automática |
| `ADMISSIONS_SVC_URL` | Apenas Admissions | URL do serviço Admissions |
| `TENANT_ID` | Apenas Admissions | Tenant usado na integração |
| `INTERNAL_SERVICE_CLIENT_ID` | Apenas Admissions | Cliente de serviço |
| `INTERNAL_SERVICE_CLIENT_SECRET` | Apenas Admissions | Secret do cliente de serviço |

Não comite `.env` nem secrets reais.

## PostgreSQL com Docker

Para executar somente o PostgreSQL localmente:

```bash
docker run -d \
  --name postgres-nodepress \
  -e POSTGRES_USER=admin \
  -e POSTGRES_PASSWORD=admin123 \
  -e POSTGRES_DB=nodepress \
  -p 5432:5432 \
  postgres:16
```

Use esta conexão no `.env`:

```env
DATABASE_URL="postgresql://admin:admin123@localhost:5432/nodepress?schema=public"
```

## Executar com Docker

O `Dockerfile` constrói uma imagem standalone da aplicação:

```bash
docker build \
  --build-arg NEXT_PUBLIC_KEYCLOAK_URL=https://auth.example.com \
  -t nodepress .

docker run --rm \
  --name nodepress \
  --env-file .env \
  -p 3000:3000 \
  nodepress
```

`NEXT_PUBLIC_KEYCLOAK_URL` é embutida no bundle durante o `docker build`; alterá-la apenas em runtime não é suficiente quando o modo usa Keycloak. O PostgreSQL e, nos modos correspondentes, o Keycloak precisam estar acessíveis pelo container.

## Posts agendados

Posts agendados são publicados pela rota protegida `/api/cron`. Configure `CRON_SECRET` e chame a rota por query string ou Bearer token:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron
```

Configure esse endpoint em um cron externo ou no scheduler da sua plataforma de hospedagem.

## Prisma e banco de dados

O instalador inicial usa `npx prisma db push --accept-data-loss` para criar ou atualizar as tabelas. Use esse fluxo apenas em instalações iniciais e mantenha backups antes de qualquer alteração de schema. O schema atual está em [`prisma/schema.prisma`](prisma/schema.prisma).

## Estrutura do projeto

```text
src/
├── app/                    # Rotas públicas, painel e APIs
├── components/admin/       # Componentes do painel
├── lib/                    # Auth, Prisma, IA, i18n e utilitários
├── plugins/                # Registro e plugins instalados
├── services/               # Regras de negócio
├── storage/                # Drivers local e S3
└── themes/                 # Registro e temas
prisma/
└── schema.prisma           # Modelo do banco
```

## Desenvolvimento de plugins

Crie um plugin em `src/plugins/meu-plugin/index.tsx` e registre-o em `src/plugins/registry.ts`:

```tsx
import { HookService } from '@/services/hook.service'

HookService.addAction('admin_top_bar', () => {
  return <div>Meu plugin</div>
}, 10)
```

Os plugins podem registrar ações e filtros usando o `HookService`.

Plugins TypeScript confiáveis também podem usar manifestos tipados com hooks,
migrations, capacidades, ciclo de vida e menus administrativos/públicos. Plugins
legados baseados apenas em importações de efeitos colaterais continuam carregando
pela camada de compatibilidade.

## Desenvolvimento de temas

Crie um tema em `src/themes/meu-tema/` e registre-o em `src/themes/registry.ts`. Um tema implementa `SinglePost`, `SinglePage` e `Archive`, podendo também fornecer `NotFound`.

## Verificação

```bash
npm test
npm run lint
npm run build
npm run validate:ui
```

`npm run validate:ui` usa Playwright contra um servidor local já iniciado em `http://localhost:3000`, verifica as rotas públicas e administrativas e salva evidências em `artifacts/wiki-screenshots/`.

## Contribuindo

Abra uma issue para discutir mudanças maiores ou envie um pull request com uma descrição clara, testes relevantes e instruções de validação.

## Licença

MIT © NodePress Contributors
