# Pluggable Authentication Design

**Date:** 2026-09-21

## Goal

Permitir autenticação local com usuário/e-mail e senha, mantendo Keycloak como provedor opcional e oferecendo um modo híbrido para migração gradual sem apagar senhas ou vínculos existentes.

## Current Context

O NodePress já possui usuários internos, armazenamento de senha com bcrypt, papéis em `UserMeta` e telas administrativas de usuários. Entretanto, o Auth.js está configurado somente com Keycloak e a tela de login não consegue autenticar os usuários locais.

## Authentication Modes

O modo será controlado por `AUTH_MODE`:

| Valor | Comportamento |
|---|---|
| `local` | Exibe e aceita somente usuário/e-mail + senha local. Não exige variáveis Keycloak. |
| `keycloak` | Exibe e aceita somente Keycloak. Mantém o comportamento SSO atual. |
| `hybrid` | Aceita login local e Keycloak simultaneamente. Recomendado durante migração. |

O padrão será `local`, para que uma instalação sem Keycloak funcione imediatamente. Valores ausentes ou desconhecidos devem ser tratados como `local` e registrados como configuração inválida apenas no log do servidor.

## Local Authentication

O `CredentialsProvider` do Auth.js validará `userLogin` ou `userEmail` e comparará a senha recebida com `userPass` usando bcrypt. Usuários sem hash de senha não poderão entrar por autenticação local.

Após autenticar, a sessão JWT conterá:

- `id`: ID numérico do usuário.
- `role`: papel normalizado para `admin`, `editor`, `author`, `contributor` ou `subscriber`.
- `authProvider`: `local` ou `keycloak`.

## Keycloak Authentication

O provider Keycloak só será registrado quando `AUTH_MODE` for `keycloak` ou `hybrid` e as variáveis necessárias estiverem presentes:

- `NEXT_PUBLIC_KEYCLOAK_URL`
- `AUTH_KEYCLOAK_REALM`
- `AUTH_KEYCLOAK_ID`
- `AUTH_KEYCLOAK_SECRET`

Se o modo exigir Keycloak e a configuração estiver incompleta, a aplicação exibirá erro de configuração no login em vez de falhar durante importação do módulo.

No callback do Keycloak:

1. Procurar por `keycloakSub`.
2. Se não encontrar, procurar por e-mail exato.
3. Vincular `keycloakSub` ao usuário encontrado por e-mail.
4. Se ainda não encontrar, criar um usuário sem senha local e com papel `subscriber`, salvo quando o realm role indicar um papel conhecido.

O vínculo nunca substituirá uma senha local existente.

## Role Normalization

Valores legados `administrator` e `admin` serão tratados como `admin`. Os demais papéis serão normalizados para o conjunto interno:

- `administrator`/`admin` → `admin`
- `editor` → `editor`
- `author` → `author`
- `contributor` → `contributor`
- qualquer outro valor → `subscriber`

As verificações administrativas usarão a função única `hasAdminAccess`, evitando comparações incompatíveis entre `admin` e `administrator`.

## Login Interface

O login exibirá:

- formulário local quando `AUTH_MODE=local` ou `hybrid`;
- botão Keycloak quando `AUTH_MODE=keycloak` ou `hybrid`;
- mensagens distintas para credenciais inválidas e configuração Keycloak ausente.

O instalador solicitará senha somente quando o modo for `local` ou `hybrid`. Em modo `keycloak`, a senha será omitida e o primeiro vínculo ocorrerá pelo e-mail do IdP.

## Migration Flow

O modo `hybrid` será o caminho oficial de migração:

1. Exportar backup do banco.
2. Configurar as variáveis Keycloak e `AUTH_MODE=hybrid`.
3. Usuários existentes acessam pelo Keycloak usando o mesmo e-mail cadastrado.
4. O callback vincula automaticamente `keycloakSub` ao usuário local.
5. Validar os vínculos e alterar para `AUTH_MODE=keycloak` quando o login local não for mais necessário.

Será fornecido um comando de diagnóstico/migração que lista usuários locais sem `keycloakSub` e permite vincular um usuário por e-mail sem remover `userPass`. A migração não apagará contas nem credenciais locais.

## Configuration

O `env.example`, o README e o instalador documentarão:

```env
AUTH_MODE="local"
```

As variáveis Keycloak continuarão documentadas como opcionais, mas obrigatórias nos modos `keycloak` e `hybrid`.

## Security Requirements

- Nunca registrar senhas, hashes ou client secrets em logs.
- Comparar senhas exclusivamente com bcrypt.
- Não permitir que um usuário comum altere o próprio papel para `admin` via API.
- Endpoints administrativos devem exigir sessão e autorização compatível com o papel.
- Não criar usuários Keycloak automaticamente como administradores sem role explícita.

## Testing

Os testes devem cobrir:

- resolução do modo padrão e dos modos configurados;
- autenticação local por login e e-mail;
- senha incorreta, usuário inexistente e usuário sem senha;
- registro dos providers por modo;
- vínculo Keycloak por `keycloakSub` e por e-mail;
- preservação da senha local durante vínculo;
- normalização de papéis;
- exibição correta das opções de login;
- migração sem duplicar usuários.

## Non-goals

- Implementar recuperação de senha por e-mail nesta etapa.
- Substituir Keycloak por outro IdP.
- Alterar o schema de usuários além do necessário para a configuração/migração.
- Fazer migração destrutiva ou remover senhas locais automaticamente.
