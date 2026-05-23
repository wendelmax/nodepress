import Link from "next/link"
import Image from "next/image"

interface PostFeedProps {
  posts: any[]
}

export default function PostFeed({ posts }: PostFeedProps) {
  if (posts.length === 0) {
    return <p>No posts found.</p>
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
      {posts.map((post: any) => {
        const thumbnailUrl = post.meta?.find((m: any) => m.metaKey === '_thumbnail_url')?.metaValue
        return (
          <article key={post.id} className="group flex flex-col bg-surface backdrop-blur-md rounded-2xl border border-border shadow-soft hover:shadow-glow hover:-translate-y-1 transition-all duration-300 overflow-hidden">
            {thumbnailUrl && (
              <div className="w-full relative h-48 overflow-hidden">
                <Link href={post.permalink || `/${post.postName}`}>
                  <Image src={thumbnailUrl} alt={post.postTitle} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                </Link>
              </div>
            )}
            <div className="p-6 flex flex-col flex-grow">
              <h2 className="text-xl font-bold text-white mb-2 leading-snug">
                <Link href={post.permalink || `/${post.postName}`} className="hover:text-primary-light transition-colors">
                  {post.postTitle}
                </Link>
              </h2>
              <div className="text-xs font-semibold text-text-muted mb-4 uppercase tracking-wider">
                {new Date(post.postDate).toLocaleDateString()} • {post.author.displayName || post.author.userLogin}
              </div>
              <div 
                className="text-sm text-text-secondary line-clamp-3 leading-relaxed mb-6 flex-grow"
                dangerouslySetInnerHTML={{ __html: post.postExcerpt || post.postContent }}
              />
              <Link href={post.permalink || `/${post.postName}`} className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary-light transition-colors mt-auto">
                Ler mais <span>→</span>
              </Link>
            </div>
          </article>
        )
      })}
    </div>
  )
}
