import React from 'react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import PostFeed from '../components/PostFeed'

export default function Archive({ posts, title, options }: { posts: any[], title?: string, options?: any }) {
  return (
    <div className="min-h-screen bg-background text-text font-sans">
      <Header />
      <main className="max-w-6xl mx-auto py-12 px-6">
        {title && (
          <header className="mb-12 text-center">
            <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight tracking-tight">{title}</h1>
          </header>
        )}
        <PostFeed posts={posts} />
      </main>
      <Footer />
    </div>
  )
}
