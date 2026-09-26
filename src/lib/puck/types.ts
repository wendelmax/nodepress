import type { Config } from '@measured/puck'

export type PuckComponents = Config<any>['components']

export type BuilderContext = 'post' | 'page' | 'template' | 'landing'

export interface BuilderDocument {
  version: 1
  content: unknown[]
  root: Record<string, unknown>
  metadata: {
    editor: 'puck'
    schemaVersion: 1
    updatedAt?: string
  }
}

export type BuilderParseResult =
  | { kind: 'puck'; document: BuilderDocument }
  | { kind: 'editorjs'; document: unknown }
  | { kind: 'html'; content: string }
  | { kind: 'invalid'; reason: string }
