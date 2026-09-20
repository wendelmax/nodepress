# Plugin Animais

Este plugin demonstra o ciclo completo de um plugin NodePress:

- migration transacional e idempotente para criar `np_animals`;
- menu administrativo protegido por `animals.read`;
- menu público agregado automaticamente ao tema ativo.

O plugin é registrado em `src/plugins/registry.ts`. A ativação e a desativação são feitas pelo serviço de plugins, sem apagar a tabela ou desfazer migrations.
