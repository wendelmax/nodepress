import React from 'react'
import Header from '../components/Header'
import Link from 'next/link'
import Image from 'next/image'
import BlockRenderer from '../components/BlockRenderer'
import { HookService } from '@/services/hook.service'

export default async function SinglePage({ post, options = {} }: { post: any, options?: any }) {
  const thumbnailUrl = post.meta?.find((m: any) => m.metaKey === '_thumbnail_url')?.metaValue

  // Extract Custom Fields
  const fieldGroups = options['acf_field_groups'] ? JSON.parse(options['acf_field_groups']) : []
  const customFieldsToDisplay: { label: string, value: string, type: string }[] = []

  if (post.meta) {
    post.meta.forEach((m: any) => {
      if (m.metaKey.startsWith('_')) return

      let label = m.metaKey
      let type = 'text'

      for (const group of fieldGroups) {
        if (group.postType === post.postType) {
          const fieldDef = group.fields.find((f: any) => f.name === m.metaKey)
          if (fieldDef) {
            label = fieldDef.label
            type = fieldDef.type
            break
          }
        }
      }
      customFieldsToDisplay.push({ label, value: m.metaValue, type })
    })
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f0f1', color: '#2c3338', fontFamily: 'system-ui, sans-serif' }}>
      <Header />

      <main style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }}>
        <article style={{ backgroundColor: 'white', padding: '40px', border: '1px solid #c3c4c7', borderRadius: '3px' }}>
          {thumbnailUrl && (
            <div style={{ marginBottom: '30px' }}>
              <Image src={thumbnailUrl} alt={post.postTitle} width={800} height={450} style={{ width: '100%', height: 'auto', borderRadius: '3px', border: '1px solid #eee' }} />
            </div>
          )}
          <header style={{ marginBottom: '30px' }}>
            <h1 style={{ margin: '0 0 10px 0', fontSize: '36px', lineHeight: '1.2' }}>
              {post.postTitle}
            </h1>
          </header>

          <div style={{ lineHeight: '1.8', fontSize: '18px', color: '#3c434a' }}>
            <BlockRenderer content={await HookService.applyFilters('the_content', post.postContent, post)} />
          </div>

          {customFieldsToDisplay.length > 0 && (
            <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#fcfcfc', border: '1px solid #e2e4e7', borderRadius: '4px' }}>
              <h3 style={{ marginTop: 0, fontSize: '18px', borderBottom: '1px solid #e2e4e7', paddingBottom: '10px' }}>Additional Details</h3>
              <dl style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px', margin: 0, fontSize: '16px' }}>
                {customFieldsToDisplay.map((field, idx) => (
                  <React.Fragment key={idx}>
                    <dt style={{ fontWeight: 600, color: '#2c3338' }}>{field.label}:</dt>
                    <dd style={{ margin: 0, color: '#3c434a' }}>
                      {field.type === 'url' ? (
                        <a href={field.value} target="_blank" rel="noopener noreferrer" style={{ color: '#2271b1', textDecoration: 'none' }}>
                          {field.value}
                        </a>
                      ) : field.type === 'textarea' ? (
                        <span style={{ whiteSpace: 'pre-wrap' }}>{field.value}</span>
                      ) : (
                        field.value
                      )}
                    </dd>
                  </React.Fragment>
                ))}
              </dl>
            </div>
          )}
        </article>
      </main>

      <footer style={{ textAlign: 'center', padding: '40px 20px', color: '#646970', fontSize: '14px' }}>
        <p>&copy; {new Date().getFullYear()}. Built with NodePress.</p>
        <Link href="/admin" style={{ color: '#2271b1', textDecoration: 'none' }}>Site Admin</Link>
      </footer>
    </div>
  )
}
