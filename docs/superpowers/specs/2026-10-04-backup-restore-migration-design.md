# Backup, Restore e Migração — Design

## Objetivo

Entregar um MVP seguro para backup manual, restore e migração de instalações
NodePress, usando os contratos atuais de Prisma, auditoria, cron e storage
local/S3-compatible. O fluxo deve ser verificável antes de mutar dados,
idempotente para registros existentes e reversível quando uma etapa falhar.

## Limites do MVP

- O pacote é JSON versionado, não um dump PostgreSQL nem um instalador de
  plugins.
- O banco exportado cobre usuários sem credenciais, posts e metadados,
  taxonomias e opções não sensíveis; escopos parciais selecionam essas seções.
- Mídia é exportada como conteúdo binário codificado e vinculada aos anexos.
- Tema ativo e plugins ativos são metadados de compatibilidade. Código de tema,
  código de plugin e `PluginStorage` não são exportados.
- Secrets, hashes de senha, tokens, chaves de API, credenciais S3 e opções
  conhecidas como secretas ficam fora do pacote.
- Restore é insert-only: IDs e chaves já existentes são preservados, nunca
  sobrescritos. Referências não resolvidas são informadas como avisos.
- Backup agendado usa somente a chamada externa já existente de `/api/cron`;
  não cria scheduler ou fila durável.
- Progresso é emitido por callbacks/log/auditoria e retornado como resumo; não
  há streaming ou job assíncrono nesta versão.

## Pacote e manifesto

O envelope `NodePressBackupPackage` contém `manifest`, `database`, `media` e
`extensions`. O manifesto usa `format: "nodepress-backup"`,
`formatVersion: 1`, versão da aplicação de origem, timestamp, escopo,
compatibilidade e uma lista de artefatos. Cada artefato tem tamanho e SHA-256;
`packageChecksum` cobre o conteúdo canônico de `database`, `media` e
`extensions`, excluindo o próprio manifesto para evitar ciclo.

JSON canônico ordena chaves recursivamente e serializa datas como ISO strings.
Qualquer alteração no conteúdo ou no checksum declarado rejeita o restore antes
de consultar ou alterar o banco.

Compatibilidade exige `formatVersion === 1` e uma versão NodePress de origem
compatível com a versão atual. Ausência de versão atual é tratada como
desconhecida e rejeitada para restore, nunca como compatível por padrão.

## Serviço e fluxo de dados

`BackupService` recebe repositórios/ports injetáveis para facilitar testes.
Exportação lê dados em lotes, sanitiza opções e usuários, captura mídia através
do driver ativo e constrói o envelope determinístico. A API `GET /api/export`
permanece como fachada compatível.

Importação segue esta ordem:

1. parsear e validar envelope, manifesto, compatibilidade e checksums;
2. normalizar URLs somente nos campos de conteúdo suportados;
3. validar tipos, limites, IDs e referências sem escrever;
4. se `dryRun`, retornar o plano e os avisos;
5. com confirmação explícita, enviar mídia para storage privado;
6. executar inserções do banco em uma transação;
7. em erro ou abort, apagar objetos enviados nesta operação e deixar o banco
   sem alterações;
8. auditar início, validação, progresso, sucesso ou falha sem incluir payload.

O importador mantém mapas de IDs quando necessário e ignora conflitos
existentes. A implementação não usa `createMany` para registros que precisem de
relação dependente antes de validar o conjunto completo.

## Storage

O contrato de backup é menor e explícito: `read`, `write`, `delete` e
`health`. O driver local lê arquivos pela URL/key já persistida e grava backups
fora de `public/`. O driver S3 usa `GetObject`, `PutObject` privado e
`DeleteObject`, mantendo endpoint customizável para R2, MinIO e outros
providers compatíveis. Nenhum domínio de backup acessa SDK específico.

## API e auditoria

- `GET /api/export`: autenticação existente, escopo opcional e download do
  pacote versionado.
- `POST /api/import`: aceita `file`, `dryRun` e `confirm`; sem `confirm` a
  operação nunca muta dados.
- O endpoint existente de cron chama o hook de backup agendado quando a opção
  de agenda estiver habilitada e vencida.
- Operações administrativas exigem o mesmo controle de acesso já usado pelas
  rotas admin. Auditoria usa `AuditLogService`/`recordAuditEvent` e registra
  apenas IDs, contagens, etapa, duração, checksum e erro público.

## Falhas e segurança

Falhas de parse, incompatibilidade, checksum, validação ou confirmação são
erros de validação/conflito sem mutação. Falhas do storage acionam cleanup dos
objetos criados. Falhas Prisma dependem da transação e não deixam ledger de
operação. O serviço aceita `AbortSignal` entre etapas para abortar de forma
segura. Mensagens públicas não expõem SQL, stack, caminhos locais ou segredos.

## Testes

Testes unitários cobrem contrato, checksum, sanitização, compatibilidade,
export/import round-trip, escopos parciais, URL normalization, dry-run sem
mutação, confirmação, rollback de banco, cleanup após falha do storage e
endpoints. A suíte existente continua sendo a verificação final.
