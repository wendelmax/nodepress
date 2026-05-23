import React from 'react'
import Header from '../components/Header'
import Link from 'next/link'
import Image from 'next/image'
import BlockRenderer from '../components/BlockRenderer'
import Footer from '../components/Footer'
import { HookService } from '@/services/hook.service'

export default async function SinglePage({ post, options = {} }: { post: any, options?: any }) {
  const thumbnailUrl = post.meta?.find((m: any) => m.metaKey === '_thumbnail_url')?.metaValue
  const template = post.meta?.find((m: any) => m.metaKey === '_np_template')?.metaValue || 'default'

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
    <div className="min-h-screen bg-background text-text font-sans">
      {template !== 'landing' && <Header />}

      <main className={`${template === 'full-width' ? 'w-full' : 'max-w-4xl'} mx-auto py-12 px-6`}>
        <article className="bg-surface backdrop-blur-md rounded-3xl border border-border shadow-soft overflow-hidden">
          {thumbnailUrl && (
            <div className="w-full relative h-[300px] md:h-[450px]">
              <Image src={thumbnailUrl} alt={post.postTitle} fill className="object-cover" />
            </div>
          )}
          <div className="p-8 md:p-12">
            <header className="mb-10 text-center">
              <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight tracking-tight">
                {post.postTitle}
              </h1>
            </header>

            <div className="text-text-secondary leading-relaxed">
              <BlockRenderer content={await HookService.applyFilters('the_content', post.postContent, post)} />
            </div>

            {customFieldsToDisplay.length > 0 && (
              <div className="mt-12 p-6 bg-white/5 border border-border rounded-2xl">
                <h3 className="text-lg font-semibold text-text mb-4 pb-4 border-b border-border/40">Detalhes Adicionais</h3>
                <dl className="grid grid-cols-1 md:grid-cols-3 gap-y-4 gap-x-6 text-sm">
                  {customFieldsToDisplay.map((field, idx) => (
                    <React.Fragment key={idx}>
                      <dt className="font-semibold text-text-secondary md:col-span-1">{field.label}</dt>
                      <dd className="text-text md:col-span-2">
                        {field.type === 'url' ? (
                          <a href={field.value} target="_blank" rel="noopener noreferrer" className="text-primary-light hover:text-white transition-colors">
                            {field.value}
                          </a>
                        ) : field.type === 'textarea' ? (
                          <span className="whitespace-pre-wrap">{field.value}</span>
                        ) : (
                          field.value
                        )}
                      </dd>
                    </React.Fragment>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </article>
      </main>

      {template !== 'landing' && <Footer />}
    </div>
  )
}
