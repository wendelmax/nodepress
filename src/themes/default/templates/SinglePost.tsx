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
        
        {/* Breadcrumbs */}
        <nav className="mb-8 flex items-center gap-2 text-sm text-text-muted">
          <Link href="/" className="hover:text-primary transition-colors">Home</Link>
          <span>/</span>
          {!isPage && categories.length > 0 && (
            <>
              <Link href={`/category/${categories[0].slug}`} className="hover:text-primary transition-colors">
                {categories[0].name}
              </Link>
              <span>/</span>
            </>
          )}
          <span className="text-text-secondary truncate">{post.postTitle}</span>
        </nav>

        <article className="bg-surface backdrop-blur-md rounded-3xl border border-border shadow-soft overflow-hidden">
          {thumbnailUrl && (
            <div className="w-full relative h-[300px] md:h-[500px]">
              <Image src={thumbnailUrl} alt={post.postTitle} fill className="object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-transparent"></div>
            </div>
          )}
          <div className="p-8 md:p-12 relative z-10 -mt-10">
            <header className="mb-10 text-center">
              {categories.length > 0 && !isPage && (
                <div className="mb-4">
                  <span className="inline-block px-3 py-1 bg-primary/20 text-primary-light text-xs font-bold rounded-full uppercase tracking-wider">
                    {categories[0].name}
                  </span>
                </div>
              )}
              <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight tracking-tight mb-6">
                {post.postTitle}
              </h1>
              {!isPage && (
                <div className="flex flex-wrap items-center justify-center gap-4 text-sm text-text-muted">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-surface-elevated border border-border flex items-center justify-center text-primary font-bold">
                      {(post.author?.displayName || post.author?.userLogin || 'A')[0].toUpperCase()}
                    </div>
                    <span><strong className="text-white">{post.author?.displayName || post.author?.userLogin || 'Admin'}</strong></span>
                  </div>
                  <span>•</span>
                  <span>{new Date(post.postDate).toLocaleDateString()}</span>
                  <span>•</span>
                  <span>5 min de leitura</span>
                </div>
              )}
            </header>

            <div className="text-text-secondary leading-relaxed text-lg">
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

            {!isPage && (
              <footer className="mt-16 pt-8 border-t border-border/40">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
                  {/* Tags */}
                  {tags.length > 0 ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      {tags.map((t) => (
                        <Link key={t.id} href={`/tag/${t.slug}`} className="px-3 py-1.5 bg-surface border border-border rounded-lg text-xs text-text-secondary hover:bg-white/10 hover:text-white transition-colors">
                          #{t.name}
                        </Link>
                      ))}
                    </div>
                  ) : <div></div>}

                  {/* Share Buttons */}
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-text-muted mr-2">Compartilhar:</span>
                    <button className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center text-text hover:text-primary hover:border-primary transition-colors" aria-label="Compartilhar no Twitter">
                      <svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg>
                    </button>
                    <button className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center text-text hover:text-primary hover:border-primary transition-colors" aria-label="Compartilhar no Facebook">
                      <svg fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
                    </button>
                  </div>
                </div>

                {/* Author Bio Box */}
                <div className="bg-surface-elevated p-6 md:p-8 rounded-2xl border border-border flex flex-col md:flex-row items-center md:items-start gap-6 text-center md:text-left">
                  <div className="w-20 h-20 shrink-0 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-2xl border-2 border-primary/50 shadow-glow">
                    {(post.author?.displayName || post.author?.userLogin || 'A')[0].toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-xl font-bold text-white mb-2">{post.author?.displayName || post.author?.userLogin || 'Admin'}</h4>
                    <p className="text-sm text-text-muted mb-4">
                      Autor principal no NodePress. Escreve sobre tecnologia, desenvolvimento web e o futuro das plataformas SaaS.
                    </p>
                    <Link href={`/author/${post.author?.userLogin}`} className="text-sm font-semibold text-primary hover:text-primary-light transition-colors">
                      Ver todos os artigos &rarr;
                    </Link>
                  </div>
                </div>

              </footer>
            )}

            {!isPage && post.commentStatus === 'open' && (
              <div className="mt-12 pt-8 border-t border-border/40">
                <CommentSection postId={post.id} initialComments={initialComments} />
              </div>
            )}
          </div>
        </article>
        
        <div className="mt-12 flex justify-between items-center">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-text-secondary hover:text-white transition-colors">
            <span className="text-primary-light">&larr;</span> Voltar para Home
          </Link>
          
          {/* Mock Next Post */}
          {!isPage && (
            <div className="text-right hidden sm:block">
              <span className="block text-xs text-text-muted mb-1 uppercase tracking-wider">Próximo Artigo</span>
              <Link href="#" className="text-sm font-semibold text-text hover:text-primary transition-colors">
                Como Otimizar Next.js &rarr;
              </Link>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
