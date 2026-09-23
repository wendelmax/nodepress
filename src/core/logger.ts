export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogContext {
  requestId?: string
  pluginId?: string
  jobId?: string
  tenantId?: string
  [key: string]: unknown
}

function write(level: LogLevel, event: string, context: LogContext = {}): void {
  const payload = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...context,
  })
  if (level === 'error') console.error(payload)
  else if (level === 'warn') console.warn(payload)
  else if (level === 'debug') console.debug(payload)
  else console.info(payload)
}

export const logger = {
  debug: (event: string, context?: LogContext) => write('debug', event, context),
  info: (event: string, context?: LogContext) => write('info', event, context),
  warn: (event: string, context?: LogContext) => write('warn', event, context),
  error: (event: string, context?: LogContext & { error?: unknown }) => {
    const safeContext = { ...context }
    if (safeContext.error instanceof Error) safeContext.error = { name: safeContext.error.name, message: safeContext.error.message, stack: safeContext.error.stack }
    write('error', event, safeContext)
  },
}
