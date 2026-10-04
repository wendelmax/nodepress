import React from 'react'
import { Render, type Config, type Data } from '@measured/puck'
import {
  parseBuilderDocument,
  validateBuilderComponents,
} from '@/lib/puck/document'
import { sanitizeHtml, sanitizeUrl } from '@/lib/puck/security'
import { validateBuilderLayoutDocument } from '@/lib/puck/layout/schema'
import { getServerPuckConfig } from '@/lib/puck/server-config'
import type { BuilderContext } from '@/lib/puck/types'
import { resolvePostShowcaseData } from '@/lib/puck/server-showcase-data'
import { resolvePatternReferences } from '@/lib/puck/patterns'
import { patternService } from '@/services/pattern.service'

interface BlockRendererProps {
  content: string;
  context?: BuilderContext;
}

function safeBuilderFallback(code: 'invalid-document' | 'unknown-component' | 'invalid-layout', reason: string) {
  console.warn(`Puck builder content is unavailable: ${reason}`)
  return (
    <div
      className="post-content builder-content-error"
      data-builder-error={code}
      role="status"
    >
      Conteúdo visual indisponível.
    </div>
  )
}

export default async function BlockRenderer({ content, context = 'post' }: BlockRendererProps) {
  const parsed = parseBuilderDocument(content)

  if (parsed.kind === 'invalid') {
    return safeBuilderFallback('invalid-document', parsed.reason)
  }

  if (parsed.kind === 'puck') {
    let config: Config<any>

    try {
      config = await getServerPuckConfig(context)
      const validation = validateBuilderComponents(parsed.document, new Set(Object.keys(config.components)))

      if (!validation.valid) {
        return safeBuilderFallback('unknown-component', 'document contains unavailable components')
      }

      const layoutValidation = validateBuilderLayoutDocument(parsed.document)
      if (!layoutValidation.valid) {
        return safeBuilderFallback('invalid-layout', 'document contains invalid layout props')
      }
    } catch {
      return safeBuilderFallback('invalid-document', 'server renderer failed')
    }

    let resolvedContent: Awaited<ReturnType<typeof resolvePostShowcaseData>>
    try {
      const resolvedPatterns = await resolvePatternReferences(
        parsed.document,
        async (patternId, version) => {
          const pattern = await patternService.get(patternId, version)
          return pattern?.document ?? null
        },
      )
      resolvedContent = await resolvePostShowcaseData(
        resolvedPatterns as unknown as Parameters<typeof resolvePostShowcaseData>[0],
      )
    } catch {
      return safeBuilderFallback('invalid-document', 'pattern resolution failed')
    }
    return <Render config={config} data={resolvedContent as Data} />
  }

  if (parsed.kind === 'html') {
    // Legacy HTML Fallback
    return (
      <div 
        className="post-content legacy-content prose prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(parsed.content) }}
      />
    )
  }

  const parsedContent = parsed.document as { blocks: Array<Record<string, any>> }

  // Render Editor.js JSON Blocks
  return (
    <div className="prose prose-invert prose-blue max-w-none prose-headings:text-text prose-p:text-text-secondary prose-a:text-primary-light prose-strong:text-white prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-img:rounded-xl">
      {parsedContent.blocks.filter((block): block is Record<string, any> => (
        typeof block === 'object' && block !== null
      )).map((block: any, index: number) => {
        const key = block.id || `block-${index}`
        const data = block.data && typeof block.data === 'object' ? block.data : {}

        switch (block.type) {
          case 'header':
            const level = Number.isInteger(data.level) && data.level >= 1 && data.level <= 6
              ? data.level
              : 2
            const Tag = `h${level}` as any
            return <Tag key={key} dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.text) }} />

          case 'paragraph':
            return <p key={key} dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.text) }} />

          case 'list':
            const ListTag = (data.style === 'ordered' ? 'ol' : 'ul') as any
            return (
              <ListTag key={key}>
                {(Array.isArray(data.items) ? data.items : []).map((item: unknown, index: number) => (
                  <li key={index} dangerouslySetInnerHTML={{ __html: sanitizeHtml(item) }} />
                ))}
              </ListTag>
            )

          case 'quote':
            return (
              <blockquote key={key}>
                <p dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.text) }} />
                {data.caption && <cite dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.caption) }} />}
              </blockquote>
            )

          case 'code':
            return (
              <pre key={key} className="bg-surface-elevated border border-border rounded-xl p-4 overflow-x-auto text-sm">
                <code>{typeof data.code === 'string' ? data.code : ''}</code>
              </pre>
            )

          case 'image': {
            const file = data.file && typeof data.file === 'object'
              ? data.file as Record<string, unknown>
              : {}
            const imageUrl = sanitizeUrl(file.url, 'src')
            return (
              <figure key={key} className={`my-8 ${data.withBackground ? 'bg-surface p-6 rounded-2xl border border-border' : ''}`}>
                {imageUrl && (
                  <img
                    src={imageUrl}
                    alt={typeof data.caption === 'string' ? data.caption : 'Image'}
                    loading="lazy"
                    decoding="async"
                    className={`w-full h-auto rounded-xl ${data.withBorder ? 'border border-border' : ''}`}
                  />
                )}
                {data.caption && (
                  <figcaption className="text-center text-xs text-text-muted mt-3" dangerouslySetInnerHTML={{ __html: sanitizeHtml(data.caption) }} />
                )}
              </figure>
            )
          }

          default:
            console.warn(`Unknown block type: ${block.type}`)
            return null
        }
      })}
    </div>
  )
}
