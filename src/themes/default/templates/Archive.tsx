import React from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import PostFeed from '../components/PostFeed'
import Link from 'next/link'
import Image from 'next/image'

export default function Archive({ posts, title, options }: { posts: any[], title?: string, options?: any }) {
  const isHomePage = !title
  const hasPosts = posts && posts.length > 0
  
  // Se for a home page e tiver posts, o primeiro post ganha destaque (Hero)
  const featuredPost = isHomePage && hasPosts ? posts[0] : null
  const feedPosts = featuredPost ? posts.slice(1) : posts

  return (
    <div className="min-h-screen bg-background text-text font-sans">
      <Header />
      
      <main className="max-w-6xl mx-auto py-12 px-6">
        {title && (
          <header className="mb-12 text-center py-12 border-b border-border/40 relative overflow-hidden">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-primary/5 blur-3xl rounded-full z-0 pointer-events-none"></div>
            <div className="relative z-10">
              <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight tracking-tight mb-4">{title}</h1>
              <p className="text-text-secondary text-lg max-w-2xl mx-auto">Explorando as últimas atualizações, tutoriais e artigos sobre este tópico.</p>
            </div>
          </header>
        )}

        {featuredPost && (
          <section className="mb-16">
            <Link href={featuredPost.permalink || `/${featuredPost.postName}`} className="group block relative rounded-3xl overflow-hidden border border-border bg-surface hover:border-primary/50 transition-all duration-500 shadow-soft hover:shadow-glow min-h-[400px] md:min-h-[500px] flex items-end">
              {featuredPost.meta?.find((m: any) => m.metaKey === '_thumbnail_url')?.metaValue ? (
                <>
                  <Image 
                    src={featuredPost.meta.find((m: any) => m.metaKey === '_thumbnail_url').metaValue} 
                    alt={featuredPost.postTitle} 
                    fill 
                    className="object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent"></div>
                </>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent-purple/20"></div>
              )}
              
              <div className="relative z-10 p-8 md:p-12 w-full md:w-2/3">
                <div className="inline-block px-3 py-1 bg-primary text-white text-xs font-bold rounded-full mb-4 uppercase tracking-wider">
                  Destaque
                </div>
                <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-4 leading-tight group-hover:text-primary-light transition-colors">
                  {featuredPost.postTitle}
                </h2>
                <div className="flex items-center gap-3 text-sm text-text-secondary mb-4">
                  <span className="font-semibold text-white">{featuredPost.author.displayName || featuredPost.author.userLogin}</span>
                  <span>•</span>
                  <span>{new Date(featuredPost.postDate).toLocaleDateString()}</span>
                </div>
                <div 
                  className="text-base text-text-secondary line-clamp-2 leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: featuredPost.postExcerpt || featuredPost.postContent }}
                />
              </div>
            </Link>
          </section>
        )}

        {feedPosts.length > 0 ? (
          <>
            <PostFeed posts={feedPosts} />
            
            {/* Mock Pagination */}
            <div className="mt-16 flex items-center justify-center gap-2">
              <button className="w-10 h-10 rounded-xl flex items-center justify-center border border-border text-text-muted hover:text-white hover:border-primary transition-colors disabled:opacity-50" disabled>
                &larr;
              </button>
              <button className="w-10 h-10 rounded-xl flex items-center justify-center bg-primary text-white font-bold shadow-glow">
                1
              </button>
              <button className="w-10 h-10 rounded-xl flex items-center justify-center border border-border text-text hover:text-white hover:border-primary transition-colors">
                2
              </button>
              <button className="w-10 h-10 rounded-xl flex items-center justify-center border border-border text-text hover:text-white hover:border-primary transition-colors">
                3
              </button>
              <span className="text-text-muted px-2">...</span>
              <button className="w-10 h-10 rounded-xl flex items-center justify-center border border-border text-text hover:text-white hover:border-primary transition-colors">
                &rarr;
              </button>
            </div>
          </>
        ) : (
          !featuredPost && <p className="text-center text-text-muted py-12">Nenhum post encontrado.</p>
        )}
      </main>

      <Footer />
    </div>
  )
}
