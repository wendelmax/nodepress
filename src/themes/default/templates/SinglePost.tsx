import React from 'react'
import Header from '../components/Header'
import CommentSection from '../components/CommentSection'
import Link from 'next/link'
import Image from 'next/image'
import BlockRenderer from '../components/BlockRenderer'
import Footer from '../components/Footer'
import { HookService } from '@/services/hook.service'

export default async function SinglePost({ post, categories = [], tags = [], initialComments = [], options = {} }: { post: any, categories?: any[], tags?: any[], initialComments?: any[], options?: any }) {
  const isPage = post.postType === 'page'
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
    <div className="min-h-screen bg-background text-text font-sans">
      <Header />

      <main className="max-w-4xl mx-auto py-12 px-6">
        <article className="bg-surface backdrop-blur-md rounded-3xl border border-border shadow-soft overflow-hidden">
          {thumbnailUrl && (
            <div className="w-full relative h-[300px] md:h-[450px]">
              <Image src={thumbnailUrl} alt={post.postTitle} fill className="object-cover" />
            </div>
          )}
          <div className="p-8 md:p-12">
            <header className="mb-10 text-center">
              <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight tracking-tight mb-4">
                {post.postTitle}
              </h1>
              {!isPage && (
                <div className="flex items-center justify-center gap-3 text-sm text-text-muted">
                  <span>Publicado em {new Date(post.postDate).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>por <strong className="text-white">{post.author?.displayName || post.author?.userLogin || 'Admin'}</strong></span>
                </div>
              )}
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

            {!isPage && (categories.length > 0 || tags.length > 0) && (
              <footer className="mt-12 pt-8 border-t border-border/40">
                {categories.length > 0 && (
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <strong className="text-sm text-text-secondary">Categorias:</strong>
                    {categories.map((c) => (
                      <Link key={c.id} href={`/category/${c.slug}`} className="px-3 py-1 bg-white/5 border border-border rounded-full text-xs text-text hover:bg-white/10 hover:border-primary/50 transition-colors">
                        {c.name}
                      </Link>
                    ))}
                  </div>
                )}
                {tags.length > 0 && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <strong className="text-sm text-text-secondary">Tags:</strong>
                    {tags.map((t) => (
                      <Link key={t.id} href={`/tag/${t.slug}`} className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-xs text-primary-light hover:bg-primary/20 hover:border-primary/40 transition-colors">
                        #{t.name}
                      </Link>
                    ))}
                  </div>
                )}
              </footer>
            )}

            {!isPage && post.commentStatus === 'open' && (
              <div className="mt-12 pt-8 border-t border-border/40">
                <CommentSection postId={post.id} initialComments={initialComments} />
              </div>
            )}
          </div>
        </article>
        
        <div className="mt-8">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-text-secondary hover:text-white transition-colors">
            <span className="text-primary-light">&larr;</span> Voltar para Home
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  )
}
