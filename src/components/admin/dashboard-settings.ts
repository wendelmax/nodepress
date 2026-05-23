/**
 * Dashboard customization types and constants.
 * Settings are persisted in localStorage under key "np_dashboard_settings".
 */

export type StatCardId  = 'visitors' | 'views' | 'posts' | 'comments'
export type WidgetId    = 'traffic_chart' | 'recent_posts' | 'recent_comments' | 'glance' | 'activity' | 'quick_draft' | 'ai_assistant'
export type LayoutCols  = 1 | 2 | 3

export interface DashboardSettings {
  /** Which stat cards are visible, in display order */
  statCards: StatCardId[]
  /** Which column widgets are visible */
  widgets: WidgetId[]
  /** Number of columns for the main grid (right sidebar: 1=full, 2=default, 3=wide) */
  gridCols: 2 | 3
  /** Compact mode: tighter spacing */
  compact: boolean
}

export const DEFAULT_SETTINGS: DashboardSettings = {
  statCards: ['visitors', 'views', 'posts', 'comments'],
  widgets:   ['traffic_chart', 'recent_posts', 'recent_comments', 'glance', 'activity', 'quick_draft', 'ai_assistant'],
  gridCols:  3,
  compact:   false,
}

export const STAT_CARD_META: { id: StatCardId; label: string; icon: string }[] = [
  { id: 'visitors',  label: 'Visitantes',    icon: '👥' },
  { id: 'views',     label: 'Visualizações', icon: '👁️' },
  { id: 'posts',     label: 'Posts',         icon: '📝' },
  { id: 'comments',  label: 'Comentários',   icon: '💬' },
]

export const WIDGET_META: { id: WidgetId; label: string; icon: string; col: 'left' | 'right' }[] = [
  { id: 'traffic_chart',   label: 'Gráfico de Tráfego',      icon: '📈', col: 'left'  },
  { id: 'recent_posts',    label: 'Posts Recentes',           icon: '✏️', col: 'left'  },
  { id: 'recent_comments', label: 'Comentários Recentes',     icon: '💬', col: 'left'  },
  { id: 'glance',          label: 'Visão do Site',            icon: '🔭', col: 'right' },
  { id: 'activity',        label: 'Atividades Recentes',      icon: '⚡', col: 'right' },
  { id: 'quick_draft',     label: 'Rascunho Rápido',          icon: '📋', col: 'right' },
  { id: 'ai_assistant',    label: 'AI Assistant',             icon: '🤖', col: 'right' },
]

export const SETTINGS_KEY = 'np_dashboard_settings'

export function loadSettings(): DashboardSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<DashboardSettings>
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      // Ensure arrays always have valid values
      statCards: parsed.statCards?.length ? parsed.statCards : DEFAULT_SETTINGS.statCards,
      widgets:   parsed.widgets?.length   ? parsed.widgets   : DEFAULT_SETTINGS.widgets,
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(s: DashboardSettings): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s))
}
