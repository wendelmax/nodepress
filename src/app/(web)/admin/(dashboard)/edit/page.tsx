import { PostService } from "@/services/post.service"
import Link from "next/link"
import DeletePostButton from "@/components/admin/DeletePostButton"
import RestorePostButton from "@/components/admin/RestorePostButton"

export default async function EditPage({ searchParams }: { searchParams: Promise<{ post_type?: string, post_status?: string }> }) {
  const params = await searchParams
  const postType = params.post_type || 'post'
  const postStatus = params.post_status || 'all'
  
  const posts = await PostService.getAdminList(postType, postStatus)
  const counts = await PostService.getAdminCounts(postType)

  const isPage = postType === 'page'
  const title = isPage ? 'Pages' : 'Posts'
  const newLink = isPage ? '/admin/post-new?post_type=page' : '/admin/post-new'
  const baseLink = isPage ? '/admin/edit?post_type=page' : '/admin/edit?'

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '10px' }}>
        <h1 style={{ fontSize: '23px', fontWeight: 400, margin: 0, padding: '9px 15px 4px 0' }}>{title}</h1>
        <Link href={newLink} style={{ border: '1px solid #2271b1', color: '#2271b1', padding: '4px 8px', textDecoration: 'none', borderRadius: '3px', fontSize: '13px', backgroundColor: '#f6f7f7' }}>
          Add New
        </Link>
      </div>

      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 15px 0', display: 'flex', gap: '15px', fontSize: '13px', color: '#646970' }}>
        <li>
          <Link href={`${baseLink}&post_status=all`} style={{ textDecoration: 'none', color: postStatus === 'all' ? '#000' : '#2271b1', fontWeight: postStatus === 'all' ? 600 : 400 }}>
            All <span style={{ color: '#646970', fontWeight: 400 }}>({counts.all})</span>
          </Link>
        </li>
        <li>|</li>
        <li>
          <Link href={`${baseLink}&post_status=publish`} style={{ textDecoration: 'none', color: postStatus === 'publish' ? '#000' : '#2271b1', fontWeight: postStatus === 'publish' ? 600 : 400 }}>
            Published <span style={{ color: '#646970', fontWeight: 400 }}>({counts.publish})</span>
          </Link>
        </li>
        <li>|</li>
        <li>
          <Link href={`${baseLink}&post_status=draft`} style={{ textDecoration: 'none', color: postStatus === 'draft' ? '#000' : '#2271b1', fontWeight: postStatus === 'draft' ? 600 : 400 }}>
            Draft <span style={{ color: '#646970', fontWeight: 400 }}>({counts.draft})</span>
          </Link>
        </li>
        <li>|</li>
        <li>
          <Link href={`${baseLink}&post_status=trash`} style={{ textDecoration: 'none', color: postStatus === 'trash' ? '#000' : '#2271b1', fontWeight: postStatus === 'trash' ? 600 : 400 }}>
            Trash <span style={{ color: '#646970', fontWeight: 400 }}>({counts.trash})</span>
          </Link>
        </li>
      </ul>

      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', border: '1px solid #c3c4c7', boxShadow: '0 1px 1px rgba(0,0,0,.04)' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #c3c4c7', textAlign: 'left' }}>
            <th style={{ padding: '8px 10px', fontSize: '14px', fontWeight: 400, color: '#2c3338' }}>Title</th>
            <th style={{ padding: '8px 10px', fontSize: '14px', fontWeight: 400, color: '#2c3338' }}>Author</th>
            <th style={{ padding: '8px 10px', fontSize: '14px', fontWeight: 400, color: '#2c3338' }}>Date</th>
          </tr>
        </thead>
        <tbody>
          {posts.map(post => (
            <tr key={post.id} style={{ borderBottom: '1px solid #c3c4c7', position: 'relative' }}>
              <td style={{ padding: '10px' }}>
                <div style={{ color: '#2271b1', fontWeight: 600, fontSize: '14px' }}>
                  <Link href={`/admin/post?post=${post.id}&action=edit`} style={{ textDecoration: 'none', color: '#2271b1' }}>
                    {post.postTitle}
                  </Link>
                  {post.postStatus !== 'publish' && <span style={{ color: '#646970', fontWeight: 'normal' }}> — {post.postStatus}</span>}
                </div>
                
                {/* Row Actions (Classic WP Style) */}
                <div style={{ fontSize: '13px', marginTop: '4px', visibility: 'visible' }}>
                  {post.postStatus === 'trash' ? (
                    <>
                      <RestorePostButton postId={post.id} />
                      <span style={{ color: '#ddd', margin: '0 4px' }}>|</span>
                      <DeletePostButton postId={post.id} force={true} />
                    </>
                  ) : (
                    <>
                      <Link href={`/admin/post?post=${post.id}&action=edit`} style={{ textDecoration: 'none', color: '#2271b1' }}>Edit</Link>
                      <span style={{ color: '#ddd', margin: '0 4px' }}>|</span>
                      <DeletePostButton postId={post.id} />
                    </>
                  )}
                </div>
              </td>
              <td style={{ padding: '10px', color: '#2c3338', fontSize: '13px', verticalAlign: 'top' }}>
                <a href={`/admin/edit?author=${post.author.id}`} style={{ textDecoration: 'none', color: '#2271b1' }}>
                  {post.author.displayName || post.author.userLogin}
                </a>
              </td>
              <td style={{ padding: '10px', color: '#2c3338', fontSize: '13px', verticalAlign: 'top' }}>
                {post.postStatus}<br />
                <span style={{ color: '#646970' }}>{post.postDate.toLocaleDateString()}</span>
              </td>
            </tr>
          ))}
          {posts.length === 0 && (
            <tr>
              <td colSpan={3} style={{ padding: '10px', color: '#646970' }}>No posts found.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

