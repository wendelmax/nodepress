import React from 'react';
import { HookService } from '@/services/hook.service';
import { HelloDollyWidget } from './widget';

// Injeta o componente no Hook 'admin_top_bar'
HookService.addAction('admin_top_bar', () => {
  return <HelloDollyWidget />;
}, 10);

