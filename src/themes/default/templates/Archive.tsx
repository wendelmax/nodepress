import React from 'react'
import Header from '../components/Header'
import PostFeed from '../components/PostFeed'
import Link from 'next/link'

export default function Archive({ posts, title, options }: { posts: any[], title?: string, options?: any }) {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f0f0f1', color: '#2c3338', fontFamily: 'system-ui, sans-serif' }}>
      <Header />
      <main style={{ maxWidth: '800px', margin: '40px auto', padding: '0 20px' }}>
        {title && (
          <header style={{ marginBottom: '30px' }}>
            <h1 style={{ margin: '0', fontSize: '36px', lineHeight: '1.2' }}>{title}</h1>
          </header>
        )}
        <PostFeed posts={posts} />
      </main>
      <footer style={{ textAlign: 'center', padding: '20px', color: '#646970', fontSize: '14px', marginTop: '40px' }}>
        <p>&copy; {new Date().getFullYear()}. Built with NodePress.</p>
        <Link href="/admin" style={{ color: '#2271b1', textDecoration: 'none' }}>Site Admin</Link>
      </footer>
    </div>
  )
}
