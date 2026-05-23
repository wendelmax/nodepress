import React from 'react'

interface BlockRendererProps {
  content: string;
}

export default function BlockRenderer({ content }: BlockRendererProps) {
  let isJson = false
  let parsedContent: any = null

  try {
    if (content && content.trim().startsWith('{')) {
      const data = JSON.parse(content)
      if (data && data.blocks && Array.isArray(data.blocks)) {
        isJson = true
        parsedContent = data
      }
    }
  } catch (e) {
    isJson = false
  }

  if (!isJson) {
    // Legacy HTML Fallback
    return (
      <div 
        className="post-content legacy-content"
        dangerouslySetInnerHTML={{ __html: content }} 
      />
    )
  }

  // Render Editor.js JSON Blocks
  return (
    <div className="post-content block-content">
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

          case 'image':
            return (
              <figure key={key} style={{ margin: '20px 0' }}>
                <img 
                  src={block.data.file.url} 
                  alt={block.data.caption || 'Image'} 
                  style={{ 
                    maxWidth: '100%', 
                    height: 'auto', 
                    borderRadius: '4px',
                    border: block.data.withBorder ? '1px solid #ccc' : 'none',
                    backgroundColor: block.data.withBackground ? '#f0f0f1' : 'transparent',
                    padding: block.data.withBackground ? '20px' : '0'
                  }} 
                />
                {block.data.caption && (
                  <figcaption style={{ textAlign: 'center', fontSize: '14px', color: '#646970', marginTop: '10px' }} dangerouslySetInnerHTML={{ __html: block.data.caption }} />
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
