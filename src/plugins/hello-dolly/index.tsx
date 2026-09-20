import React from 'react';
import { HookService } from '@/services/hook.service';
import { HelloDollyWidget } from './widget';

// Plugin legado: carregado por efeito colateral em src/plugins/legacy.ts.
// Plugins novos devem usar NodePressPlugin.register para obter cleanup no lifecycle.
HookService.addAction('admin_top_bar', () => {
  return <HelloDollyWidget />;
}, 10);

