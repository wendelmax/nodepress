import { PostService } from "@/services/post.service"
import Link from "next/link"
import DeletePostButton from "@/components/admin/DeletePostButton"
import RestorePostButton from "@/components/admin/RestorePostButton"
import { Card } from "@/components/admin/Card"
import { Pagination } from "@/components/admin/Pagination"

export default async function EditPage({ searchParams }: { searchParams: Promise<{ post_type?: string, post_status?: string, page?: string }> }) {
  const params = await searchParams
  const postType = params.post_type || 'post'
  const postStatus = params.post_status || 'all'
  const page = parseInt(params.page || '1', 10) || 1
  
  const { posts, totalPages } = await PostService.getAdminList(postType, postStatus, page, 20)
  const counts = await PostService.getAdminCounts(postType)

  const isPage = postType === 'page'
  const title = isPage ? 'Páginas' : 'Posts'
  const newLink = isPage ? '/admin/posts/new?type=page' : '/admin/posts/new'
  const baseLink = isPage ? '/admin/pages?' : '/admin/posts?'

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-2">
        <h1 className="text-2xl font-bold text-text leading-none">{title}</h1>
        <Link href={newLink} className="flex items-center gap-1 bg-primary-gradient text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:shadow-neon transition-all duration-200 no-underline leading-none">
          <span className="text-base leading-none">+</span>
          <span>Adicionar Novo</span>
        </Link>
      </div>

      {/* ── Filter Tabs ── */}
      <div className="flex flex-wrap gap-2 text-xs">
        {[
          { label: 'Todos', statusKey: 'all', count: counts.all },
          { label: 'Publicados', statusKey: 'publish', count: counts.publish },
          { label: 'Rascunhos', statusKey: 'draft', count: counts.draft },
          { label: 'Lixeira', statusKey: 'trash', count: counts.trash }
        ].map(tab => {
          const isActive = postStatus === tab.statusKey
          return (
            <Link 
              key={tab.statusKey}
              href={`${baseLink}&post_status=${tab.statusKey}`} 
              className={`px-4 py-2 rounded-xl border no-underline font-semibold transition-all duration-200 ${
                isActive 
                  ? 'bg-primary/10 border-primary/20 text-primary-light shadow-glow' 
                  : 'bg-white/5 border-border text-text-secondary hover:text-white hover:bg-white/10'
              }`}
            >
              {tab.label} <span className={`text-[10px] ml-1 font-medium ${isActive ? 'text-primary-light/80' : 'text-text-muted'}`}>({tab.count})</span>
            </Link>
          )
        })}
      </div>

      {/* ── Table List ── */}
      <Card className="p-4 md:p-6 overflow-x-auto w-full">
        <table className="w-full text-left text-sm border-collapse min-w-[500px]">
          <thead>
            <tr className="border-b border-border text-text-secondary text-[11px] uppercase tracking-wider font-bold">
              <th className="pb-4 px-2 font-bold">Título</th>
              <th className="pb-4 px-2 font-bold">Autor</th>
              <th className="pb-4 px-2 font-bold">Data</th>
            </tr>
          </thead>
          <tbody>
            {posts.map(post => (
              <tr key={post.id} className="border-b border-border/40 last:border-none group/row hover:bg-white/[0.01] transition-all">
                <td className="py-4 px-2">
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/posts/${post.id}/edit`} className="text-text font-semibold hover:text-primary transition-colors text-sm no-underline leading-snug">
                      {post.postTitle || '(sem título)'}
                    </Link>
                    {post.postStatus !== 'publish' && (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase ${
                        post.postStatus === 'draft' ? 'bg-primary/10 text-primary' : 'bg-danger/10 text-danger'
                      }`}>
                        {post.postStatus === 'draft' ? 'Rascunho' : post.postStatus}
                      </span>
                    )}
                  </div>
                  
                  {/* Row Actions (SaaS Hover Style) */}
                  <div className="flex items-center gap-2 mt-1.5 text-xs opacity-0 group-hover/row:opacity-100 transition-opacity duration-200">
                    {post.postStatus === 'trash' ? (
                      <div className="flex items-center gap-2.5">
                        <RestorePostButton postId={post.id} />
                        <span className="text-border/50">|</span>
                        <DeletePostButton postId={post.id} force={true} />
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5">
                        <Link href={`/admin/posts/${post.id}/edit`} className="text-primary hover:text-primary-light no-underline font-medium transition-colors">
                          Editar
                        </Link>
                        <span className="text-border/50">|</span>
                        <DeletePostButton postId={post.id} />
                      </div>
                    )}
                  </div>
                </td>
                <td className="py-4 px-2 text-text-secondary text-xs align-top">
                  <span className="font-semibold text-text hover:text-primary transition-colors cursor-pointer">
                    {post.author.displayName || post.author.userLogin}
                  </span>
                </td>
                <td className="py-4 px-2 text-text-secondary text-xs align-top flex flex-col gap-0.5">
                  <span className="font-medium capitalize text-text-secondary">{post.postStatus === 'publish' ? 'Publicado' : post.postStatus === 'draft' ? 'Rascunho' : post.postStatus}</span>
                  <span className="text-text-muted text-[10px]">{new Date(post.postDate).toLocaleDateString('pt-BR')}</span>
                </td>
              </tr>
            ))}
            {posts.length === 0 && (
              <tr>
                <td colSpan={3} className="py-8 text-center text-text-muted text-xs">
                  Nenhum post encontrado nesta categoria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
      
      <Pagination currentPage={page} totalPages={totalPages} />
    </div>
  )
}
