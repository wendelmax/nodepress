import React from 'react'
import { Render } from '@measured/puck'
import { puckConfig } from '@/lib/puck/config'

interface BlockRendererProps {
  content: string;
}

export default function BlockRenderer({ content }: BlockRendererProps) {
  let isEditorJs = false
  let isPuck = false
  let parsedContent: any = null

  try {
    if (content && content.trim().startsWith('{')) {
      const data = JSON.parse(content)
      if (data && data.blocks && Array.isArray(data.blocks)) {
        isEditorJs = true
        parsedContent = data
      } else if (data && data.root && data.content) {
        isPuck = true
        parsedContent = data
      }
    }
  } catch (e) {
    isEditorJs = false
    isPuck = false
  }

  if (isPuck) {
    return <Render config={puckConfig} data={parsedContent} />
  }

  if (!isEditorJs) {
    // Legacy HTML Fallback
    return (
      <div 
        className="post-content legacy-content prose prose-invert max-w-none"
        dangerouslySetInnerHTML={{ __html: content }} 
      />
    )
  }

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
