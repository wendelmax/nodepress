import prisma from "@/lib/prisma"

export class CommentService {
  /**
   * Retorna os comentários aprovados de um post específico.
   * Usado na página pública do artigo.
   */
  static async getApprovedComments(postId: number) {
    return prisma.comment.findMany({
      where: { 
        commentPostId: postId,
        commentApproved: '1' 
      },
      orderBy: { commentDate: 'asc' },
      include: {
        user: { select: { id: true, displayName: true, userEmail: true } }
      }
    })
  }

  /**
   * Adiciona um novo comentário.
   * Se o usuário estiver logado (userId fornecido), aprova automaticamente.
   * Senão, deixa pendente ('0').
   */
  static async addComment(data: {
    postId: number,
    authorName: string,
    authorEmail: string,
    authorUrl?: string,
    content: string,
    ip?: string,
    userId?: number
  }) {
    const isApproved = data.userId ? '1' : '0'

    const comment = await prisma.comment.create({
      data: {
        commentPostId: data.postId,
        commentAuthor: data.authorName,
        commentAuthorEmail: data.authorEmail,
        commentAuthorUrl: data.authorUrl || '',
        commentContent: data.content,
        commentAuthorIp: data.ip || '',
        commentApproved: isApproved,
        commentAgent: '',
        userId: data.userId || 0
      }
    })

    // Se aprovado diretamente, já atualiza o contador do post
    if (isApproved === '1') {
      await this.updatePostCommentCount(data.postId)
    }

    return comment
  }

  /**
   * Retorna todos os comentários do sistema para o painel de moderação.
   */
  static async getAllComments(page: number = 1, limit: number = 50) {
    const safePage = Math.max(1, page)
    const safeLimit = Math.max(1, Math.min(200, limit))
    const skip = (safePage - 1) * safeLimit

    const [comments, total] = await Promise.all([
      prisma.comment.findMany({
        orderBy: { commentDate: 'desc' },
        include: {
          post: { select: { id: true, postTitle: true, postName: true } }
        },
        skip,
        take: safeLimit
      }),
      prisma.comment.count()
    ])

    return {
      comments,
      total,
      totalPages: Math.ceil(total / safeLimit),
      page: safePage,
      limit: safeLimit
    }
  }

  static async getAllCommentsLegacy(page: number = 1, limit: number = 50) {
    const data = await this.getAllComments(page, limit)
    return data.comments
  }

  /**
   * Atualiza o status de um comentário ('1', '0', 'spam', 'trash').
   */
  static async updateStatus(commentId: number, status: string) {
    const comment = await prisma.comment.update({
      where: { commentId },
      data: { commentApproved: status }
    })

    await this.updatePostCommentCount(comment.commentPostId)
    return comment
  }

  /**
   * Exclui permanentemente um comentário.
   */
  static async deleteComment(commentId: number) {
    const comment = await prisma.comment.delete({
      where: { commentId }
    })

    await this.updatePostCommentCount(comment.commentPostId)
    return comment
  }

  /**
   * Utilitário interno para recalcular a contagem de comentários aprovados em um post.
   */
  private static async updatePostCommentCount(postId: number) {
    const count = await prisma.comment.count({
      where: { commentPostId: postId, commentApproved: '1' }
    })

    await prisma.post.update({
      where: { id: postId },
      data: { commentCount: count }
    })
  }
}
