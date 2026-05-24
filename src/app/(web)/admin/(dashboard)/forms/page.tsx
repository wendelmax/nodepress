import { PostService } from "@/services/post.service"
import Link from "next/link"
import DeletePostButton from "@/components/admin/DeletePostButton"
import { Card } from "@/components/admin/Card"
import { Pagination } from "@/components/admin/Pagination"
import { MessageSquare } from "lucide-react"

export default async function FormsPage({ searchParams }: { searchParams: Promise<{ page?: string }> }) {
  const params = await searchParams
  const page = parseInt(params.page || '1', 10) || 1
  
  // Fetch forms
  const { posts: forms, totalPages } = await PostService.getAdminList('form', 'all', page, 20)

  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-2">
        <div className="flex items-center gap-3">
          <MessageSquare size={24} className="text-primary-light" />
          <h1 className="text-2xl font-bold text-text leading-none">Formulários</h1>
        </div>
        <Link href="/admin/forms/new" className="flex items-center gap-1 bg-primary-gradient text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:shadow-neon transition-all duration-200 no-underline leading-none">
          <span className="text-base leading-none">+</span>
          <span>Criar Formulário</span>
        </Link>
      </div>

      <Card className="p-4 md:p-6 overflow-x-auto w-full">
        <table className="w-full text-left text-sm border-collapse min-w-[500px]">
          <thead>
            <tr className="border-b border-border text-text-secondary text-[11px] uppercase tracking-wider font-bold">
              <th className="pb-4 px-2 font-bold">Título</th>
              <th className="pb-4 px-2 font-bold">Data</th>
            </tr>
          </thead>
          <tbody>
            {forms.map(form => (
              <tr key={form.id} className="border-b border-border/40 last:border-none group/row hover:bg-white/[0.01] transition-all">
                <td className="py-4 px-2">
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/forms/${form.id}/edit`} className="text-text font-semibold hover:text-primary transition-colors text-sm no-underline leading-snug">
                      {form.postTitle || '(sem título)'}
                    </Link>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-xs opacity-0 group-hover/row:opacity-100 transition-opacity duration-200">
                    <Link href={`/admin/forms/${form.id}/edit`} className="text-primary hover:text-primary-light no-underline font-medium transition-colors">
                      Editar
                    </Link>
                    <span className="text-border/50">|</span>
                    <DeletePostButton postId={form.id} force={true} />
                  </div>
                </td>
                <td className="py-4 px-2 text-text-secondary text-xs align-top flex flex-col gap-0.5">
                  <span className="text-text-muted text-[10px]">{new Date(form.postDate).toLocaleDateString('pt-BR')}</span>
                </td>
              </tr>
            ))}
            {forms.length === 0 && (
              <tr>
                <td colSpan={2} className="py-8 text-center text-text-muted text-xs">
                  Nenhum formulário criado ainda.
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
