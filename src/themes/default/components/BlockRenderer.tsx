import React from 'react'
import { Render, type Config, type Data } from '@measured/puck'
import {
  parseBuilderDocument,
  validateBuilderComponents,
} from '@/lib/puck/document'
import { getServerPuckConfig } from '@/lib/puck/server-config'
import type { BuilderContext } from '@/lib/puck/types'
import { resolvePostShowcaseData } from '@/lib/puck/server-showcase-data'

interface BlockRendererProps {
  content: string;
  context?: BuilderContext;
}

function safeBuilderFallback(code: 'invalid-document' | 'unknown-component', reason: string) {
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
    } catch {
      return safeBuilderFallback('invalid-document', 'server renderer failed')
    }

    const resolvedContent = await resolvePostShowcaseData(
      parsed.document as unknown as Parameters<typeof resolvePostShowcaseData>[0],
    )
    return <Render config={config} data={resolvedContent as Data} />
  }

  if (parsed.kind === 'html') {
    // Legacy HTML Fallback
    return (
      <div 
        className="post-content legacy-content prose prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: parsed.content }}
      />
    )
  }

  const parsedContent = parsed.document as { blocks: Array<Record<string, any>> }

  // Render Editor.js JSON Blocks
  return (
    <div className="prose prose-invert prose-blue max-w-none prose-headings:text-text prose-p:text-text-secondary prose-a:text-primary-light prose-strong:text-white prose-blockquote:border-primary prose-blockquote:bg-primary/5 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg prose-img:rounded-xl">
      {parsedContent.blocks.map((block: any, index: number) => {
        const key = block.id || `block-${index}`

        switch (block.type) {
          case 'header':
            const Tag = `h${block.data.level}` as any
            return <Tag key={key} dangerouslySetInnerHTML={{ __html: block.data.text }} />

          case 'paragraph':
            return <p key={key} dangerouslySetInnerHTML={{ __html: block.data.text }} />

          case 'list':
            const ListTag = (block.data.style === 'ordered' ? 'ol' : 'ul') as any
            return (
              <ListTag key={key}>
                {block.data.items.map((item: string, index: number) => (
                  <li key={index} dangerouslySetInnerHTML={{ __html: item }} />
                ))}
              </ListTag>
            )

          case 'quote':
            return (
              <blockquote key={key}>
                <p dangerouslySetInnerHTML={{ __html: block.data.text }} />
                {block.data.caption && <cite dangerouslySetInnerHTML={{ __html: block.data.caption }} />}
              </blockquote>
            )

          case 'code':
            return (
              <pre key={key} className="bg-surface-elevated border border-border rounded-xl p-4 overflow-x-auto text-sm">
                <code dangerouslySetInnerHTML={{ __html: block.data.code }} />
              </pre>
            )


          case 'image':
            return (
              <figure key={key} className={`my-8 ${block.data.withBackground ? 'bg-surface p-6 rounded-2xl border border-border' : ''}`}>
                <img 
                  src={block.data.file.url} 
                  alt={block.data.caption || 'Image'} 
                  className={`w-full h-auto rounded-xl ${block.data.withBorder ? 'border border-border' : ''}`}
                />
                {block.data.caption && (
                  <figcaption className="text-center text-xs text-text-muted mt-3" dangerouslySetInnerHTML={{ __html: block.data.caption }} />
                )}
              </figure>
            )

          default:
            console.warn(`Unknown block type: ${block.type}`)
            return null
        }
      })}
    </div>
  )
}
