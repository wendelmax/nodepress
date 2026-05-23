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
    <>
      {posts.map((post: any) => {
        const thumbnailUrl = post.meta?.find((m: any) => m.metaKey === '_thumbnail_url')?.metaValue
        return (
          <article key={post.id} style={{ backgroundColor: 'white', padding: '30px', marginBottom: '30px', border: '1px solid #c3c4c7', borderRadius: '3px' }}>
            {thumbnailUrl && (
              <div style={{ marginBottom: '20px' }}>
                <Link href={post.permalink || `/${post.postName}`}>
                  <Image src={thumbnailUrl} alt={post.postTitle} width={800} height={450} style={{ width: '100%', height: 'auto', borderRadius: '3px', border: '1px solid #eee' }} />
                </Link>
              </div>
            )}
            <h2 style={{ margin: '0 0 10px 0', fontSize: '28px' }}>
              <Link href={post.permalink || `/${post.postName}`} style={{ color: '#2271b1', textDecoration: 'none' }}>
                {post.postTitle}
              </Link>
            </h2>
            <div style={{ fontSize: '13px', color: '#646970', marginBottom: '20px' }}>
              Published on {post.postDate.toLocaleDateString()} by {post.author.displayName || post.author.userLogin}
            </div>
            <div 
              style={{ lineHeight: '1.6', fontSize: '16px' }}
              className="post-content"
              dangerouslySetInnerHTML={{ __html: post.postExcerpt || post.postContent }}
            />
          </article>
        )
      })}
    </>
  )
}
